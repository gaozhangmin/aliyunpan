'use strict'

import net from 'node:net'
import util from '../util'
import { spawn } from 'node:child_process'

const startStop = {
  // Starts the MPV player process
  //
  // After MPV is started the function listens to the spawned MPV child proecesses'
  // stdout for see whether it could create and bind the IPC socket or not.
  // If possible an ipcInterface is created to handle the socket communication
  //
  // Observes the properties defined in the observed object
  // Sets up the event handlers
  //
  // mpv_args
  // 	arguments that are passed to mpv on start up
  //
  // @return
  // Promise that is resolved when everything went fine or rejected when an
  // error occured
  //
  start: async function(mpv_args = []) {
    // check if mpv is already running

    if (this.running) {
      throw this.errorHandler.errorMessage(6, 'start()')
    }

    // =========================================================
    // CHECKING IF THERE IS A MPV INSTANCE RUNNING ON THE SOCKET
    // =========================================================

    // see if there's already an mpv instance running on the specified socket
    const instance_running = await new Promise((resolve, reject) => {
      const sock = new net.Socket()
      sock.connect({ path: this.options.socket }, () => {
        // if this part of the code is reached there is a socket available, but it's not
        // necessarily one of mpv
        // send any message to see if there's a MPV instance responding
        sock.write(JSON.stringify({
          'command': ['get_property', 'mpv-version']
        }) + '\n')
      }).on('data', (data) => {
        try {
          const res = JSON.parse(data)
          // if this worked, it's save to say that it's an MPV instance
          if ('data' in res && 'error' in res && res.error === 'success') {
            reject(this.errorHandler.errorMessage(6, 'start()'))
          } else {
            resolve(false)
          }
        }
        // if any error occurred parsing the JSON response, whatever that socket server is, it's not belonging
        // to any MPV instance
        catch (err) {
          resolve(false)
        }
      })
      // if any error occurs, there's no mpv instance already running on that socket,
      // in fact there's no socket server available at all
      .on('error', (err) => {
        resolve(false)
      })
    })

    // these steps are only necessary if a new MPV instance is created, if the module is hooking into an existing
    // one, there's no need to start a new instance
    if (!instance_running) {
      // =========================
      // STARTING NEW MPV INSTANCE
      // =========================
      // check for the corrrect ipc command
      const ipcCommand = await util.findIPCCommand(this.options)
      // check if mpv could be started succesffuly
      await new Promise((resolve, reject) => {
        // add the ipcCommand to the arguments
        this.mpv_arguments.push(ipcCommand + '=' + this.options.socket)
        // spawns the mpv player
        this.mpvPlayer = spawn(this.options.binary, this.mpv_arguments.concat(mpv_args), this.options.spawnOptions)
        // callback to listen to stdout + stderr to see, if MPV could bind the IPC socket
        const stdCallback = (data) => {
          // stdout/stderr output
          const output = data.toString()
          // "Listening to IPC socket" - message
          if (output.match(/Listening to IPC (socket|pipe)/)) {
            // remove the event listener on stdout
            this.mpvPlayer.stderr.removeAllListeners('data')
            this.mpvPlayer.stdout.removeAllListeners('data')
            resolve()
          }
          // "Could not bind IPC Socket" - message
          else if (output.match(/Could not bind IPC (socket|pipe)/)) {
            // remove the event listener on stdout
            this.mpvPlayer.stderr.removeAllListeners('data')
            this.mpvPlayer.stdout.removeAllListeners('data')
            reject(this.errorHandler.errorMessage(4, 'startStop()', [this.options.socket]))
          }
        }
        // listen to stdout to check if the IPC socket is ready
        this.mpvPlayer.stdout.on('data', stdCallback)
        // in some cases on windows, if you pipe your output to a file or another command, the messages that
        // are usually output via stdout are output via stderr instead. That's why it's required to listen
        // for the same messages on stderr as well
        this.mpvPlayer.stderr.on('data', stdCallback)
      })

      // these steps are only necessary if a new MPV instance is created, if the module is hooking into an existing
      // one, there's no need to start a new instance
      if (!instance_running) {
        // check if mpv went into idle mode and is ready to receive commands
        await new Promise((resolve, reject) => {
          // Set up the socket connection
          this.socket.connect(this.options.socket)
          // socket to check for the idle event to check if mpv fully loaded and
          // actually running
          const observeSocket = new net.Socket()
          observeSocket.connect({ path: this.options.socket }, () => {
            // send any message to see if there's a MPV instance responding
            observeSocket.write(JSON.stringify({
              'command': ['get_property', 'idle-active']
            }) + '\n')
            if (this.options.debug || this.options.verbose) console.log('[Node-MPV] sending stimulus')
          }).on('data', (data) => {
            // parse the messages from the socket
            const messages = data.toString('utf-8').split('\n')
            // check every message
            messages.forEach((message) => {
              // ignore empty messages
              if (message.length > 0) {
                message = JSON.parse(message)
                // check for the relevant events to see, if mpv has finished loading
                // idle, idle-active (different between mpv versions)
                //     usually if no special options were added and mpv will go into idle state
                // file-loaded
                //     for the rare case that somebody would pass files as input via the command line
                //     through the constructor. In that case mpv never goes into idle mode
                if ('event' in message && ['idle', 'idle-active', 'file-loaded'].includes(message.event)) {
                  if (this.options.debug || this.options.verbose) console.log('[Node-MPV] idling')
                  observeSocket.destroy()
                  resolve()
                }
                // check our stimulus response
                // Check for our stimulus with idle-active
                if ('data' in message && 'error' in message && message.error === 'success') {
                  if (this.options.debug || this.options.verbose) console.log('[Node-MPV] stimulus received', message.data)
                  observeSocket.destroy()
                  resolve()
                }
              }
            })
          })
        })
      }
        // if the module is hooking into an existing instance of MPV, we still ned to set up the
      // socket connection for the module
      else {
        this.socket.connect(this.options.socket)
        if (this.options.debug || this.options.verbose) {
          console.log(`[Node-MPV]: Detected running MPV instance at ${this.options.socket}`)
          console.log('[Node-MPV]: Hooked into existing MPV instance without starting a new one')
        }
      }

      // ============================================
      // SETTING UP THE PROPERTIES AND EVENT LISTENER
      // ============================================

      // set up the observed properties

      // sets the Interval to emit the current time position
      this.observeProperty('time-pos', 0)
      this.timepositionListenerId = setInterval(async () => {
        const paused = await this.isPaused().catch(err => {
          if (this.options.debug) console.log('[Node-MPV] timeposition listener cannot retrieve isPaused', err)
          if (err.code === 8) { // mpv is not running but the interval was not cleaned out
            clearInterval(this.timepositionListenerId)
            return true
          } else throw err // This error is not catcheable, maybe provide a function in options to catch these
        })
        // only emit the time position if there is a file playing and it's not paused
        if (!paused && this.currentTimePos != null) {
          this.emit('timeposition', this.currentTimePos)
        }
      }, this.options.time_update * 1000)

      // Observe all the properties defined in the observed JSON object
      let observePromises = []
      util.observedProperties(this.options.audio_only)
        .forEach((property) => {
          observePromises.push(this.observeProperty(property))
        })

      // wait for all observe commands to finish
      await Promise.all(observePromises)

      // ### Events ###

      // events linked to the mpv instance can only be set up, if mpv was started by node js iself
      // it's not possible for an mpv instance started from a different process
      if (!instance_running) {
        // Close Event. Restarts MPV
        this.mpvPlayer.on('close', (error_code) => this.closeHandler(error_code))

        // Output any errors thrown by MPV
        this.mpvPlayer.on('error', (error) => this.errorHandler(error))
      }
        // if the module is hooking into an existing and running istance of mpv we need an event listener
      // that is attached directly to the net socket, to clear the interval for the time position
      else {
        this.socket.socket.on('close', () => {
          clearInterval(this.timepositionListenerId)
          // it's kind of impossible to tell if an external instance was properly quit or has crashed
          // that's why both events are emitted
          this.emit('crashed')
          this.emit('quit')
        })
      }

      // Handle the JSON messages received from MPV via the ipcInterface
      this.socket.on('message', (message) => this.messageHandler(message))


      // set the running flag
      this.running = true
    }
  },
  // Quits the MPV player
  //
  // All event handlers are unbound (thus preventing the close event from
  // restarting MPV
  // The socket is destroyed
  quit: async function() {
    // Clear all the listeners of this module
    try {
      this.mpvPlayer.removeAllListeners('close')
      this.mpvPlayer.removeAllListeners('error')
      this.mpvPlayer.removeAllListeners('message')
    } catch (e) {

    }
    clearInterval(this.timepositionListenerId)
    // send the quit message to MPV
    await this.command('quit')
    // Quit the socket
    this.socket.quit()
    // unset the running flag
    this.running = false
  }
}

export default startStop

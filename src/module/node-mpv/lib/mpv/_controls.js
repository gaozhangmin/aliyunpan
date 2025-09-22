'use strict'

import net from 'node:net'

const controls = {
  // toggles pause
  togglePause: function() {
    return this.cycleProperty('pause')
  },
  // pause
  pause: function() {
    return this.setProperty('pause', true)
  },
  // resume
  resume: function() {
    return this.setProperty('pause', false)
  },
  // play
  play: async function() {
    const idle = await this.getProperty('idle-active')
    const playlist_size = await this.getPlaylistSize()
    // if mpv is idle but has a playlist, set playlist-pos to 0,
    // which starts the playback
    if (idle && playlist_size > 0) {
      return new Promise(async (resolve, reject) => {
        // get the filename of the first item in the playlist for error handling purposes
        const fname = await this.getProperty('playlist/0/filename')

        let started = false
        // socket to observe if the file is being played back
        const observeSocket = new net.Socket()
        observeSocket.connect({ path: this.options.socket }, async () => {
          // this starts the playback when mpv is idle but songs are queued in the playlist
          await this.setProperty('playlist-pos', 0)
        }).on('data', (data) => {
          // parse the messages from the socket
          const messages = data.toString('utf-8').split('\n')
          // check every message
          messages.forEach((message) => {
            // ignore empty messages
            if (message.length > 0) {
              message = JSON.parse(message)
              // look for the file-loaded event to see if the file was loaded and is played
              if ('event' in message) {
                if (message.event === 'start-file') {
                  started = true
                }
                // when the file has successfully been loaded resolve the promise
                else if (message.event === 'file-loaded' && started) {
                  observeSocket.destroy()
                  // resolve the promise
                  return resolve()
                }
                // when the track has changed we don't need a seek event
                else if (message.event === 'end-file' && started) {
                  observeSocket.destroy()
                  return reject(this.errorHandler.errorMessage(0, 'play()', [fname]))
                }
              }
            }
          })
        })
      })
    }
    // if mpv is not idle and has files queued just set the pause state to false
    else {
      return this.setProperty('pause', false)
    }
  },
  // stop
  stop: function() {
    return this.command('stop', [])
  },
  // quit
  quit: function() {
    // unbind the event listeners
    try {
      this.socket.removeAllListeners('close')
      this.socket.removeAllListeners('error')
      this.socket.removeAllListeners('message')
    } catch (e) {

    }
    clearInterval(this.timepositionListenerId)
    // send the quit command to mpv
    this.socket.command('quit')
    // quit the socket connection
    this.socket.quit()
  },
  // volume control values 0-100
  volume: function(value) {
    return this.setProperty('volume', value)
  },
  adjustVolume: function(value) {
    return this.addProperty('volume', value)
  },
  // mute
  // bool set
  // 	true mutes
  // 	false unmutes
  // 	Not setting set toggles the mute state
  mute: function(set) {
    return set != null ? this.setProperty('mute', set) : this.cycleProperty('mute')
  },
  //  relative search
  seek: async function(seconds, mode = 'relative') {
    // reject the promise if the mode is not correct
    if (!['relative', 'absolute', 'append-play'].includes(mode)) {
      throw (this.errorHandler.errorMessage(1, 'seek()', mode, null, {
        'relative': 'Searches x seconds from the current position',
        'absolute': 'Goes to position x seconds of the current track'
      }))
    }
    // perform a seek operation
    return new Promise((resolve, reject) => {
      // tracks if the seek event has been emitted
      let seek_event_started = false
      const observeSocket = new net.Socket()
      observeSocket.connect({ path: this.options.socket }, async () => {
        try {
          await this.command('seek', [seconds, mode, 'exact'])
        } catch (err) {
          reject(err)
        }
      }).on('data', (data) => {
        // parse the messages from the socket
        const messages = data.toString('utf-8').split('\n')
        // check every message
        messages.forEach((message) => {
          // ignore empty messages
          if (message.length > 0) {
            message = JSON.parse(message)
            if ('event' in message) {
              // if the seek event was found set the flag variable to true
              if (message.event === 'seek') seek_event_started = true
              // resolve the promise if the playback-restart event was fired
              else if (seek_event_started && message.event === 'playback-restart') {
                observeSocket.destroy()
                resolve()
              }
            }
          }
        })
      })
    })
  },
  // go to position of the song
  goToPosition: async function(seconds) {
    return this.seek(seconds, 'absolute')
  },
  // loop
  // int/string times
  // 	number n - loop n times
  // 	'inf' 	 - loop infinitely often
  // 	'no'	 - switch loop to off
  //
  // if times is not set, this method will toggle the loop state, if any looping is set, either 'inf' or a fixed number it will be switched off
  loop: async function(times) {
    // if times was set, use it. Times can be any number > 0, 'inf' and 'no'
    if (times != null) {
      return this.setProperty('loop', times)
    }
    // if times was not set, net loop toggle the mute property
    else {
      // get the loop status
      // if any loop status was set, either 'inf' or a fixed number, switch loop to off
      // if no loop status was set, switch it on to 'inf'
      const loop_status = await this.getProperty('loop')
      return !loop_status ? this.setProperty('loop', 'inf') : this.setProperty('loop', 'no')
    }
  }
}

export default controls

'use strict'

import { EventEmitter } from 'node:events'
import net from 'node:net'
import path from 'node:path'

import ErrorHandler from '../error'
import commandModule from './_commands'
import controlModule from './_controls'
import eventModule from './_events'
import informationModule from './_information'
import playlistModule from './_playlist'
import audioModule from './_audio'
import videoModule from './_video'
import subtitleModule from './_subtitle'
import startStopModule from './_startStop'
import util from '../util'
import ipcInterface from '../ipcInterface/ipcInterface'
import _ from 'lodash'

class NodeMpv extends EventEmitter {

  constructor(options, mpv_args) {
    super()
    // merge the user input options with the default options
    this.options = util.mergeDefaultOptions(options)

    // get the arguments to start mpv with
    this.mpv_arguments = util.mpvArguments(this.options, mpv_args)

    // saves the IDs of observedProperties with their propertyname
    // key:   property
    // value: id
    this.observedProperties = {}

    // timeposition of the current song
    this.currentTimePos = null

    // states whether mpv is running or not
    this.running = false

    // error handler
    this.errorHandler = new ErrorHandler()

    // set up the ipcInterface
    this.socket = new ipcInterface(this.options)
  }

  // loads a file into mpv
  // mode
  // replace          replace current video
  // append          append to playlist
  // append-play  append to playlist and play, if the playlist was empty
  //
  // options
  // further options
  async load(source, mode = 'replace', options) {
    // check if this was called via load() or append() for error handling purposes
    const caller = util.getCaller()

    // reject if mpv is not running
    if (!this.running) {
      throw (
        this.errorHandler.errorMessage(8, caller, options ? [source, mode].concat(options) : [source, mode], null, {
          'replace': 'Replace the currently playing title',
          'append': 'Append the title to the playlist',
          'append-play': 'Append the title and when it is the only title in the list start playback'
        })
      )
    }

    // reject the promise if the mode is not correct
    if (!['replace', 'append', 'append-play'].includes(mode)) {
      throw (
        this.errorHandler.errorMessage(1, caller, options ? [source, mode].concat(options) : [source, mode], null, {
          'replace': 'Replace the currently playing title',
          'append': 'Append the title to the playlist',
          'append-play': 'Append the title and when it is the only title in the list start playback'
        })
      )
    }

    // MPV accepts various protocols, but the all start with <protocol>://, leave this input as it is
    // if it's a file, transform the path into the absolute filepath, such that it can be played
    // by any mpv instance, started in any working directory
    // also checks if the protocol is supported by mpv and throws an error otherwise
    const sourceProtocol = util.extractProtocolFromSource(source)
    if (sourceProtocol && !util.validateProtocol(sourceProtocol)) {
      throw (
        this.errorHandler.errorMessage(
          9,
          caller,
          options ? [source, mode].concat(options) : [source, mode],
          null,
          'See https://mpv.io/manual/stable/#protocols for supported protocols')
      )
    }
    // if the source is a URI, leave it as it is. MPV only accepts HTTP URIs, so checking
    // if http is included is sufficient
    // if it's a file, transform the path into the absolute filepath, such that it can be played
    // by any mpv instance, started in any working directory
    source = source.includes('http') ? source : path.resolve(source)

    await new Promise((resolve, reject) => {
      // socket to observe the command
      const observeSocket = new net.Socket()
      observeSocket.connect({ path: this.options.socket }, async () => {
        // send the command to mpv
        await this.command('loadfile', options ? [source, mode].concat(util.formatOptions(options)) : [source, mode])
        // get the playlist size
        const playlistSize = await this.getPlaylistSize()

        // if the mode is append resolve the promise because nothing
        // will be output by the mpv player
        // checking whether this source can be played or not is done when
        // the source is played
        if (mode === 'append') {
          observeSocket.destroy()
          resolve()
        }
        // if the mode is append-play and there are already songs in the playlist
        // resolve the promise since nothing will be output
        if (mode === 'append-play' && playlistSize > 1) {
          observeSocket.destroy()
          resolve()
        }

        // timeout
        let timeout = 0
        // check if the source was started
        let started = false

        observeSocket.on('data', (data) => {
          // increase timeout
          timeout += 1
          // parse the messages from the socket
          const messages = data.toString('utf-8').split('\n')
          // check every message
          messages.forEach((message) => {
            // ignore empty messages
            if (message.length > 0) {
              message = JSON.parse(message)
              if ('event' in message) {
                if (message.event === 'start-file') {
                  started = true
                }
                // when the file has successfully been loaded resolve the promise
                else if (message.event === 'file-loaded' && started) {
                  observeSocket.destroy()
                  // resolve the promise
                  resolve()
                }
                // when the track has changed we don't need a seek event
                else if (message.event === 'end-file' && started) {
                  observeSocket.destroy()
                  reject(this.errorHandler.errorMessage(0, caller, [source]))
                }
              }
            }
          })
          // reject the promise if it took to long until the playback-restart happens
          // to prevent having sockets listening forever
          if (timeout > 10) {
            observeSocket.destroy()
            reject(this.errorHandler.errorMessage(5, caller, [source]))
          }
        })
      })

    })
  }
}

// export the mpv class as the module
_.extend(NodeMpv.prototype, {
  ...commandModule, ...controlModule,
  ...eventModule, ...informationModule,
  ...playlistModule, ...audioModule,
  ...videoModule, ...subtitleModule,
  ...startStopModule
})

export default NodeMpv
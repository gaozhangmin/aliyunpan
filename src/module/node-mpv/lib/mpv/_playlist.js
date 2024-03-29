'use strict'

import net from 'node:net'
import { stat } from 'node:fs'


const playlist = {

  // load a playlist file
  // mode
  // replace  replace current playlist
  // append append to current playist
  loadPlaylist: function(playlist, mode = 'replace') {
    return new Promise((resolve, reject) => {

      // check if mpv is running at all and reject the promise if not
      if (!this.running) {
        reject(
          this.errorHandler.errorMessage(8, 'loadPlaylist()', [playlist, mode], null, {
            'replace': 'replace the current playlist (default)',
            'append': 'append to the current playlist'
          })
        )
      }

      // check for the mode paramter
      if (!['replace', 'append'].includes(mode)) {
        return reject(this.errorHandler.errorMessage(1, 'loadPlaylist()', [playlist, mode], null, {
          'replace': 'replace the current playlist (default)',
          'append': 'append to the current playlist'
        }))
      }

      // check if the playlistfile exists
      stat(playlist, (err, stats) => {
        if (err && err.errno == -2) {
          return reject(this.errorHandler.errorMessage(0, 'loadPlaylist()', [playlist]))
        } else {
          return resolve()
        }
      })
    })
      .then(() => {
        return new Promise((resolve, reject) => {
          // socket to observe the command
          let observeSocket = net.Socket()
          observeSocket.connect({ path: this.options.socket }, () => {
            // send the command to mpv
            this.command('loadlist', [playlist, mode])

            // if the mode is append resolve the promise because nothing
            // will be output by the mpv player
            // checking whether this files in hte list can be played or not is done when
            // the file is played
            if (mode === 'append') {
              observeSocket.destroy()
              return resolve()
            }

            // timeout
            let timeout = 0
            // check if the file was started
            let started = false

            observeSocket.on('data', (data) => {
              // increase timeout
              timeout += 1
              // parse the messages from the socket
              let messages = data.toString('utf-8').split('\n')
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
                      return resolve()
                    }
                    // when the track has changed we don't need a seek event
                    else if (message.event === 'end-file' && started) {
                      observeSocket.destroy()
                      // get the filename of the not playable song
                      this.getProperty(`playlist/0/filename`)
                        .then((filename) => {
                          return reject(this.errorHandler.errorMessage(0, 'loadPlaylist()', [filename]))
                        })
                    }
                  }
                }
              })
              // reject the promise if it took to long until the playback-restart happens
              // to prevent having sockets listening forever
              if (timeout > 10) {
                observeSocket.destroy()
                reject(this.errorHandler.errorMessage(5, 'loadPlaylist()'))
              }
            })
          })
        })
      })
  },
  // appends a video/song to the playlist
  // mode
  // append       append the song
  // append-play	append and play if the playlist was empty
  //
  // options
  // further options
  append: function(file, mode = 'append', options) {
    return this.load(file, mode, options)
  },
  // next song in the playlist
  // mode
  // weak  	last song in the playlist will NOT be skipped
  // force	last song in the playlist will be skipped
  next: async function(mode = 'weak') {
    // reject the promise if mpv is not running
    if (!this.running) {
      throw (
        this.errorHandler.errorMessage(8, 'next()', [mode], null, {
          'weak': 'last song in the playlist will NOT be skipped',
          'force': 'last song in the playlist will be skipped'
        })
      )
    }

    // reject the promise if the mode is not correct
    if (!['weak', 'force'].includes(mode)) {
      throw (this.errorHandler.errorMessage(1, 'next()', [mode], null, {
        'weak': 'last song in the playlist will not be skipped (default)',
        'force': 'last song in the playlist will be skipped'
      }))
    }

    // check if there's more than one song in the playlist
    // get the current position in the playlist
    const position = await this.getPlaylistPosition1()
    // geht the playlist size
    const size = await this.getPlaylistSize()
    // check if it was the last track in the playlist
    // if the mode was set to weak nothing has to happen
    // return false to show that the track was not skipped
    if (size == position && mode === 'weak') {
      return false
    }
    // if we have the last track but mode is not set to 'weak' (i.e. 'force')
    // we can just stop the playback, that is the same
    if (size == position) {
      // stop playback
      await this.stop()
      return true
    }
    // continue the skipping process
    // get the next song in the playlist for possible error messages
    const nextTrackFile = await this.getProperty(`playlist/${position}/filename`)

    return new Promise((resolve, reject) => {
      // socket to observe the command
      const observeSocket = net.Socket()
      observeSocket.connect({ path: this.options.socket }, async () => {
        // send the skip command to mpv
        await this.command('playlist-next', [mode])
        // timeout
        let timeout = 0
        // check if the file was started
        let started = false

        // listen for events
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
                // when the file has been successfully loaded resolve the promise
                else if (message.event === 'playback-restart' && started) {
                  observeSocket.destroy()
                  // resolve the promise
                  resolve(true)
                }
                // reject the promise if the file could not be loaded
                else if (message.event === 'end-file' && started) {
                  observeSocket.destroy()
                  reject(this.errorHandler.errorMessage(0, 'next()', [nextTrackFile]))
                }
              }
            }
          })
          // reject the promise if it took to long until the playback-restart happens
          // to prevent having sockets listening forever
          if (timeout > 10) {
            observeSocket.destroy()
            reject(this.errorHandler.errorMessage(5, 'next()', [nextTrackFile]))
          }
        })
      })
    })
  },
  // previous song in the playlist
  // mode
  // weak 	first song in the playlist will not be skipped
  // force	first song in the playlist will be skipped
  prev: async function(mode = 'weak') {
    // reject the promise if mpv is not running
    if (!this.running) {
      throw (
        this.errorHandler.errorMessage(8, 'prev()', [mode], null, {
          'weak': 'last song in the playlist will NOT be skipped',
          'force': 'last song in the playlist will be skipped'
        })
      )
    }

    // reject the promise if the mode is not correct
    if (!['weak', 'force'].includes(mode)) {
      throw (this.errorHandler.errorMessage(1, mode, 'prev()', null, {
        'weak': 'first song in the playlist will not be skipped (default)',
        'force': 'first song in the playlist will be skipped'
      }))
    }

    const position = await this.getPlaylistPosition()
    // first song in the playlist and 'weak' means we do nothing
    if (position == 0 && mode === 'weak') {
      return false
    }
    // mode is not set to 'weak' but 'force'
    if (position == 0) {
      // stop the playback
      await this.stop()
      return true
    }

    // continue the skipping process
    // get the name of the previous file
    const prevTrackFile = await this.getProperty(`playlist/${position - 1}/filename`)
    return new Promise((resolve, reject) => {
      // socket to observe the command
      const observeSocket = net.Socket()
      observeSocket.connect({ path: this.options.socket }, async () => {
        // send the prev command to mpv
        await this.command('playlist-prev', [mode])
        // timeout
        let timeout = 0
        // check if the file was started
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
                // when the file has been successfully loaded resolve the promise
                else if (message.event === 'playback-restart' && started) {
                  observeSocket.destroy()
                  // resolve the promise
                  resolve(true)
                }
                // reject the promise if the file could not be loaded
                else if (message.event === 'end-file' && started) {
                  observeSocket.destroy()
                  reject(this.errorHandler.errorMessage(0, prevTrackFile, 'prev()'))
                }
              }
            }
          })
          // reject the promise if it took to long until the playback-restart happens
          // to prevent having sockets listening forever
          if (timeout > 10) {
            observeSocket.destroy()
            reject(this.errorHandler.errorMessage(5, null, 'prev()'))
          }
        })
      })
    })
  },
  // jump to song in the playlist
  //
  // position
  // 	the new position (0-based)
  jump: async function(position) {
    // reject the promise if mpv is not running
    if (!this.running) {
      return reject(
        this.errorHandler.errorMessage(8, null, 'jump()')
      )
    }
    // get the size of the playlist, to check if the desired position is within the playlist
    const size = await this.getPlaylistSize()

    // check if the new position is actually within bounds of the current playlist
    if (position >= 0 && position < size) {
      // get the filename of the song that is being jumped to, for a better error message if it could
      // not be loaded
      const filename = await this.getProperty(`playlist/${position}/filename`)

      return new Promise((resolve, reject) => {
        // socket to observe the command
        const observeSocket = net.Socket()
        observeSocket.connect({ path: this.options.socket }, async () => {
          // send the command to jump in the playlist to mpv
          await this.setProperty('playlist-pos', position)
          // timeout
          let timeout = 0
          // check if the file was started
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
                  // when the file has been successfully loaded resolve the promise
                  else if (message.event === 'playback-restart' && started) {
                    observeSocket.destroy()
                    // resolve the promise
                    resolve(true)
                  }
                  // reject the promise if the file could not be loaded
                  else if (message.event === 'end-file' && started) {
                    observeSocket.destroy()
                    reject(this.errorHandler.errorMessage(0, 'jump()', filename))
                  }
                }
              }
            })
            // reject the promise if it took too long until the playback-restart happens
            // to prevent having sockets listening forever
            if (timeout > 10) {
              observeSocket.destroy()
              reject(this.errorHandler.errorMessage(5, null, 'jump()'))
            }
          })
        })

      })
    }
    // the new position is not within bounds of the playlist, which means, a goto can not be performed
    else {
      return false
    }

  },
  // clear the playlist
  clearPlaylist: function() {
    return this.command('playlist-clear')
  },
  // remove the song at index or the current song, if index = 'current'
  playlistRemove: function(index) {
    return this.command('playlist-remove', [index])
  },
  // Moves the song/video on position index1 to position index2
  playlistMove: function(index1, index2) {
    return this.command('playlist-move', [index1, index2])
  },
  // shuffle the playlist
  shuffle: function() {
    return this.command('playlist-shuffle')
  },
  // returns the playlist size (as a promise)
  getPlaylistSize: function() {
    return this.getProperty('playlist-count')
  },
  // returns the current playlist position (as a promise) 0 based
  getPlaylistPosition: function() {
    return this.getProperty('playlist-pos')
  },
  // returns the current playlist position (as a promise) 1 based
  getPlaylistPosition1: function() {
    return this.getProperty('playlist-pos-1')
  },
  // loop
  // int/string times
  // 	number n - loop n times
  // 	'inf' 	 - loop infinitely often
  // 	'no'	 - switch loop to off
  //
  // if times is not set, this method will toggle the loop state, if any looping is set, either 'inf' or a fixed number it will be switched off
  loopPlaylist: async function(times) {
    // if times was set, use it. Times can be any number > 0, 'inf' and 'no'
    if (times != null) {
      return this.setProperty('loop-playlist', times)
    }
    // if times was not set, net loop toggle the mute property
    else {
      // get the loop status
      // if any loop status was set, either 'inf' or a fixed number, switch loop to off
      // if no loop status was set, switch it on to 'inf'
      const loop_status = await this.getProperty('loop-playlist')
      return !loop_status ? this.setProperty('loop-playlist', 'inf') : this.setProperty('loop-playlist', 'no')
    }
  }


}

export default playlist

'use strict'

const video = {
  // goes into fullscreen
  fullscreen: function() {
    return this.socket.setProperty('fullscreen', true)
  },
  // leaves fullscreen
  leaveFullscreen: function() {
    return this.socket.setProperty('fullscreen', false)
  },
  // toggles fullscreen
  toggleFullscreen: function() {
    return this.socket.cycleProperty('fullscreen')
  },
  // takes a screenshot
  // option
  // subtitles  with subtitles
  //  video  without subtitles
  // window   the scaled mpv window
  screenshot: function(file, option) {
    let args = [file]
    if (option) {
      args = [...args, option]
    }

    return this.command('screenshot-to-file', args)
  },
  // video rotate
  // degrees 90 / 180 / 270 / 360
  // absolute rotation
  rotateVideo: function(degrees) {
    return this.socket.setProperty('video-rotate', degrees)
  },
  // zooms into the image
  // 0 is no zoom at all
  // 1 is twice the size
  zoomVideo: function(factor) {
    return this.socket.setProperty('video-zoom', factor)
  },


  // adjust the brightness
  // value -100  - 100
  brightness: function(value) {
    return this.socket.setProperty('brightness', value)
  },
  // adjust the contrast
  // value -100 - 100
  contrast: function(value) {
    return this.socket.setProperty('contrast', value)
  },
  // adjust the saturation
  // value -100 - 100
  saturation: function(value) {
    return this.socket.setProperty('saturation', value)
  },
  // adjust the gamma value
  // value  -100 - 100
  gamma: function(value) {
    return this.socket.setProperty('gamma', value)
  },
  // adjust the hue
  // value -100 - 100
  hue: function(value) {
    return this.socket.setProperty('hue', value)
  }
}

export default video

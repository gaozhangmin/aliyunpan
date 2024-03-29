'use strict'
const audio = {
  // add audio track
  // file path to the audio file
  // flag select / auto /cached
  // title subtitle title in the UI
  // lang subitlte language
  addAudioTrack: function(file, flag, title, lang) {
    let args = [file];
    // add the flag if specified
    if(flag) { args = [...args, flag]}
    // add the title if specified
    if(title){ args = [...args, title]}
    // add the language if specified
    if(lang) { args = [...args, lang]}
    // finally add the argument
    return this.command('audio-add', args)
  },
  // delete the audio track specified by the id
  removeAudioTrack: function(id) {
    return this.command('audio-remove', [id])
  },
  // selects the audio track
  selectAudioTrack: function(id) {
    return this.socket.setProperty('audio', id)
  },
  // cycles through the audio track
  cycleAudioTracks: function() {
    return this.socket.cycleProperty('audio')
  },
  // adjusts the timing of the audio track
  adjustAudioTiming: function(seconds) {
    return this.socket.setProperty('audio-delay', seconds)
  },
  // adjust the playback speed
  // factor  0.01 - 100
  speed: function(factor) {
    return this.socket.setProperty('speed', factor)
  }
}

export default audio

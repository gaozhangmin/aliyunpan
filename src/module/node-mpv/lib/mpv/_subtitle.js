'use strict'

const subtitle = {

  // add subtitle file
  // file path to the subtitle file
  // flag select / auto /cached
  // title subtitle title in the UI
  // lang subitlte language
  addSubtitles: function(file, flag, title, lang) {
    let args = [file];
    // add the flag if specified
    if(flag){  args = [...args, flag]}
    // add the title if specified
    if(title){ args = [...args, title]}
    // add the language if specified
    if(lang){  args = [...args, lang]}
    // finally add the argument
    return this.command('sub-add', args)
  },
  // delete subtitle specified by the id
  removeSubtitles: function(id) {
    return this.command('sub-remove', [id])
  },
  // cycle through subtitles
  cycleSubtitles: function() {
    return this.socket.cycleProperty('sub')
  },
  // selects subitle according to the id
  selectSubtitles: function(id) {
    return this.socket.setProperty('sub', id)
  },
  // toggle subtitle visibility
  toggleSubtitleVisibility: function() {
    return this.socket.cycleProperty('sub-visibility')
  },
  // shows selected subtitle
  showSubtitles: function() {
    return this.socket.setProperty('sub-visibility', true)
  },
  // hides subtitles
  hideSubtitles: function() {
    return this.socket.setProperty('sub-visibility', false)
  },
  // adjusts the subtitles timing
  adjustSubtitleTiming: function(seconds) {
    return this.socket.setProperty('sub-delay', seconds)
  },
  // jumps linesToSkip many lines forward in the video
  subtitleSeek: function(lines) {
    return this.command('sub-seek', [lines])
  },
  // scales to font size of the subtitles
  subtitleScale: function(scale) {
    this.setProperty('sub-scale', scale)
  },
  // displays ASS subtitle calls
  displayASS: async function(ass, duration, position = 7) {
    let assCommand = {
      'command': [
        'expand-properties',
        'show-text',
        `\${osd-ass-cc/0}{\\an${position}}${ass}`,
        duration
      ]
    }
    await this.commandJSON(assCommand)
    return this.setProperty('sub-scale', scale)
  }
}

export default subtitle

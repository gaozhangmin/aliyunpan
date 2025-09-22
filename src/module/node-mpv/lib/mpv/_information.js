'use strict'

const information = {
  // Shows if the player is muted
  //
  // @return {promise}
  isMuted: function() {
    return this.getProperty('mute')
  },
  // Shows if the player is paused
  //
  // @return {promise}
  isPaused: function() {
    return this.getProperty('pause')
  },
  // Shows if the current title is seekable or not
  // Not fully buffered streams are not for example
  //
  // @return {promise}
  isSeekable: function() {
    return this.getProperty('seekable')
  },


  // Duration of the currently playing song if available
  //
  // @return {promise}
  getDuration: function() {
    return this.getProperty('duration')
  },

  // Current time position of the currently playing song
  //
  // @return {promise}
  getTimePosition: function() {
    return this.getProperty('time-pos')
  },
  // Current time position (in percent) of the currently playing song
  //
  // @return {promise}
  getPercentPosition: function() {
    return this.getProperty('percent-pos')
  },
  // Remaining time for the currently playing song, if available
  //
  // @return {promise}
  getTimeRemaining: function() {
    return this.getProperty('time-remaining')
  },
  // Returns the available metadata for the current track. The output is very dependant
  // on the loaded file
  //
  // @return {promise}
  getMetadata: function() {
    return this.getProperty('metadata')
  },
  // Title of the currently playing song. Might be unavailable
  //
  // @return {promise}
  getTitle: function() {
    return this.getProperty('media-title')
  },
  // Returns the artist of the current song if available
  //
  // @return {promise}
  getArtist: async function() {
    const metadata = await this.getMetadata()
    return metadata && metadata.artist
  },
  // Returns the album title of the current song if available
  //
  // @return {promise}
  getAlbum: async function() {
    const metadata = await this.getMetadata()
    return metadata && metadata.album
  },
  // Returns the year of the current song if available
  //
  // @return {promise}
  getYear: async function() {
    const metadata = await this.getMetadata()
    return metadata && metadata.date
  },
  // Returns the filename / url of the current track
  //
  // full     - full path or url
  // stripped - stripped path missing the base
  //
  // @return {promise}
  getFilename: async function(format = 'full') {
    // reject the promise if the format is not valid
    if (!['stripped', 'full'].includes(format)) {
      throw this.errorHandler.errorMessage(1, 'getFilename()', [format], null, {
        'full': 'the full path to the file (default)',
        'stripped': 'stripped path without the full path in fron of it'
      })
    }

    // get the information
    return this.getProperty(format === 'stripped' ? 'filename' : 'path')
  },

  // Returns specified chapter.
  //
  // @return {promise}
  getChapter: async function(index){
    return {
      title : await this.getProperty(`chapter-list/${index}/title`),
      time: await this.getProperty(`chapter-list/${index}/time`)
    }
  },

  // Returns chapters list if available
  // @return {promise}
  getChapters: async function() {
    const count = await this.getChapterCount();
    let chapters = [];
    for (let i =0; i < count; i++){
      chapters.push(await this.getChapter(i))
    }
    return chapters;
  },
}

export default information

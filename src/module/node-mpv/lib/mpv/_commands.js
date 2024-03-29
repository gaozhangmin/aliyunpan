'use strict'

import util from '../util'

const commands = {
  // will send a get request for the specified property
  // if no idea is provided this will return a promise
  // if an id is provied the answer will come via a 'getrequest' event containing the id and data
  getProperty: function(property) {
    return this.socket.getProperty(property)
  },
  // set a property specified by the mpv API
  setProperty: function(property, value) {
    return this.socket.setProperty(property, value)
  },
  // sets all properties defined in the properties Json object
  setMultipleProperties: function(properties) {
    return new Promise((resolve, reject) => {
      // check if the player is running
      if (this.running) {
        // list of all promises
        let promises = []
        // add all promises  to the list
        Object.keys(properties).forEach((property) => {
          promises.push(this.socket.setProperty(property, properties[property]))
        })
        // return the promise all object
        resolve(Promise.all(promises))
      }
      // reject if MPV is not running
      else {
        return reject(
          this.errorHandler.errorMessage(8, util.getCaller())
        )
      }
    })
  },
  // adds the value to the property
  addProperty: function(property, value) {
    return this.socket.addProperty(property, value)
  },
  // multiplies the specified property by the value
  multiplyProperty: function(property, value) {
    return this.socket.multiplyProperty(property, value)
  },
  // cycles a arbitrary property
  cycleProperty: function(property) {
    return this.socket.cycleProperty(property)
  },
  // send a command with arguments to mpv
  command: function(command, args) {
    return this.socket.command(command, args)
  },
  // sends a command specified by a JSON object to mpv
  commandJSON: function(command) {
    return this.socket.freeCommand(JSON.stringify(command))
  },
  // send a freely writeable command to mpv.
  // the required trailing \n will be added
  freeCommand: function(command) {
    return this.socket.freeCommand(command)
  },

  // observe a property for changes
  // will be added to event for property changes
  observeProperty: function(property) {
    // create the id assigned with this property
    // +1 because time-pos (which has the id 0) is not included in this object
    const prop_id = Object.keys(this.observedProperties).length + 1
    // store the id into the hash map, such that it can be retrieved later if
    // the property should be unobserved
    this.observedProperties[property] = prop_id
    return this.socket.command('observe_property', [prop_id, property])

  },
  // stop observing a property
  unobserveProperty: function(property) {
    // retrieve the id associated with this property
    const prop_id = this.observedProperties[property]
    delete this.observedProperties[prop_id]
    return this.socket.command('unobserve_property', [prop_id])
  }
}

export default commands

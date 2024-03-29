'use strict'

import ErrorHandler from '../error'

// An object of this class is created for every message sent over the IPC socket
// via the ipcInterface. It stores information about what high level mpv function
// has invoked the message with which arguments
//
// Since every message is wrapped in a promise the resolve and reject functions
// are also stored in this object, such that it they can later be called

class ipcRequest {
  // constructs the object
  //
  // @param resolve - the resolve function of the message's promise
  // @param reject  - the reject  function of the message's promise
  // @param args    - arguments for the mpv command
  constructor(resolve, reject, args) {
    this.messageResolve = resolve
    this.messageReject = reject
    this.args = args

    // get the stack trace and look for the mpv function calls
    const stackMatch = new Error().stack.match(/mpv.\w+\s/g)
    // get the last mpv function as the relevant caller for error handling
    this.caller = stackMatch ? stackMatch[stackMatch.length - 1].slice(4, -1) + '()' : null
  }

  // resolves the promise with the passed resolveValue
  //
  // @param resolveValue - the value passed to the promise resolve
  resolve(resolveValue) {
    this.messageResolve(resolveValue)
  }

  // rejects the error with the passed rejectValue
  //
  // @param err - the error reason extracted from the IPC response
  reject(err) {
    const errHandler = new ErrorHandler()
    const errMessage = errHandler.errorMessage(3, this.caller, this.args, err)
    this.messageReject(errMessage)
  }
}

export default ipcRequest

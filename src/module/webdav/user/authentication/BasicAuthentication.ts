import {
  Errors,
  HTTPBasicAuthentication,
  HTTPRequestContext,
  IUser,
  SimplePathPrivilegeManager
} from 'webdav-server/lib/index.v2'
import UserModel from '../UserModel'

class BasicAuthentication extends HTTPBasicAuthentication {

  getUser(ctx: HTTPRequestContext, callback: (error: Error, user: IUser) => void) {
    const _this = this
    const onError = function(error: any) {
      _this.userManager.getDefaultUser((defaultUser) => {
        callback(error, defaultUser)
      })
    }
    const authHeader = ctx.headers.find('Authorization')
    if (!authHeader) {
      onError(Errors.MissingAuthorisationHeader)
      return
    }
    const authBasic = /^Basic \s*([a-zA-Z0-9]+=*)\s*$/.exec(authHeader)
    if (!authBasic || !authBasic[1]) {
      onError(Errors.WrongHeaderFormat)
      return
    }
    const value = Buffer.from(authBasic[1], 'base64').toString().split(':', 2)
    const username = value[0]
    const password = value[1]
    this.userManager.getUserByNamePassword(username, password, (e, user) => {
      if (e) {
        onError(Errors.BadAuthentication)
      } else {
        let iUser = user!! as UserModel
        let privilegeManager = ctx.server.privilegeManager as SimplePathPrivilegeManager
        privilegeManager.setRights(iUser, iUser.path, iUser.rights)
        callback(Errors.None, iUser)
      }
    })

  }
}

export default BasicAuthentication
import { Errors, IListUserManager, ITestableUserManager, IUser } from 'webdav-server/lib/index.v2'
import UserStore from './UserStore'
import UserModel from './UserModel'

class UserManager implements ITestableUserManager, IListUserManager {
  private storeUser: UserStore

  constructor() {
    this.storeUser = new UserStore()
  }

  getDefaultUser(callback: (user: IUser) => void): any {
    callback(new UserModel('DefaultUser', '', '/', [], false, true))
  }

  getUserByName(username: string, callback: (error: Error, user?: IUser) => void): any {
    this.storeUser.getUser(username).then(user => {
      if (!user)
        callback(Errors.UserNotFound)
      else
        callback(Errors.None, user)
    })
  }

  getUserByNamePassword(username: string, password: string, callback: (error: Error, user?: IUser) => void): any {
    this.getUserByName(username, (e, user) => {
      if (e) return callback(e)
      if (user && user.password === password) {
        callback(Errors.None, user)
      } else callback(Errors.UserNotFound)
    })
  }

  async setUser(username: string, password: string, path: string, rights: any, isAdmin: boolean = false) {
    return this.storeUser.setUser(username, password, path, rights, isAdmin)
  }

  delUser(username: string) {
    this.storeUser.deleteUser(username)
  }

  getUsers(callback: (error: Error, users: IUser[]) => void): any {
    this.storeUser.getUsers().then((r) => {
      callback(Errors.None, r)
    })
  }

  getUserNum(callback: (error: Error, userNum: number) => void): any {
    this.storeUser.getUsers().then((r) => {
      callback(Errors.None, r.length)
    })
  }
}

export default UserManager
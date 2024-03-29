import UserModel from './UserModel'
import { IUser } from 'webdav-server/lib/index.v2'
import DB from '../../../utils/db'

class UserStore {
  constructor() {
  }

  setUser(username: string, password: string, path: string, rights: any, isAdmin: boolean = false) {
    return new Promise<IUser>(async (resolve) => {
      const user = new UserModel(username, password, path, rights, isAdmin, false)
      const userList = await DB.getValueObject('webdav-server') as IUser[]
      const saveList = userList ? userList.concat(user) : [user]
      await DB.saveValueObject('webdav-server', saveList)
      resolve(user)
    })
  }

  getUser(username: string) {
    return new Promise<IUser | undefined>(async (resolve) => {
      let users = await this.getUsers()
      let user = users.filter(u => u.username === username)[0] || undefined
      resolve(user)
    })
  }

  getUsers() {
    return new Promise<IUser[]>(async (resolve) => {
      const userList = await DB.getValueObject('webdav-server') as IUser[] || []
      resolve(userList)
    })
  }

  deleteUser(username: string) {
    DB.deleteValueObject(username).then()
  }
}

export default UserStore
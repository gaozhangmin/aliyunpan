import { IUser } from 'webdav-server/lib/index.v2'
import getUuid from 'uuid-by-string'

class UserModel implements IUser {
  uid: string
  password: string
  username: string
  isAdministrator: boolean
  isDefaultUser: boolean
  path: string
  rights: any


  constructor(username: string, password: string,
              path: string, rights: any,
              isAdministrator: boolean, isDefaultUser: boolean) {
    this.uid = getUuid(username.toString(), 5)
    this.username = username
    this.password = password
    this.path = path
    this.rights = rights
    this.isAdministrator = isAdministrator
    this.isDefaultUser = isDefaultUser
  }
}

export default UserModel
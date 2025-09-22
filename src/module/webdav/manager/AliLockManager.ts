import { ReturnCallback, LocalLockManager, Lock, Errors } from 'webdav-server/lib/index.v2'


class AliLockManager extends LocalLockManager {
  getLocks(callback: ReturnCallback<Lock[]>) {
    this.locks = this.locks.filter((lock: any) => {
      return !lock.expired()
    })
    callback(Errors.None, this.locks) // bug 55572
  }
}

export default AliLockManager
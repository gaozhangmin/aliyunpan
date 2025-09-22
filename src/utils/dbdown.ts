import Dexie from 'dexie'
import { IStateDownFile } from '../down/DownDAL'
import useUserStore from '../user/userstore'

class XBYDB3Down extends Dexie {
  idowning: Dexie.Table<IStateDownFile, string>
  idowned: Dexie.Table<IStateDownFile, string>

  constructor() {
    super('XBYDB3Down')

    this.version(10)
      .stores({
        idowning: 'DownID, Info.drive_id, Info.user_id',
        idowned: 'DownID, Info.drive_id, Info.user_id, Down.DownTime',
      })
      .upgrade((tx: any) => {
        console.log('upgrade', tx)
      })
    this.idowning = this.table('idowning')
    this.idowned = this.table('idowned')
  }

  async getDowning(key: string): Promise<IStateDownFile | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.idowning.get(key)
    if (val) return val
    else return undefined
  }
  async getDowningAll(): Promise<IStateDownFile[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.where('Info.user_id').equals(useUserStore().user_id).toArray()
  }
  async deleteDowning(key: string) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.delete(key)
  }
  async deleteDownings(keys: string[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.bulkDelete(keys)
  }
  async saveDowning(key: string, value: IStateDownFile) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.put(value, key).catch(() => {})
  }
  async saveDownings(values: IStateDownFile[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.bulkPut(values).catch(() => {})
  }
  async deleteDowningAll() {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowning.where('Info.user_id').equals(useUserStore().user_id).delete()
  }

  async getDowned(key: string): Promise<IStateDownFile | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.idowned.get(key)
    if (val) return val
    else return undefined
  }

  async getDownedAll(): Promise<IStateDownFile[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowned.where('Info.user_id').equals(useUserStore().user_id).reverse().toArray()
  }

  async getDownedByTop(limit: number) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.transaction('r', this.idowned, () => {
      return this.idowned.reverse().limit(limit).toArray()
    })
  }

  async getDownedTaskCount(): Promise<number> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.transaction('r', this.idowned, () => {
      return this.idowned.count()
    })
  }
  async deleteDowned(key: string) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowned.delete(key)
  }

  async deleteDowneds(keys: string[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowned.bulkDelete(keys)
  }

  async deleteDownedOutCount(max: number): Promise<number> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const count = await this.idowned.count()
    if (count > max) {
      return this.idowned.limit(max - count).delete()
    }
    return 0
  }

  async saveDowned(key: string, value: IStateDownFile) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowned.put(value, key).catch(() => {})
  }
  async deleteDownedAll() {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.idowned.where('Info.user_id').equals(useUserStore().user_id).delete()
  }
}

const DBDown = new XBYDB3Down()
export default DBDown

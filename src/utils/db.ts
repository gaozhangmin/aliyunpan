import Dexie from 'dexie'
import useUserStore,{ ITokenInfo } from '../user/userstore'
import { IOtherShareLinkModel } from '../share/share/OtherShareStore'
import { IStateUploadFile } from '../aliapi/models'
import { IStateDownFile } from '../down/DownDAL'

export interface ICache {
  key: string
  time: number
  value: object
}

class XBYDB3 extends Dexie {
  iobject: Dexie.Table<object, string>
  istring: Dexie.Table<string, string>
  inumber: Dexie.Table<number, string>
  ibool: Dexie.Table<boolean, string>

  itoken: Dexie.Table<ITokenInfo, string>
  iothershare: Dexie.Table<IOtherShareLinkModel, string>
  idowning: Dexie.Table<IStateDownFile, string>
  idowned: Dexie.Table<IStateDownFile, string>
  iuploading: Dexie.Table<IStateUploadFile, string>
  iuploaded: Dexie.Table<IStateUploadFile, string>
  ifilehash: Dexie.Table<object, string>

  constructor() {
    super('XBYDB3')

    this.version(9)
      .stores({
        iobject: '',
        istring: '',
        inumber: '',
        ibool: '',

        itoken: 'user_id',
        iothershare: 'share_id',
        idowning: 'DownID, Info.drive_id, Info.user_id',
        idowned: 'DownID, Info.drive_id, Info.user_id, Down.DownTime',
        iuploading: 'UploadID, Info.drive_id, Info.user_id',
        iuploaded: 'UploadID, Info.drive_id, Info.user_id, Upload.DownTime',
        ifilehash: ''
      })
      .upgrade((tx: any) => {
        console.log('upgrade', tx)
      })
    this.iobject = this.table('iobject')
    this.istring = this.table('istring')
    this.inumber = this.table('inumber')
    this.ibool = this.table('ibool')

    this.itoken = this.table('itoken')
    this.iothershare = this.table('iothershare')
    this.idowning = this.table('idowning')
    this.idowned = this.table('idowned')
    this.iuploading = this.table('iuploading')
    this.iuploaded = this.table('iuploaded')
    this.ifilehash = this.table('ifilehash')
  }

  async getValueString(key: string): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.istring.get(key)
    if (val) return val
    else return ''
  }

  async saveValueString(key: string, value: string): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.istring.put(value || '', key)
  }

  async saveValueStringBatch(keys: string[], values: string[]): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.istring.bulkPut(values, keys)
  }

  async getValueNumber(key: string): Promise<number> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.inumber.get(key)
    if (val) return val
    return 0
  }

  async saveValueNumber(key: string, value: number): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.inumber.put(value, key)
  }

  async getValueBool(key: string): Promise<boolean> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.ibool.get(key)
    if (val) return true
    return false
  }

  async saveValueBool(key: string, value: boolean): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.ibool.put(value || false, key)
  }

  async getValueObject(key: string): Promise<object | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.iobject.get(key)
    if (val) return val
    else return undefined
  }

  async saveValueObject(key: string, value: object): Promise<string | void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iobject.put(value, key).catch(() => {})
  }

  async saveValueObjectBatch(keys: string[], values: object[]): Promise<string> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iobject.bulkPut(values, keys)
  }

  async deleteValueObject(key: string): Promise<void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iobject.delete(key)
  }

  async getUser(user_id: string): Promise<ITokenInfo | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return await this.transaction('r', this.itoken, () => {
      return this.itoken.get(user_id)
    })
  }

  async getUserAll(): Promise<ITokenInfo[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const list = await this.transaction('r', this.itoken, () => {
      return this.itoken.toArray()
    })
    return list.sort((a: ITokenInfo, b: ITokenInfo) => b.used_size - a.used_size)
  }

  async deleteUser(user_id: string): Promise<void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.itoken.delete(user_id)
  }

  async saveUser(token: ITokenInfo): Promise<string | void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.itoken.put(token, token.user_id).catch(() => {})
  }

  async getOtherShare(share_id: string): Promise<IOtherShareLinkModel | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return await this.iothershare.get(share_id)
  }

  async getOtherShareAll(): Promise<IOtherShareLinkModel[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const list = await this.iothershare.toArray()
    return list.sort((a: IOtherShareLinkModel, b: IOtherShareLinkModel) => b.saved_time - a.saved_time)
  }

  async deleteOtherShareBatch(share_id_list: string[]): Promise<void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iothershare.bulkDelete(share_id_list)
  }

  async saveOtherShare(share: IOtherShareLinkModel): Promise<string | void> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iothershare.put(share, share.share_id).catch(() => {})
  }

  async getDowning(key: string): Promise<IStateDownFile | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.idowning.get(key)
    if (val) return val
    else return undefined
  }
  async getDowningAll(): Promise<IStateDownFile[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const list = await this.idowning.where('Info.user_id').equals(useUserStore().user_id).toArray()
    return list
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
    const list = await this.idowned.where('Info.user_id').equals(useUserStore().user_id).reverse().toArray()
    return list
  }

  async getDownedByTop(limit: number) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return await this.transaction('r', this.idowned, () => {
      return this.idowned.reverse().limit(limit).toArray()
    })
  }

  async getDownedTaskCount(): Promise<number> {
    if (!this.isOpen()) await this.open().catch(() => {})
    return await this.transaction('r', this.idowned, () => {
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

  async getUploading(key: string): Promise<IStateUploadFile | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.iuploading.get(key)
    if (val) return val
    else return undefined
  }
  async getUploadingAll(): Promise<IStateUploadFile[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const list = await this.iuploading.where('Info.user_id').equals(useUserStore().user_id).toArray()
    return list
  }
  async deleteUploading(key: string) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploading.delete(key)
  }
  async deleteUploadings(keys: string[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploading.bulkDelete(keys)
  }
  async saveUploading(key: string, value: IStateUploadFile) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploading.put(value, key).catch(() => {})
  }
  async saveUploadings(items: IStateUploadFile[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploading.bulkPut(items).catch(() => {})
  }
  async deleteUploadingAll() {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploading.where('Info.user_id').equals(useUserStore().user_id).delete()
  }
  async getUploaded(key: string): Promise<IStateUploadFile | undefined> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const val = await this.iuploaded.get(key)
    if (val) return val
    else return undefined
  }
  async getUploadedAll(): Promise<IStateUploadFile[]> {
    if (!this.isOpen()) await this.open().catch(() => {})
    const userStore = useUserStore()
    const list = await this.iuploaded.where('Info.user_id').equals(userStore.user_id).reverse().toArray()
    return list
  }
  async deleteUploaded(key: string) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploaded.delete(key)
  }
  async deleteUploadeds(keys: string[]) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploaded.bulkDelete(keys)
  }
  async saveUploaded(key: string, value: IStateUploadFile) {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploaded.put(value, key).catch(() => {})
  }
  async deleteUploadedAll() {
    if (!this.isOpen()) await this.open().catch(() => {})
    return this.iuploaded.where('Info.user_id').equals(useUserStore().user_id).delete()
  }
}

const DB = new XBYDB3()
export default DB

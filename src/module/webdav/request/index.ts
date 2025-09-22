import {
  CopyInfo,
  CreateInfo,
  DeleteInfo,
  Errors,
  IContextInfo,
  MoveInfo,
  OpenReadStreamInfo
} from 'webdav-server/lib/index.v2'
import { usePanTreeStore, useSettingStore } from '../../../store'
import TreeStore from '../../../store/treestore'
import AliFile from '../../../aliapi/file'
import AliDirFileList from '../../../aliapi/dirfilelist'
import AliHttp from '../../../aliapi/alihttp'
import AliFileCmd from '../../../aliapi/filecmd'
import { StructDirectory } from '../resource/ResourceStruct'
import AliUpload from '../../../aliapi/upload'
import AliUploadHashPool from '../../../aliapi/uploadhashpool'
import UserDAL from '../../../user/userdal'
import { Readable } from 'node:stream'
import { getEncType, getRawUrl } from '../../../utils/proxyhelper'

class Request {
  private static fileInfo: any

  constructor() {

  }

  static async getRootDirectory(ctx: IContextInfo): Promise<StructDirectory[]> {
    let { backup_drive_id, resource_drive_id, pic_drive_id } = usePanTreeStore()
    let { securityHideBackupDrive, securityHideResourceDrive, securityHidePicDrive } = useSettingStore()
    let resPan = {
      files: [],
      folders: [],
      current: {
        name: '备份盘',
        drive_id: backup_drive_id,
        description: '',
        parent_file_id: '',
        file_id: 'backup_root',
        ext: '',
        rootFolderType: 0
      }
    }
    let backupPan = {
      files: [],
      folders: [],
      current: {
        name: '资源盘',
        drive_id: resource_drive_id,
        parent_file_id: '',
        description: '',
        file_id: 'resource_root',
        ext: '',
        rootFolderType: 0
      }
    }
    let picPan = {
      files: [],
      folders: [],
      current: {
        name: '相册',
        drive_id: pic_drive_id,
        parent_file_id: '',
        description: '',
        file_id: 'pic_root',
        ext: '',
        rootFolderType: 0
      }
    }
    let rootDir = []
    if (!securityHideBackupDrive) {
      rootDir.push(backupPan)
    }
    if (!securityHideResourceDrive) {
      rootDir.push(resPan)
    }
    if (!securityHidePicDrive) {
      rootDir.push(picPan)
    }
    return rootDir
  }

  static async getStructDirectory(ctx: IContextInfo, drive_id: string, file_id: string): Promise<StructDirectory[] | StructDirectory | Error> {
    console.log('api.getStructDirectory, file_id', file_id)
    try {
      // 如果为根路径，加入备份盘和资源盘
      if (file_id == 'root') {
       return this.getRootDirectory(ctx)
      }
      let { user_id } = usePanTreeStore()
      // 获取访问的文件路径
      let dir = TreeStore.GetDir(drive_id, file_id)
      let dirPath = TreeStore.GetDirPath(drive_id, file_id)
      if (!dir || (dirPath.length == 0 && !file_id.includes('root'))) {
        let findPath = await AliFile.ApiFileGetPath(user_id, drive_id, file_id)
        if (findPath.length > 0) {
          dirPath = findPath
          dir = { ...dirPath[dirPath.length - 1] }
        }
      }
      if (!dir || (dirPath.length == 0 && !file_id.includes('root'))) {
        return Errors.ResourceNotFound
      }
      // 根据文件id加载文件列表
      let files: any[] = []
      let folders: any[] = []
      const resp = await AliDirFileList.ApiDirFileList(user_id, drive_id, file_id, '', 'name asc', '', '', false)
      resp.items.forEach((item) => {
        if (item.isDir) folders.push(item)
        else files.push(item)
      })
      return { current: dir, files: files, folders: folders }
    } catch (error) {
      console.error('api.getStructDirectory', error)
      throw error
    }
  }

  static async getReadStream(ctx: OpenReadStreamInfo, file: any) {
    try {
      // 获取下载地址
      if (!this.fileInfo || this.fileInfo.file_id != file.file_id) {
        const data = await getRawUrl(usePanTreeStore().user_id, file.drive_id, file.file_id, getEncType({ description: file.description }))
        let url = ''
        if (typeof data !== 'string' && data.url && data.url != '') {
          this.fileInfo = {
            url: data.url,
            name: file.name,
            size: file.size,
            file_id: file.file_id
          }
        }
      }
      // 获取流
      let reqRange = ctx.context.headers.find('Range')
      let response = await fetch(this.fileInfo.url, {
        headers: {
          Range: reqRange ? reqRange : 'bytes=0-' + file.size,
          Referer: 'https://www.aliyundrive.com/'
        }
      })
      if (!response.ok || !response.body) {
        return Errors.ResourceNotFound
      }
      const reader = response.body!!.getReader()
      return new Readable({
        read(size) {
          reader.read().then(({ done, value }) => {
            if (done) {
              reader.cancel()
              this.push(null)
              this.emit('close')
            } else {
              this.push(value)
            }
          }).catch(error => {
            this.emit('error', error)
          })
        },
        destroy() {
          this.emit('close')
          reader.cancel()
        },
        autoDestroy: true
      })
    } catch (error) {
      console.error('api.getReadStream', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v2/file/create_with_proof`
  static async createFolder(ctx: CreateInfo, drive_id: string, parent_file_id: string, element: string) {
    try {
      let resp = await AliFileCmd.ApiCreatNewForder(usePanTreeStore().user_id, drive_id, parent_file_id, element)
      return {
        name: element,
        drive_id: drive_id,
        file_id: resp.file_id,
        parent_file_id: parent_file_id
      }
    } catch (error) {
      console.error('api.createFolder', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v2/file/create_with_proof`
  // todo: 创建文件
  static async createFile(ctx: CreateInfo, drive_id: string, parent_file_id: string, filename: string, content: string) {
    try {
      const token = await UserDAL.GetUserTokenFromDB(usePanTreeStore().user_id)
      let buff = Buffer.from([])
      let hash = 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709'
      let proof = ''
      if (content.length > 0) {
        buff = Buffer.from(content, 'utf-8')
        const dd: any = await AliUploadHashPool.GetBuffHashProof(token!.access_token, buff)
        hash = dd.sha1
        proof = dd.proof_code
      }
      const size = buff.length
      const resp = await AliUpload.UploadCreatFileWithFolders(usePanTreeStore().user_id, drive_id, parent_file_id, filename, size, hash, proof, 'refuse')
      let upload_url = ''
      if (resp.part_info_list && resp.part_info_list.length > 0) {
        upload_url = resp.part_info_list[0].upload_url
      }
      return {
        name: filename,
        drive_id: drive_id,
        errormsg: resp.errormsg || '',
        upload_url: upload_url,
        isexist: resp.isexist,
        israpid: resp.israpid,
        file_id: resp.file_id,
        upload_id: resp.upload_id,
        parent_file_id: parent_file_id
      }
    } catch (error) {
      console.error('api.createFile', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/delete`
  // `https://api.aliyundrive.com/v2/recyclebin/trash`
  static async deleteFolder(ctx: DeleteInfo, drive_id: string, file_id: string) {
    try {
      const url = 'v3/file/delete'
      const postData = { drive_id: drive_id, file_id: file_id }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('deleteFolder', resp)
      return { status: resp.code, drive_id: drive_id, file_id: resp.body.id || '' }
    } catch (error) {
      console.error('api.deleteFolder', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/delete`
  // `https://api.aliyundrive.com/v2/recyclebin/trash`
  static async deleteFile(ctx: DeleteInfo, drive_id: string, file_id: string) {
    try {
      const url = 'v3/file/delete'
      const postData = { drive_id: drive_id, file_id: file_id }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('deleteFile', resp)
      return { status: resp.code, drive_id: drive_id, file_id: file_id || '' }
    } catch (error) {
      console.error('api.deleteFile', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/copy`
  static async copyFile(ctx: CopyInfo, drive_id: string, file_id: string, to_file_id: string) {
    try {
      const url = 'v3/file/copy'
      const postData = {
        drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_file_id,
        auto_rename: true
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('copyFile', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || ''
      }
    } catch (error) {
      console.error('api.copyFile', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/copy`
  static async copyFolder(ctx: CopyInfo, drive_id: string, file_id: string, to_file_id: string) {
    try {
      const url = 'v3/file/copy'
      const postData = {
        drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_file_id,
        auto_rename: true
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('copyFolder', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || ''
      }
    } catch (error) {
      console.error('api.copyFolder', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/update`
  static async renameFile(ctx: MoveInfo, drive_id: string, file_id: string, newName: string) {
    try {
      const url = 'v3/file/update'
      const postData = {
        drive_id: drive_id,
        file_id: file_id,
        name: newName,
        check_name_mode: 'refuse'
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('renameFile', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || '',
        name: resp.body.name || ''
      }
    } catch (error) {
      console.error('api.renameFolder', error)
      throw error
    }
  }

  // `https://api.aliyundrive.com/v3/file/update`
  static async renameFolder(ctx: MoveInfo, drive_id: string, file_id: string, newName: string) {
    try {
      const url = 'v3/file/update'
      const postData = {
        drive_id: drive_id,
        file_id: file_id,
        name: newName,
        check_name_mode: 'refuse'
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('renameFile', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || '',
        name: resp.body.name || ''
      }
    } catch (error) {
      console.error('api.renameFolder', error)
      throw error
    }
  }

  //`https://api.aliyundrive.com/v3/file/move`
  static async moveFile(ctx: MoveInfo, drive_id: string, file_id: string, to_file_id: string) {
    try {
      const url = 'v3/file/move'
      const postData = {
        drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_file_id,
        auto_rename: true
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('moveFolder', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || ''
      }
    } catch (error) {
      console.error('api.moveFile', error)
      throw error
    }
  }

  //`https://api.aliyundrive.com/v3/file/move`
  static async moveFolder(ctx: MoveInfo, drive_id: string, file_id: string, to_file_id: string) {
    try {
      const url = 'v3/file/move'
      const postData = {
        drive_id: drive_id,
        to_drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_file_id,
        auto_rename: true
      }
      const resp = await AliHttp.Post(url, postData, usePanTreeStore().user_id, '')
      console.log('moveFolder', resp)
      return {
        status: resp.code,
        drive_id: resp.body.drive_id || '',
        file_id: resp.body.file_id || ''
      }
    } catch (error) {
      console.error('api.moveFolder', error)
      throw error
    }
  }
}

export default Request
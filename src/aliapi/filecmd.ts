import DebugLog from '../utils/debuglog'
import AliHttp from './alihttp'
import { IAliFileItem, IAliGetFileModel } from './alimodels'
import AliDirFileList from './dirfilelist'
import { ApiBatch, ApiBatchMaker, ApiBatchMaker2, ApiBatchSuccess, EncodeEncName, isBaiduUser, isCloud123User, isDrive115User } from './utils'
import { IDownloadUrl } from './models'
import AliFile from './file'
import message from '../utils/message'
import usePanFileStore from '../pan/panfilestore'
import usePanTreeStore from '../pan/pantreestore'
import { apiCloud123CopyBatch, apiCloud123CopySingle, apiCloud123DeleteBatch, apiCloud123FileDetail, apiCloud123FileInfos, apiCloud123Mkdir, apiCloud123MoveBatch, apiCloud123RecoverBatch, apiCloud123TrashBatch } from '../cloud123/filecmd'
import { mapCloud123InfoToAliModel } from '../cloud123/dirfilelist'
import { apiDrive115Mkdir } from '../cloud115/filecmd'
import { apiDrive115CopyBatch } from '../cloud115/copy'
import { apiDrive115MoveBatch } from '../cloud115/move'
import { apiDrive115Rename } from '../cloud115/rename'
import { apiDrive115TrashBatch, apiDrive115TrashDelete, apiDrive115TrashRestore } from '../cloud115/trash'
import { apiBaiduCopy, apiBaiduDelete, apiBaiduMove, apiBaiduRename } from '../cloudbaidu/filemanager'
import { apiBaiduCreateDir, buildBaiduUploadPath } from '../cloudbaidu/upload'
import { copyWebDavPath, createWebDavDirectory, deleteWebDavPath, getWebDavConnection, getWebDavConnectionId, isWebDavDrive, moveWebDavPath, normalizeWebDavPath, renameWebDavPath } from '../utils/webdavClient'

export default class AliFileCmd {
  static ResolveBaiduPaths(file_idList: string[]): string[] {
    if (!file_idList.length) return []
    const list = usePanFileStore().ListDataRaw || []
    return file_idList.map((id) => {
      if (id.startsWith('/')) return id
      const hit: any = list.find((item: any) => item.file_id === id)
      if (hit?.path) return hit.path
      const match = hit?.description && /baidu_path:([^;]+)/.exec(hit.description)
      if (match && match[1]) return match[1]
      return id
    })
  }
  static ResolveBaiduTargetPath(file_id: string, path: string = '', description: string = ''): string {
    if (path) return path
    if (!file_id) return '/'
    if (file_id.startsWith('/')) return file_id
    const directMatch = description && /baidu_path:([^;]+)/.exec(description)
    if (directMatch && directMatch[1]) return directMatch[1]
    const list = usePanFileStore().ListDataRaw || []
    const hit: any = list.find((item: any) => item.file_id === file_id)
    if (hit?.path) return hit.path
    const listMatch = hit?.description && /baidu_path:([^;]+)/.exec(hit.description)
    if (listMatch && listMatch[1]) return listMatch[1]
    const selectDir: any = usePanTreeStore().selectDir
    if (selectDir?.file_id === file_id) {
      if (selectDir.path) return selectDir.path
      const dirMatch = selectDir.description && /baidu_path:([^;]+)/.exec(selectDir.description)
      if (dirMatch && dirMatch[1]) return dirMatch[1]
    }
    return file_id
  }
  static async ApiCreatNewForder(
    user_id: string, drive_id: string,
    parent_file_id: string, creatDirName: string,
    encType: string = '', check_name_mode: string = 'refuse'
  ): Promise<{ file_id: string; error: string }> {
    const result = { file_id: '', error: '新建文件夹失败' }
    if (!user_id || !drive_id || !parent_file_id) return result
    if (isWebDavDrive(drive_id)) {
      const connectionId = getWebDavConnectionId(drive_id)
      const connection = getWebDavConnection(connectionId)
      if (!connection) return result
      const parentPath = parent_file_id.includes('root') ? '/' : parent_file_id
      const targetPath = normalizeWebDavPath(`${parentPath}/${creatDirName}`)
      try {
        await createWebDavDirectory(connection, targetPath)
        return { file_id: targetPath, error: '' }
      } catch (error: any) {
        return { file_id: '', error: error?.message || result.error }
      }
    }
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      if (parent_file_id.includes('root')) parent_file_id = '0'
      const resp = await apiCloud123Mkdir(user_id, parent_file_id, creatDirName)
      return { file_id: resp.file_id, error: resp.error }
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      if (parent_file_id.includes('root')) parent_file_id = '0'
      const resp = await apiDrive115Mkdir(user_id, parent_file_id, creatDirName)
      return { file_id: resp.file_id, error: resp.error }
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      if (parent_file_id.includes('root')) parent_file_id = '/'
      const dirPath = buildBaiduUploadPath(parent_file_id || '/', creatDirName)
      const rtype = check_name_mode === 'auto_rename' ? 1 : 0
      const resp = await apiBaiduCreateDir(user_id, dirPath, rtype)
      return { file_id: resp.path, error: resp.error }
    }
    if (parent_file_id.includes('root')) parent_file_id = 'root'
    const url = 'adrive/v2/file/createWithFolders'
    const name = EncodeEncName(user_id, creatDirName, true, encType)
    const postData = JSON.stringify({
      drive_id: drive_id,
      parent_file_id: parent_file_id,
      name: name,
      check_name_mode: check_name_mode,
      type: 'folder',
      description: encType
    })
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const file_id = resp.body.file_id as string | undefined
      if (file_id) return { file_id, error: '' }
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiCreatNewForder err=' + parent_file_id + ' ' + (resp.code || ''), resp.body)
    }
    if (resp.body?.code == 'QuotaExhausted.Drive') return { file_id: '', error: '网盘空间已满,无法创建' }
    if (resp.body?.code) return { file_id: '', error: resp.body?.code }
    return result
  }


  static async ApiTrashBatch(user_id: string, drive_id: string, file_idList: string[]): Promise<string[]> {
    if (isWebDavDrive(drive_id)) {
      return []
    }
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      return apiCloud123TrashBatch(user_id, file_idList)
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      return apiDrive115TrashBatch(user_id, file_idList)
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      const paths = AliFileCmd.ResolveBaiduPaths(file_idList)
      return apiBaiduDelete(user_id, paths)
    }
    const batchList = ApiBatchMaker('/recyclebin/trash', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id }
    })
    return ApiBatchSuccess('放入回收站', batchList, user_id, '')
  }


  static async ApiDeleteBatch(user_id: string, drive_id: string, file_idList: string[]): Promise<string[]> {
    if (isWebDavDrive(drive_id)) {
      const connection = getWebDavConnection(getWebDavConnectionId(drive_id))
      if (!connection) {
        message.error('WebDAV 连接不存在，请重新连接')
        return []
      }
      const successList: string[] = []
      for (const file_id of file_idList) {
        try {
          await deleteWebDavPath(connection, file_id)
          successList.push(file_id)
        } catch (error: any) {
          console.error('WebDAV 删除失败:', error)
        }
      }
      return successList
    }
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      message.error("暂不支持彻底删除，请移步至官方客户端操作")
      return []
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      message.error('115网盘不支持直接彻底删除，请先移入回收站后再删除')
      return []
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      const paths = AliFileCmd.ResolveBaiduPaths(file_idList)
      return apiBaiduDelete(user_id, paths)
    }
    const batchList = ApiBatchMaker('/file/delete', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id }
    })
    return ApiBatchSuccess('彻底删除', batchList, user_id, '')
  }


  static async ApiRenameBatch(user_id: string, drive_id: string, file_idList: string[], names: string[]): Promise<{
    file_id: string;
    parent_file_id: string;
    name: string;
    isDir: boolean
  }[]> {
    if (isWebDavDrive(drive_id)) {
      const connection = getWebDavConnection(getWebDavConnectionId(drive_id))
      if (!connection) return []
      const successList: { file_id: string; parent_file_id: string; name: string; isDir: boolean }[] = []
      for (let i = 0, maxi = file_idList.length; i < maxi; i++) {
        const file_id = file_idList[i]
        const name = names[i] || ''
        if (!file_id || !name) continue
        try {
          const targetPath = await renameWebDavPath(connection, file_id, name)
          successList.push({ file_id: targetPath, parent_file_id: normalizeWebDavPath(targetPath.split('/').slice(0, -1).join('/')), name, isDir: true })
        } catch (error) {
          console.error('WebDAV 重命名失败:', error)
        }
      }
      return successList
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      const successList: { file_id: string; parent_file_id: string; name: string; isDir: boolean }[] = []
      const pathList = AliFileCmd.ResolveBaiduPaths(file_idList)
      for (let i = 0, maxi = file_idList.length; i < maxi; i++) {
        const file_id = file_idList[i]
        const path = pathList[i] || file_id
        const name = names[i] || ''
        if (!path || !name) continue
        const resp = await apiBaiduRename(user_id, path, name)
        if (resp.length) {
          successList.push({ file_id, name, parent_file_id: '', isDir: true })
        }
      }
      return successList
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      const successList: { file_id: string; parent_file_id: string; name: string; isDir: boolean }[] = []
      for (let i = 0, maxi = file_idList.length; i < maxi; i++) {
        const file_id = file_idList[i]
        const name = names[i] || ''
        if (!file_id || !name) continue
        const resp = await apiDrive115Rename(user_id, file_id, name)
        if (resp.success) {
          successList.push({ file_id, name: resp.name, parent_file_id: '', isDir: true })
        }
      }
      return successList
    }
    const batchList = ApiBatchMaker2('/file/update', file_idList, names, (file_id: string, name: string) => {
      return { drive_id: drive_id, file_id: file_id, name: name, check_name_mode: 'refuse' }
    })

    if (batchList.length == 0) return Promise.resolve([])
    const successList: { file_id: string; parent_file_id: string; name: string; isDir: boolean }[] = []
    const result = await ApiBatch(file_idList.length <= 1 ? '' : '批量重命名', batchList, user_id, '')
    result.reslut.map((t) => successList.push({
      file_id: t.file_id!,
      name: t.name!,
      parent_file_id: t.parent_file_id!,
      isDir: t.type !== 'folder'
    }))
    return successList
  }


  static async ApiFavorBatch(user_id: string, drive_id: string, isfavor: boolean, ismessage: boolean, file_idList: string[]): Promise<string[]> {
    const batchList = ApiBatchMaker('/file/update', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id, custom_index_key: isfavor ? 'starred_yes' : '', starred: isfavor }
    })
    return ApiBatchSuccess(ismessage ? (isfavor ? '收藏文件' : '取消收藏') : '', batchList, user_id, '')
  }


  static async ApiTrashCleanBatch(user_id: string, drive_id: string, ismessage: boolean, file_idList: string[]): Promise<string[]> {
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      message.error("暂不支持彻底删除，请移步至官方客户端操作")
      return []
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      return apiDrive115TrashDelete(user_id, file_idList)
    }
    const batchList = ApiBatchMaker('/file/delete', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id }
    })
    return ApiBatchSuccess(ismessage ? '从回收站删除' : '', batchList, user_id, '')
  }


  static async ApiTrashRestoreBatch(user_id: string, drive_id: string, ismessage: boolean, file_idList: string[]): Promise<string[]> {
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      return apiCloud123RecoverBatch(user_id, file_idList)
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      return apiDrive115TrashRestore(user_id, file_idList)
    }
    const batchList = ApiBatchMaker('/recyclebin/restore', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id }
    })
    return ApiBatchSuccess(ismessage ? '从回收站还原' : '', batchList, user_id, '')
  }

  static async ApiFileHistoryBatch(user_id: string, drive_id: string, file_idList: string[]) {
    let allTask = []
    const loadingKey = 'filehistorybatch' + Date.now().toString()
    message.loading('清除历史 执行中...', 60, loadingKey)
    for (const file_id of file_idList) {
      allTask.push(AliFile.ApiUpdateVideoTime(user_id, drive_id, file_id, 0))
      if (allTask.length >= 3) {
        await Promise.all(allTask).catch()
        allTask = []
      }
    }
    if (allTask.length > 0) {
      await Promise.all(allTask).catch()
    }
    message.success('成功执行 清除历史', 1, loadingKey)
  }

  static async ApiFileColorBatch(user_id: string, drive_id: string, description: string, color: string, file_idList: string[]) {
    if (isWebDavDrive(drive_id)) return
    if (isCloud123User(user_id) || drive_id === 'cloud123') return
    if (isDrive115User(user_id) || drive_id === 'drive115') return
    if (isBaiduUser(user_id) || drive_id === 'baidu') return
    // 防止加密标记清空
    let parts = description.split(',') || []
    let encryptPart = parts.find((part: any) => part.includes('xbyEncrypt')) || ''
    let colorPart = parts.find((part: any) => /c.{6}$/.test(part)) || ''
    if (color) {
      if (color.includes('xbyEncrypt')) {
        encryptPart = color
      } else if (color === 'notEncrypt') {
        encryptPart = ''
      } else {
        colorPart = color
      }
    }
    color = color ? [encryptPart, colorPart].filter(Boolean).join(',') : encryptPart
    let batchList = ApiBatchMaker('/file/update', file_idList, (file_id: string) => {
      return { drive_id: drive_id, file_id: file_id, description: color }
    })
    let title = ''
    if (color == '' || color == 'notEncrypt') {
      title = '清除标记'
    } else if (color.includes('ce74c3c')) {
      title = ''
    } else if (color.includes('xbyEncrypt')) {
      title = '标记加密'
    }
    let successList = await ApiBatchSuccess(title, batchList, user_id, '')
    usePanFileStore().mColorFiles(color, successList)
  }


  static async ApiRecoverBatch(user_id: string, resumeList: {
    drive_id: string;
    file_id: string;
    content_hash: string;
    size: number;
    name: string
  }[]): Promise<string[] | string> {
    const successList: string[] = []
    if (!resumeList || resumeList.length == 0) return Promise.resolve(successList)

    const url = 'adrive/v1/file/resumeDeleted'
    const postData = JSON.stringify({ resume_file_list: resumeList })
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const task_id = resp.body.task_id as string
      if (!user_id || !task_id) return []
      for (let j = 0; j < 100; j++) {
        const url2 = 'adrive/v1/file/checkResumeTask'
        const resp2 = await AliHttp.Post(url2, { task_id }, user_id, '')
        if (AliHttp.IsSuccess(resp2.code)) {

          if (resp2.body.state == 'running') continue
          if (resp2.body.state == 'done') {
            const results = resp2.body.results as any[]
            if (results) {
              results.map((t: any) => {
                if (t.status && t.status == 200) successList.push(t.file_id)
                return true
              })
            }
            return successList
          }
        }
      }
    } else if (resp.code && resp.code == 403) {
      if (resp.body?.code == 'UserNotVip') return '文件恢复功能需要开通阿里云盘会员'
      else return resp.body?.code || '拒绝访问'
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiRecoverBatch err=' + (resp.code || ''), resp.body)
      return '操作失败'
    }
    return successList
  }


  static async ApiMoveBatch(user_id: string, drive_id: string, file_idList: string[], to_drive_id: string, to_parent_file_id: string, to_parent_description: string = ''): Promise<string[]> {
    if (isWebDavDrive(drive_id)) {
      if (drive_id !== to_drive_id) {
        message.error('WebDAV 暂不支持跨来源移动')
        return []
      }
      const connection = getWebDavConnection(getWebDavConnectionId(drive_id))
      if (!connection) return []
      const targetParent = to_parent_file_id.includes('root') ? '/' : normalizeWebDavPath(to_parent_file_id)
      const successList: string[] = []
      for (const file_id of file_idList) {
        try {
          const targetPath = normalizeWebDavPath(`${targetParent}/${file_id.split('/').pop() || ''}`)
          await moveWebDavPath(connection, file_id, targetPath)
          successList.push(file_id)
        } catch (error) {
          console.error('WebDAV 移动失败:', error)
        }
      }
      return successList
    }
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '0'
      return apiCloud123MoveBatch(user_id, file_idList, to_parent_file_id)
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '0'
      return apiDrive115MoveBatch(user_id, file_idList, to_parent_file_id)
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '/'
      to_parent_file_id = AliFileCmd.ResolveBaiduTargetPath(to_parent_file_id, to_parent_file_id, to_parent_description)
      const paths = AliFileCmd.ResolveBaiduPaths(file_idList)
      return apiBaiduMove(user_id, paths, to_parent_file_id)
    }
    if (to_parent_file_id.includes('root')) to_parent_file_id = 'root'
    const batchList = ApiBatchMaker('/file/move', file_idList, (file_id: string) => {
      if (drive_id == to_drive_id) return {
        drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_parent_file_id,
        auto_rename: true
      }
      else return {
        drive_id: drive_id,
        file_id: file_id,
        to_drive_id: to_drive_id,
        to_parent_file_id: to_parent_file_id,
        auto_rename: true
      }
    })
    return ApiBatchSuccess(file_idList.length <= 1 ? '移动' : '批量移动', batchList, user_id, '')
  }


  static async ApiCopyBatch(user_id: string, drive_id: string, file_idList: string[], to_drive_id: string, to_parent_file_id: string, to_parent_description: string = ''): Promise<string[]> {
    if (isWebDavDrive(drive_id)) {
      if (drive_id !== to_drive_id) {
        message.error('WebDAV 暂不支持跨来源复制')
        return []
      }
      const connection = getWebDavConnection(getWebDavConnectionId(drive_id))
      if (!connection) return []
      const targetParent = to_parent_file_id.includes('root') ? '/' : normalizeWebDavPath(to_parent_file_id)
      const successList: string[] = []
      for (const file_id of file_idList) {
        try {
          const targetPath = normalizeWebDavPath(`${targetParent}/${file_id.split('/').pop() || ''}`)
          await copyWebDavPath(connection, file_id, targetPath)
          successList.push(file_id)
        } catch (error) {
          console.error('WebDAV 复制失败:', error)
        }
      }
      return successList
    }
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '0'
      if (file_idList.length <= 1) {
        return apiCloud123CopySingle(user_id, file_idList[0], to_parent_file_id)
      }
      return apiCloud123CopyBatch(user_id, file_idList, to_parent_file_id)
    }
    if (isDrive115User(user_id) || drive_id === 'drive115') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '0'
      return apiDrive115CopyBatch(user_id, file_idList, to_parent_file_id)
    }
    if (isBaiduUser(user_id) || drive_id === 'baidu') {
      if (to_parent_file_id.includes('root')) to_parent_file_id = '/'
      to_parent_file_id = AliFileCmd.ResolveBaiduTargetPath(to_parent_file_id, to_parent_file_id, to_parent_description)
      const paths = AliFileCmd.ResolveBaiduPaths(file_idList)
      return apiBaiduCopy(user_id, paths, to_parent_file_id)
    }
    if (to_parent_file_id.includes('root')) to_parent_file_id = 'root'
    const batchList = ApiBatchMaker('/file/copy', file_idList, (file_id: string) => {
      if (drive_id == to_drive_id) return {
        drive_id: drive_id,
        file_id: file_id,
        to_parent_file_id: to_parent_file_id,
        auto_rename: true
      }
      else return {
        drive_id: drive_id,
        file_id: file_id,
        to_drive_id: to_drive_id,
        to_parent_file_id: to_parent_file_id,
        auto_rename: true
      }
    })
    return ApiBatchSuccess(file_idList.length <= 1 ? '复制' : '批量复制', batchList, user_id, '')
  }


  static async ApiGetFileBatch(user_id: string, drive_id: string, file_idList: string[]): Promise<IAliGetFileModel[]> {
    if (isCloud123User(user_id) || drive_id === 'cloud123') {
      if (file_idList.length === 1) {
        const detail = await apiCloud123FileDetail(user_id, file_idList[0])
        if (!detail) return []
        return [mapCloud123InfoToAliModel(detail)]
      }
      const list = await apiCloud123FileInfos(user_id, file_idList)
      return list.map((item) => mapCloud123InfoToAliModel(item))
    }
    const batchList = ApiBatchMaker('/file/get', file_idList, (file_id: string) => {
      return {
        drive_id: drive_id,
        file_id: file_id,
        url_expire_sec: 14400,
        office_thumbnail_process: 'image/resize,w_400/format,jpeg',
        image_thumbnail_process: 'image/resize,w_400/format,jpeg',
        image_url_process: 'image/resize,w_1920/format,jpeg',
        video_thumbnail_process: 'video/snapshot,t_106000,f_jpg,ar_auto,m_fast,w_400'
      }
    })
    const successList: IAliGetFileModel[] = []
    const result = await ApiBatch('', batchList, user_id, '')
    result.reslut.map((t) => {
      if (t.body) successList.push(AliDirFileList.getFileInfo(user_id, t.body as IAliFileItem, 'download_url'))
      return true
    })
    return successList
  }

  static async ApiGetFileDownloadUrlBatch(user_id: string, drive_id: string, file_idList: string[]): Promise<IDownloadUrl[]> {
    const batchList = ApiBatchMaker('/file/get_download_url', file_idList, (file_id: string) => {
      return {
        drive_id: drive_id,
        file_id: file_id,
        expire_sec: 14400
      }
    })
    const successList: IDownloadUrl[] = []
    const result = await ApiBatch('', batchList, user_id, '')
    result.reslut.map((t) => {
      if (t.body) successList.push(t.body as IDownloadUrl)
      return true
    })
    return successList
  }
}

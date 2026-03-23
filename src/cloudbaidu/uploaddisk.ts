import path from 'path'
import { OpenFileHandle } from '../utils/filehelper'
import { IUploadingUI } from '../utils/dbupload'
import UserDAL from '../user/userdal'
import { Sleep } from '../utils/format'
import AliUploadDisk from '../aliapi/uploaddisk'
import {
  apiBaiduCreateFile,
  apiBaiduLocateUpload,
  apiBaiduPrecreate,
  apiBaiduUploadPart,
  buildBaiduUploadPath,
  computeBaiduBlockList
} from './upload'

const mapCheckNameModeToRtype = (mode: string): number => {
  switch (mode) {
    case 'overwrite':
      return 1
    case 'auto_rename':
      return 2
    case 'refuse':
      return 0
    case 'ignore':
      return 1
    default:
      return 2
  }
}

const readSlice = async (filePath: string, start: number, size: number) => {
  const handle = await OpenFileHandle(filePath)
  if (handle.error || !handle.handle) return { error: handle.error || '打开文件失败', buff: Buffer.alloc(0) }
  const buff = Buffer.alloc(size)
  const read = await handle.handle.read(buff, 0, size, start)
  await handle.handle.close()
  return { error: '', buff: buff.subarray(0, read.bytesRead) }
}

export default class BaiduUploadDisk {
  static async UploadOneFile(fileui: IUploadingUI): Promise<string> {
    const token = await UserDAL.GetUserTokenFromDB(fileui.user_id)
    if (!token?.access_token) return '找不到上传token，请重试'

    const filePath = path.join(fileui.localFilePath, fileui.File.partPath)
    const remotePath = buildBaiduUploadPath(fileui.parent_file_id || '/', fileui.File.name)

    fileui.Info.uploadState = 'hashing'
    const fileHandle = await OpenFileHandle(filePath)
    if (fileHandle.error || !fileHandle.handle) return fileHandle.error || '打开文件失败'
    const { blockList, contentMd5, sliceMd5 } = await computeBaiduBlockList(fileHandle.handle, fileui.File.size)
    await fileHandle.handle.close()
    fileui.Info.uploadState = 'running'

    if (!blockList.length) return '计算文件hash失败'

    const rtype = mapCheckNameModeToRtype(fileui.check_name_mode)
    const precreate = await apiBaiduPrecreate(fileui.user_id, remotePath, fileui.File.size, blockList, contentMd5, sliceMd5, rtype)
    if (!precreate || precreate.errno !== 0) return '预上传失败'

    const uploadid = precreate.uploadid || ''
    if (!uploadid) {
      fileui.File.uploaded_file_id = remotePath
      fileui.File.uploaded_is_rapid = true
      return 'success'
    }

    if (precreate.return_type !== 2) {
      const locate = await apiBaiduLocateUpload(fileui.user_id, remotePath, uploadid)
      if (!locate || locate.errno !== 0 || !locate.host || locate.host.length === 0) return '获取上传服务器失败'
      const server = locate.host[0]
      const blockSize = 4 * 1024 * 1024
      const total = fileui.File.size
      let offset = 0
      let partseq = 0
      while (offset < total) {
        if (!fileui.IsRunning) return '已暂停'
        const size = Math.min(blockSize, total - offset)
        const slice = await readSlice(filePath, offset, size)
        if (slice.error) return slice.error
        let ok = false
        for (let i = 0; i < 3; i++) {
          ok = await apiBaiduUploadPart(server, token.access_token, remotePath, uploadid, partseq, slice.buff)
          if (ok) break
          await Sleep(800)
        }
        if (!ok) return '分片上传失败'
        offset += size
        AliUploadDisk.RecordUploadProgress(fileui.UploadID, size, offset)
        partseq += 1
      }
    }

    const create = await apiBaiduCreateFile(fileui.user_id, remotePath, fileui.File.size, uploadid, blockList, rtype)
    if (!create || create.errno !== 0) return '创建文件失败'
    fileui.File.uploaded_file_id = remotePath
    fileui.File.uploaded_is_rapid = precreate.return_type === 2
    return 'success'
  }
}

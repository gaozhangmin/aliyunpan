import crypto from 'crypto'
import nodehttps from 'https'
import type { ClientRequest } from 'http'
import path from 'path'
import { FileHandle } from 'fs/promises'
import { OpenFileHandle } from '../utils/filehelper'
import UserDAL from '../user/userdal'
import { IUploadingUI } from '../utils/dbupload'
import { cloud123CreateFile, cloud123UploadComplete, normalizeServer } from './upload'
import AliUploadDisk from '../aliapi/uploaddisk'
import { Sleep } from '../utils/format'

const md5Buffer = (buff: Buffer) => crypto.createHash('md5').update(buff).digest('hex')

const md5File = async (filePath: string): Promise<string> => {
  const hash = crypto.createHash('md5')
  const fh = await OpenFileHandle(filePath)
  if (fh.error || !fh.handle) return ''
  const handle = fh.handle
  const buff = Buffer.alloc(1024 * 1024)
  let pos = 0
  while (true) {
    const read = await handle.read(buff, 0, buff.length, pos)
    if (!read.bytesRead) break
    hash.update(buff.subarray(0, read.bytesRead))
    pos += read.bytesRead
  }
  await handle.close()
  return hash.digest('hex')
}

const buildMultipart = (preuploadID: string, sliceNo: number, sliceMD5: string, sliceBuff: Buffer) => {
  const boundary = '----xby123pan' + Date.now().toString(16) + Math.random().toString(16).slice(2)
  const parts: Buffer[] = []
  const pushField = (name: string, value: string) => {
    parts.push(Buffer.from(`--${boundary}\r\n`))
    parts.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`))
    parts.push(Buffer.from(`${value}\r\n`))
  }
  pushField('preuploadID', preuploadID)
  pushField('sliceNo', String(sliceNo))
  pushField('sliceMD5', sliceMD5)
  parts.push(Buffer.from(`--${boundary}\r\n`))
  parts.push(Buffer.from(`Content-Disposition: form-data; name="slice"; filename="slice"\r\n`))
  parts.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`))
  parts.push(sliceBuff)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
  const body = Buffer.concat(parts)
  return { body, boundary }
}

const uploadSlice = (server: string, accessToken: string, preuploadID: string, sliceNo: number, sliceMD5: string, sliceBuff: Buffer): Promise<boolean> => {
  return new Promise((resolve) => {
    const { body, boundary } = buildMultipart(preuploadID, sliceNo, sliceMD5, sliceBuff)
    const url = new URL(normalizeServer(server) + '/upload/v2/file/slice')
    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      protocol: url.protocol,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Platform: 'open_platform',
        Authorization: `Bearer ${accessToken}`
      }
    }
    const req: ClientRequest = nodehttps.request(options, (res) => {
      res.on('data', () => {})
      res.on('end', () => {
        resolve(res.statusCode === 200)
      })
    })
    req.on('error', () => resolve(false))
    req.write(body)
    req.end()
  })
}

const readSlice = async (fileHandle: FileHandle, start: number, size: number): Promise<Buffer> => {
  const buff = Buffer.alloc(size)
  const read = await fileHandle.read(buff, 0, size, start)
  return buff.subarray(0, read.bytesRead)
}

export default class Cloud123UploadDisk {
  static async UploadOneFile(fileui: IUploadingUI): Promise<string> {
    const token = await UserDAL.GetUserTokenFromDB(fileui.user_id)
    if (!token?.access_token) return '找不到上传token，请重试'

    const filePath = path.join(fileui.localFilePath, fileui.File.partPath)
    fileui.Info.uploadState = 'hashing'
    const etag = await md5File(filePath)
    fileui.Info.uploadState = 'running'
    if (!etag) return '计算md5失败'

    const parentFileID = Number(fileui.parent_file_id || 0) || 0
    const createResp = await cloud123CreateFile(
      fileui.user_id,
      parentFileID,
      fileui.File.name,
      etag,
      fileui.File.size,
      1,
      false
    )
    if (!createResp) return '创建文件失败'
    if (createResp.reuse) {
      fileui.File.uploaded_file_id = String(createResp.fileID || '')
      fileui.File.uploaded_is_rapid = true
      return 'success'
    }

    if (!createResp.preuploadID || !createResp.sliceSize || createResp.servers.length === 0) {
      return '创建文件返回信息不完整'
    }

    const server = createResp.servers[0]
    const fileHandle = await OpenFileHandle(filePath)
    if (fileHandle.error || !fileHandle.handle) return fileHandle.error || '打开文件失败'

    const sliceSize = createResp.sliceSize
    const total = fileui.File.size
    let offset = 0
    let sliceNo = 1
    while (offset < total) {
      if (!fileui.IsRunning) {
        await fileHandle.handle.close()
        return '已暂停'
      }
      const size = Math.min(sliceSize, total - offset)
      const buff = await readSlice(fileHandle.handle, offset, size)
      const sliceMD5 = md5Buffer(buff)
      let ok = false
      for (let i = 0; i < 3; i++) {
        ok = await uploadSlice(server, token.access_token, createResp.preuploadID, sliceNo, sliceMD5, buff)
        if (ok) break
        await Sleep(800)
      }
      if (!ok) {
        await fileHandle.handle.close()
        return '分片上传失败'
      }
      offset += size
      AliUploadDisk.RecordUploadProgress(fileui.UploadID, size, offset)
      sliceNo += 1
    }
    await fileHandle.handle.close()

    for (let i = 0; i < 60; i++) {
      const complete = await cloud123UploadComplete(server, token.access_token, createResp.preuploadID)
      if (complete.completed && complete.fileID) {
        fileui.File.uploaded_file_id = String(complete.fileID)
        fileui.File.uploaded_is_rapid = false
        return 'success'
      }
      await Sleep(1000)
    }
    return '上传完成确认超时'
  }
}

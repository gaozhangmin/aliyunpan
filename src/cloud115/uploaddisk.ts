import path from 'path'
import { OpenFileHandle } from '../utils/filehelper'
import { IUploadingUI } from '../utils/dbupload'
import AliUploadDisk from '../aliapi/uploaddisk'
import { Sleep } from '../utils/format'
import {
  apiDrive115GetUploadToken,
  apiDrive115UploadInit,
  apiDrive115UploadResume,
  build115Target,
  computePreSha1,
  computeRangeSha1,
  computeSha1
} from './upload'
import { apiDrive115FileList } from './dirfilelist'
import { apiDrive115TrashBatch } from './trash'
import { ossCompleteMultipart, ossInitiateMultipart, ossUploadPart } from './oss'

const PART_SIZE = 8 * 1024 * 1024

const parseSignCheck = (signCheck: string) => {
  const seg = signCheck.split('-')
  if (seg.length !== 2) return null
  const start = Number(seg[0])
  const end = Number(seg[1])
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  return { start, end }
}

const findConflictName = async (user_id: string, parentId: string | number, name: string) => {
  const targetId = parentId === '' || parentId === undefined || parentId === null ? 0 : Number(parentId)
  const limit = 200
  let offset = 0
  while (offset < 2000) {
    const list = await apiDrive115FileList(user_id, targetId, limit, offset, true)
    if (!list.length) break
    const hit = list.find((item) => item.fn === name)
    if (hit) return { conflict: true, file_id: String(hit.fid) }
    if (list.length < limit) break
    offset += limit
  }
  return { conflict: false, file_id: '' }
}

const ensureUploadName = async (user_id: string, parentId: string | number, originName: string, mode: string) => {
  const conflict = await findConflictName(user_id, parentId, originName)
  if (!conflict.conflict) return { name: originName, error: '' }

  if (mode === 'refuse') {
    return { name: originName, error: '同名文件已存在' }
  }

  if (mode === 'overwrite' || mode === 'ignore') {
    if (conflict.file_id) {
      await apiDrive115TrashBatch(user_id, [conflict.file_id], String(parentId || 0))
    }
    return { name: originName, error: '' }
  }

  if (mode === 'auto_rename') {
    const extIndex = originName.lastIndexOf('.')
    const base = extIndex > 0 ? originName.slice(0, extIndex) : originName
    const ext = extIndex > 0 ? originName.slice(extIndex) : ''
    let index = 1
    while (index < 1000) {
      const candidate = `${base} (${index})${ext}`
      const candidateConflict = await findConflictName(user_id, parentId, candidate)
      if (!candidateConflict.conflict) return { name: candidate, error: '' }
      index += 1
    }
    return { name: originName, error: '自动重命名失败' }
  }

  return { name: originName, error: '' }
}

export default class Drive115UploadDisk {
  static async UploadOneFile(fileui: IUploadingUI): Promise<string> {
    const filePath = path.join(fileui.localFilePath, fileui.File.partPath)
    const handle = await OpenFileHandle(filePath)
    if (handle.error || !handle.handle) return handle.error || '打开文件失败'

    fileui.Info.uploadState = 'hashing'
    const fileSha1 = await computeSha1(handle.handle, fileui.File.size)
    const preSha1 = await computePreSha1(handle.handle, fileui.File.size)
    fileui.Info.uploadState = 'running'
    await handle.handle.close()

    if (!fileSha1) return '计算 sha1 失败'

    const rename = await ensureUploadName(fileui.user_id, fileui.parent_file_id || 0, fileui.File.name, fileui.check_name_mode)
    if (rename.error) return rename.error
    const target = build115Target(fileui.parent_file_id || 0)
    let initResp = null
    if (fileui.Info.up_upload_id) {
      initResp = await apiDrive115UploadResume(fileui.user_id, fileui.File.size, target, fileSha1, fileui.Info.up_upload_id)
    }
    if (!initResp) {
      initResp = await apiDrive115UploadInit(
        fileui.user_id,
        rename.name,
        fileui.File.size,
        target,
        fileSha1,
        preSha1
      )
    }
    if (!initResp || !initResp.data) return '上传初始化失败'

    if (initResp.data.sign_key && initResp.data.sign_check) {
      const range = parseSignCheck(initResp.data.sign_check)
      if (!range) return '签名验证失败'
      const rangeHandle = await OpenFileHandle(filePath)
      if (rangeHandle.error || !rangeHandle.handle) return rangeHandle.error || '打开文件失败'
      const rangeSha1 = await computeRangeSha1(rangeHandle.handle, range.start, range.end)
      await rangeHandle.handle.close()
      const signVal = rangeSha1.toUpperCase()
      initResp = await apiDrive115UploadInit(
        fileui.user_id,
        rename.name,
        fileui.File.size,
        target,
        fileSha1,
        preSha1,
        '',
        '0',
        initResp.data.sign_key,
        signVal
      )
      if (!initResp || !initResp.data) return '上传认证失败'
    }

    const data = initResp.data
    if (data.status === 2) {
      fileui.File.uploaded_file_id = data.file_id || ''
      fileui.File.uploaded_is_rapid = true
      return 'success'
    }

    if (!data.pick_code) return '上传初始化失败'
    fileui.Info.up_upload_id = data.pick_code

    const tokenList = await apiDrive115GetUploadToken(fileui.user_id)
    if (!tokenList || tokenList.length === 0) return '获取上传凭证失败'
    const token = tokenList[0]
    if (!token.endpoint || !token.AccessKeyId || !token.AccessKeySecrett || !token.SecurityToken) {
      return '上传凭证信息不完整'
    }
    if (!data.bucket || !data.object) return '上传初始化信息不完整'

    const init = await ossInitiateMultipart(
      {
        endpoint: token.endpoint,
        accessKeyId: token.AccessKeyId,
        accessKeySecret: token.AccessKeySecrett,
        securityToken: token.SecurityToken
      },
      data.bucket,
      data.object,
      { callback: data.callback, callback_var: data.callback_var }
    )
    if (init.status !== 200) return 'OSS 初始化失败'

    const uploadIdMatch = init.body.match(/<UploadId>(.+)<\/UploadId>/i)
    if (!uploadIdMatch) return 'OSS 初始化失败'
    const uploadId = uploadIdMatch[1]

    const parts: { partNumber: number; etag: string }[] = []
    const partHandle = await OpenFileHandle(filePath)
    if (partHandle.error || !partHandle.handle) return partHandle.error || '打开文件失败'
    let offset = 0
    let partNumber = 1
    while (offset < fileui.File.size) {
      if (!fileui.IsRunning) {
        await partHandle.handle.close()
        return '已暂停'
      }
      const size = Math.min(PART_SIZE, fileui.File.size - offset)
      const buff = Buffer.alloc(size)
      const read = await partHandle.handle.read(buff, 0, size, offset)
      const body = buff.subarray(0, read.bytesRead)
      let ok = false
      let etag = ''
      for (let i = 0; i < 3; i++) {
        const resp = await ossUploadPart(
          {
            endpoint: token.endpoint,
            accessKeyId: token.AccessKeyId,
            accessKeySecret: token.AccessKeySecrett,
            securityToken: token.SecurityToken
          },
          data.bucket,
          data.object,
          uploadId,
          partNumber,
          body
        )
        if (resp.status === 200 && resp.etag) {
          ok = true
          etag = resp.etag.replace(/\"/g, '')
          break
        }
        await Sleep(800)
      }
      if (!ok) {
        await partHandle.handle.close()
        return '分片上传失败'
      }
      parts.push({ partNumber, etag })
      offset += size
      AliUploadDisk.RecordUploadProgress(fileui.UploadID, size, offset)
      partNumber += 1
    }
    await partHandle.handle.close()

    const complete = await ossCompleteMultipart(
      {
        endpoint: token.endpoint,
        accessKeyId: token.AccessKeyId,
        accessKeySecret: token.AccessKeySecrett,
        securityToken: token.SecurityToken
      },
      data.bucket,
      data.object,
      uploadId,
      parts,
      { callback: data.callback, callback_var: data.callback_var }
    )
    if (complete.status !== 200) return 'OSS 合并失败'

    fileui.File.uploaded_file_id = data.file_id || ''
    fileui.File.uploaded_is_rapid = false
    return 'success'
  }
}

import crypto from 'crypto'
import path from 'path'
import { FileHandle } from 'fs/promises'
import UserDAL from '../user/userdal'
import message from '../utils/message'

const API_BASE = 'https://proapi.115.com'

export type Drive115UploadInitData = {
  pick_code?: string
  status?: number
  sign_key?: string
  sign_check?: string
  file_id?: string
  target?: string
  bucket?: string
  object?: string
  callback?: string
  callback_var?: string
}

export type Drive115UploadInitResp = {
  state: boolean
  code: number
  message: string
  data?: Drive115UploadInitData
}

export type Drive115UploadTokenItem = {
  endpoint?: string
  AccessKeySecrett?: string
  AccessKeyId?: string
  SecurityToken?: string
  Expiration?: string
}

export type Drive115UploadTokenResp = {
  state: boolean
  code: number
  message: string
  data?: Drive115UploadTokenItem[]
}

const buildFormData = (fields: Record<string, string>) => {
  const boundary = '----xby115' + Date.now().toString(16) + Math.random().toString(16).slice(2)
  const chunks: Buffer[] = []
  const pushField = (name: string, value: string) => {
    chunks.push(Buffer.from(`--${boundary}\r\n`))
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`))
    chunks.push(Buffer.from(`${value}\r\n`))
  }
  Object.keys(fields).forEach((key) => {
    const val = fields[key]
    if (val !== undefined && val !== null && val !== '') pushField(key, String(val))
  })
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return { body: Buffer.concat(chunks), boundary }
}

const sha1Buffer = (buff: Buffer) => crypto.createHash('sha1').update(buff).digest('hex')

export const computeSha1 = async (fileHandle: FileHandle, size: number) => {
  const hash = crypto.createHash('sha1')
  const buff = Buffer.alloc(1024 * 1024)
  let offset = 0
  while (offset < size) {
    const read = await fileHandle.read(buff, 0, buff.length, offset)
    if (!read.bytesRead) break
    hash.update(buff.subarray(0, read.bytesRead))
    offset += read.bytesRead
  }
  return hash.digest('hex')
}

export const computePreSha1 = async (fileHandle: FileHandle, size: number) => {
  const len = Math.min(128 * 1024, size)
  if (len <= 0) return sha1Buffer(Buffer.alloc(0))
  const buff = Buffer.alloc(len)
  const read = await fileHandle.read(buff, 0, len, 0)
  return sha1Buffer(buff.subarray(0, read.bytesRead))
}

export const computeRangeSha1 = async (fileHandle: FileHandle, start: number, end: number) => {
  const size = end - start + 1
  const buff = Buffer.alloc(size)
  const read = await fileHandle.read(buff, 0, size, start)
  return sha1Buffer(buff.subarray(0, read.bytesRead))
}

export const build115Target = (parentId: string | number) => {
  const id = parentId === undefined || parentId === null || parentId === '' ? 0 : Number(parentId)
  return `U_1_${Number.isFinite(id) ? id : 0}`
}

export const apiDrive115GetUploadToken = async (user_id: string): Promise<Drive115UploadTokenItem[] | null> => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    message.error('未登录 115 网盘')
    return null
  }
  const url = `${API_BASE}/open/upload/get_token`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  })
  if (!resp.ok) return null
  const data = (await resp.json()) as Drive115UploadTokenResp
  if (!data?.state || data?.code !== 0 || !Array.isArray(data.data)) return null
  return data.data
}

export const apiDrive115UploadInit = async (
  user_id: string,
  fileName: string,
  fileSize: number,
  target: string,
  fileSha1: string,
  preSha1: string,
  pickCode: string = '',
  topupload: string = '0',
  signKey: string = '',
  signVal: string = ''
): Promise<Drive115UploadInitResp | null> => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    message.error('未登录 115 网盘')
    return null
  }
  const url = `${API_BASE}/open/upload/init`
  const fields: Record<string, string> = {
    file_name: path.basename(fileName),
    file_size: String(fileSize),
    target,
    fileid: fileSha1
  }
  if (preSha1) fields.preid = preSha1
  if (pickCode) fields.pick_code = pickCode
  if (topupload !== '') fields.topupload = topupload
  if (signKey) fields.sign_key = signKey
  if (signVal) fields.sign_val = signVal
  const { body, boundary } = buildFormData(fields)
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  })
  if (!resp.ok) return null
  const data = (await resp.json()) as Drive115UploadInitResp
  return data
}

export const apiDrive115UploadResume = async (
  user_id: string,
  fileSize: number,
  target: string,
  fileSha1: string,
  pickCode: string
): Promise<Drive115UploadInitResp | null> => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    message.error('未登录 115 网盘')
    return null
  }
  const url = `${API_BASE}/open/upload/resume`
  const fields: Record<string, string> = {
    file_size: String(fileSize),
    target,
    fileid: fileSha1,
    pick_code: pickCode
  }
  const { body, boundary } = buildFormData(fields)
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  })
  if (!resp.ok) return null
  const data = (await resp.json()) as Drive115UploadInitResp
  return data
}


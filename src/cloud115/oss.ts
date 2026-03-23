import crypto from 'crypto'
import nodehttps from 'https'
import type { ClientRequest } from 'http'

export type OssCredentials = {
  endpoint: string
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
}

const normalizeEndpoint = (endpoint: string) => {
  if (!endpoint) return ''
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint
  return `https://${endpoint}`
}

const buildHostInfo = (endpoint: string, bucket: string) => {
  const url = new URL(normalizeEndpoint(endpoint))
  const host = url.hostname.startsWith(`${bucket}.`) ? url.hostname : `${bucket}.${url.hostname}`
  return { protocol: url.protocol, host }
}

const hmacSha1 = (key: string, data: string) => crypto.createHmac('sha1', key).update(data).digest('base64')

const canonicalizeHeaders = (headers: Record<string, string>) => {
  const keys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .filter((k) => k.startsWith('x-oss-'))
    .sort()
  return keys.map((k) => `${k}:${headers[k] ?? headers[k.toLowerCase()]}`).join('\n') + (keys.length ? '\n' : '')
}

const canonicalizeResource = (bucket: string, object: string, params?: Record<string, string | undefined>) => {
  let resource = `/${bucket}/${object}`
  if (params) {
    const keys = Object.keys(params).filter((k) => params[k] !== undefined).sort()
    if (keys.length) {
      const query = keys.map((k) => (params[k] ? `${k}=${params[k]}` : k)).join('&')
      resource += `?${query}`
    }
  }
  return resource
}

const buildAuthorization = (
  method: string,
  bucket: string,
  object: string,
  headers: Record<string, string>,
  params?: Record<string, string | undefined>
) => {
  const contentMd5 = headers['Content-MD5'] || ''
  const contentType = headers['Content-Type'] || ''
  const date = headers['Date'] || ''
  const ossHeaders = canonicalizeHeaders(headers)
  const resource = canonicalizeResource(bucket, object, params)
  const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${ossHeaders}${resource}`
  return stringToSign
}

export const ossInitiateMultipart = async (
  cred: OssCredentials,
  bucket: string,
  object: string,
  callback?: { callback?: string; callback_var?: string }
) => {
  const { protocol, host } = buildHostInfo(cred.endpoint, bucket)
  const params = { uploads: '' }
  const headers: Record<string, string> = {
    Date: new Date().toUTCString(),
    'Content-Type': 'application/xml'
  }
  if (cred.securityToken) headers['x-oss-security-token'] = cred.securityToken
  if (callback?.callback) headers['x-oss-callback'] = callback.callback
  if (callback?.callback_var) headers['x-oss-callback-var'] = callback.callback_var
  const stringToSign = buildAuthorization('POST', bucket, object, headers, params)
  headers.Authorization = `OSS ${cred.accessKeyId}:${hmacSha1(cred.accessKeySecret, stringToSign)}`

  const urlPath = `/${object}?uploads`
  const resp = await new Promise<{ status: number; body: string }>((resolve) => {
    const req: ClientRequest = nodehttps.request({
      method: 'POST',
      protocol,
      hostname: host,
      path: urlPath,
      headers
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode || 0, body: raw }))
    })
    req.on('error', () => resolve({ status: 0, body: '' }))
    req.end()
  })
  return resp
}

export const ossUploadPart = async (
  cred: OssCredentials,
  bucket: string,
  object: string,
  uploadId: string,
  partNumber: number,
  body: Buffer
) => {
  const { protocol, host } = buildHostInfo(cred.endpoint, bucket)
  const params = { partNumber: String(partNumber), uploadId }
  const headers: Record<string, string> = {
    Date: new Date().toUTCString(),
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(body.length)
  }
  if (cred.securityToken) headers['x-oss-security-token'] = cred.securityToken
  const stringToSign = buildAuthorization('PUT', bucket, object, headers, params)
  headers.Authorization = `OSS ${cred.accessKeyId}:${hmacSha1(cred.accessKeySecret, stringToSign)}`
  const urlPath = `/${object}?partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`
  const resp = await new Promise<{ status: number; etag: string }>((resolve) => {
    const req: ClientRequest = nodehttps.request({
      method: 'PUT',
      protocol,
      hostname: host,
      path: urlPath,
      headers
    }, (res) => {
      res.on('data', () => {})
      res.on('end', () => {
        const etag = (res.headers.etag as string) || ''
        resolve({ status: res.statusCode || 0, etag })
      })
    })
    req.on('error', () => resolve({ status: 0, etag: '' }))
    req.write(body)
    req.end()
  })
  return resp
}

export const ossCompleteMultipart = async (
  cred: OssCredentials,
  bucket: string,
  object: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
  callback?: { callback?: string; callback_var?: string }
) => {
  const { protocol, host } = buildHostInfo(cred.endpoint, bucket)
  const params = { uploadId }
  const bodyXml = ['<CompleteMultipartUpload>']
  parts.forEach((part) => {
    bodyXml.push('<Part>')
    bodyXml.push(`<PartNumber>${part.partNumber}</PartNumber>`)
    bodyXml.push(`<ETag>${part.etag}</ETag>`)
    bodyXml.push('</Part>')
  })
  bodyXml.push('</CompleteMultipartUpload>')
  const body = Buffer.from(bodyXml.join(''))
  const headers: Record<string, string> = {
    Date: new Date().toUTCString(),
    'Content-Type': 'application/xml',
    'Content-Length': String(body.length)
  }
  if (cred.securityToken) headers['x-oss-security-token'] = cred.securityToken
  if (callback?.callback) headers['x-oss-callback'] = callback.callback
  if (callback?.callback_var) headers['x-oss-callback-var'] = callback.callback_var
  const stringToSign = buildAuthorization('POST', bucket, object, headers, params)
  headers.Authorization = `OSS ${cred.accessKeyId}:${hmacSha1(cred.accessKeySecret, stringToSign)}`
  const urlPath = `/${object}?uploadId=${encodeURIComponent(uploadId)}`
  const resp = await new Promise<{ status: number; body: string }>((resolve) => {
    const req: ClientRequest = nodehttps.request({
      method: 'POST',
      protocol,
      hostname: host,
      path: urlPath,
      headers
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode || 0, body: raw }))
    })
    req.on('error', () => resolve({ status: 0, body: '' }))
    req.write(body)
    req.end()
  })
  return resp
}


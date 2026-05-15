import { randomUUID } from 'node:crypto'

const BASE_API = 'https://api.aliyundrive.com/'
const BASE_OPEN_API = 'https://openapi.alipan.com/'

function resolveUrl(path) {
  if (path.startsWith('http')) return path
  if (path.includes('adrive/v1.0') || path.includes('adrive/v1.1')) return BASE_OPEN_API + path
  return BASE_API + path
}

function buildHeaders(token, url) {
  const isOpen = url.startsWith(BASE_OPEN_API)
  const headers = { 'Content-Type': 'application/json' }
  if (isOpen && token.open_api_access_token) {
    headers['Authorization'] = `${token.open_api_token_type || 'Bearer'} ${token.open_api_access_token}`
  } else {
    headers['Authorization'] = `Bearer ${token.access_token}`
    if (token.device_id) headers['x-device-id'] = token.device_id
    if (token.signature) headers['x-signature'] = token.signature
    headers['x-request-id'] = randomUUID()
  }
  return headers
}

export async function aliPost(path, body, token) {
  const url = resolveUrl(path)
  const resp = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(token, url),
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Aliyun API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_ALIYUN_HTTP'
    err.status = resp.status
    throw err
  }
  return resp.json()
}

export async function aliRefreshToken(token) {
  const resp = await fetch('https://auth.aliyundrive.com/v2/account/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token.refresh_token, grant_type: 'refresh_token' }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Token refresh failed ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_ALIYUN_AUTH'
    throw err
  }
  const data = await resp.json()
  return {
    ...token,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expire_time: data.expire_time,
    token_type: data.token_type || 'Bearer',
    default_drive_id: data.default_drive_id || token.default_drive_id,
    backup_drive_id: data.backup_drive_id || token.backup_drive_id,
    resource_drive_id: data.resource_drive_id || token.resource_drive_id,
    user_id: data.user_id || token.user_id,
    user_name: data.user_name || token.user_name,
    nick_name: data.nick_name || token.nick_name,
  }
}

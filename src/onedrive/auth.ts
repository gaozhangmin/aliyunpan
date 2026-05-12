import type { ITokenInfo } from '../user/userstore'
import { humanSize } from '../utils/format'
import message from '../utils/message'

const ONEDRIVE_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const ONEDRIVE_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const ONEDRIVE_ME_URL = 'https://graph.microsoft.com/v1.0/me'
const ONEDRIVE_DRIVE_URL = 'https://graph.microsoft.com/v1.0/me/drive'
const ONEDRIVE_REDIRECT_URL = 'boxplayer-onedriveoauth://callback'
export const ONEDRIVE_SCOPE = 'offline_access Files.ReadWrite User.Read'
export const ONEDRIVE_CLIENT_ID = ''
export const ONEDRIVE_CLIENT_SECRET = ''

const hashString = (value: string): string => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const sha256 = async (value: string): Promise<Uint8Array> => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return new Uint8Array(digest)
}

export const createOneDrivePkceVerifier = (): string => {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export const buildOneDriveAuthUrl = async (clientId: string, verifier: string, state = `boxplayer_${Date.now()}`): Promise<string> => {
  const challenge = base64UrlEncode(await sha256(verifier))
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'code',
    redirect_uri: ONEDRIVE_REDIRECT_URL,
    response_mode: 'query',
    scope: ONEDRIVE_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  })
  return `${ONEDRIVE_AUTH_URL}?${params.toString()}`
}

const emptyToken = (): ITokenInfo => ({
  tokenfrom: 'onedrive',
  access_token: '',
  refresh_token: '',
  session_expires_in: 0,
  open_api_token_type: '',
  open_api_access_token: '',
  open_api_refresh_token: '',
  open_api_expires_in: 0,
  signature: '',
  device_id: '',
  expires_in: 0,
  token_type: 'Bearer',
  user_id: '',
  user_name: 'OneDrive',
  avatar: '',
  nick_name: 'OneDrive',
  default_drive_id: 'onedrive',
  default_sbox_drive_id: '',
  resource_drive_id: '',
  backup_drive_id: '',
  sbox_drive_id: '',
  role: '',
  status: '',
  expire_time: '',
  state: '',
  pin_setup: false,
  is_first_login: false,
  need_rp_verify: false,
  name: 'OneDrive',
  spu_id: '',
  is_expires: false,
  used_size: 0,
  total_size: 0,
  free_size: 0,
  space_expire: false,
  spaceinfo: '',
  vipname: '',
  vipIcon: '',
  vipexpire: '',
  pic_drive_id: '',
  signInfo: { signMon: -1, signDay: -1 }
})

const graphJson = async <T>(url: string, init: RequestInit, fallback: string): Promise<T | null> => {
  const resp = await fetch(url, init)
  const data = await resp.json().catch(() => undefined)
  if (!resp.ok || data?.error) {
    message.error(data?.error_description || data?.error?.message || fallback)
    return null
  }
  return data as T
}

const applyOneDriveAccount = async (token: ITokenInfo) => {
  const headers = {
    Authorization: `Bearer ${token.access_token}`
  }
  const account = await graphJson<any>(ONEDRIVE_ME_URL, { method: 'GET', headers }, '获取 OneDrive 账号信息失败')
  if (account) {
    const accountId = account.id || hashString(token.refresh_token || token.access_token)
    token.user_id = `onedrive_${accountId}`
    token.user_name = account.displayName || account.userPrincipalName || token.user_name
    token.nick_name = account.displayName || token.nick_name
    token.name = token.user_name
  }

  const drive = await graphJson<any>(ONEDRIVE_DRIVE_URL, { method: 'GET', headers }, '获取 OneDrive 空间信息失败')
  if (drive) {
    token.default_drive_id = 'onedrive'
    const total = Number(drive.quota?.total || 0)
    const used = Number(drive.quota?.used || 0)
    token.used_size = used
    token.total_size = total
    token.free_size = total > used ? total - used : 0
    if (total || used) token.spaceinfo = `${humanSize(used)} / ${humanSize(total)}`
  }
}

const normalizeOneDriveToken = (data: any, clientId: string): ITokenInfo | null => {
  if (!data?.access_token) return null
  const token = emptyToken()
  token.access_token = data.access_token
  token.refresh_token = data.refresh_token || ''
  token.expires_in = Number(data.expires_in || 3600)
  token.token_type = data.token_type || 'Bearer'
  token.device_id = clientId.trim()
  token.user_id = `onedrive_${hashString(data.refresh_token || data.access_token)}`
  token.expire_time = new Date(Date.now() + token.expires_in * 1000).toISOString()
  return token
}

export const exchangeOneDriveCodeForToken = async (code: string, clientId: string, verifier: string): Promise<ITokenInfo | null> => {
  const body = new URLSearchParams({
    client_id: clientId.trim(),
    scope: ONEDRIVE_SCOPE,
    code,
    redirect_uri: ONEDRIVE_REDIRECT_URL,
    grant_type: 'authorization_code',
    code_verifier: verifier
  })
  if (ONEDRIVE_CLIENT_SECRET.trim()) body.set('client_secret', ONEDRIVE_CLIENT_SECRET.trim())
  const data = await graphJson<any>(ONEDRIVE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }, '获取 OneDrive access_token 失败')
  const token = normalizeOneDriveToken(data, clientId)
  if (token) {
    await applyOneDriveAccount(token)
    const { default: UserDAL } = await import('../user/userdal')
    UserDAL.SaveUserToken(token)
  }
  return token
}

export const refreshOneDriveAccessToken = async (token: ITokenInfo): Promise<ITokenInfo | null> => {
  const clientId = token.device_id || ONEDRIVE_CLIENT_ID
  if (!clientId || !token.refresh_token) return null
  const body = new URLSearchParams({
    client_id: clientId.trim(),
    scope: ONEDRIVE_SCOPE,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  })
  if (ONEDRIVE_CLIENT_SECRET.trim()) body.set('client_secret', ONEDRIVE_CLIENT_SECRET.trim())
  const data = await graphJson<any>(ONEDRIVE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }, '刷新 OneDrive Token 失败')
  if (!data?.access_token) return null
  token.access_token = data.access_token
  if (data.refresh_token) token.refresh_token = data.refresh_token
  token.expires_in = Number(data.expires_in || token.expires_in || 3600)
  token.token_type = data.token_type || token.token_type || 'Bearer'
  token.expire_time = new Date(Date.now() + token.expires_in * 1000).toISOString()
  token.tokenfrom = 'onedrive'
  token.default_drive_id = token.default_drive_id || 'onedrive'
  await applyOneDriveAccount(token)
  return token
}

export const applyOneDriveQuota = async (token: ITokenInfo): Promise<boolean> => {
  if (!token.access_token) return false
  await applyOneDriveAccount(token)
  return true
}

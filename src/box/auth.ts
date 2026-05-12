import type { ITokenInfo } from '../user/userstore'
import { humanSize } from '../utils/format'
import message from '../utils/message'

const BOX_AUTH_URL = 'https://account.box.com/api/oauth2/authorize'
const BOX_TOKEN_URL = 'https://api.box.com/oauth2/token'
const BOX_ME_URL = 'https://api.box.com/2.0/users/me'
export const BOX_DEFAULT_REDIRECT_URL = 'xbyboxplayer-oauth://callback'
export const BOX_SCOPE = 'root_readwrite'
export const BOX_CLIENT_ID = ''
export const BOX_CLIENT_SECRET = ''

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

export const createBoxPkceVerifier = (): string => {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export const buildBoxAuthUrl = async (
  clientId: string,
  verifier: string,
  state = `boxplayer_${Date.now()}`
): Promise<string> => {
  const challenge = base64UrlEncode(await sha256(verifier))
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: 'code',
    redirect_uri: BOX_DEFAULT_REDIRECT_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: BOX_SCOPE,
    state
  })
  return `${BOX_AUTH_URL}?${params.toString()}`
}

const emptyToken = (): ITokenInfo => ({
  tokenfrom: 'box',
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
  user_name: 'Box',
  avatar: '',
  nick_name: 'Box',
  default_drive_id: 'box',
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
  name: 'Box',
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

const boxJson = async <T>(url: string, init: RequestInit, fallback: string): Promise<T | null> => {
  const resp = await fetch(url, init)
  const data = await resp.json().catch(() => undefined)
  if (!resp.ok || data?.error) {
    message.error(data?.error_description || data?.message || fallback)
    return null
  }
  return data as T
}

const applyBoxAccount = async (token: ITokenInfo) => {
  const account = await boxJson<any>(`${BOX_ME_URL}?fields=id,name,login,avatar_url,space_amount,space_used`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  }, '获取 Box 账号信息失败')
  if (!account) return
  token.user_id = `box_${account.id || hashString(token.refresh_token || token.access_token)}`
  token.user_name = account.name || account.login || token.user_name
  token.nick_name = account.name || token.nick_name
  token.name = token.user_name
  token.avatar = account.avatar_url || token.avatar
  const total = Number(account.space_amount || 0)
  const used = Number(account.space_used || 0)
  token.used_size = used
  token.total_size = total
  token.free_size = total > used ? total - used : 0
  if (total || used) token.spaceinfo = `${humanSize(used)} / ${humanSize(total)}`
}

const normalizeBoxToken = (data: any, clientId: string): ITokenInfo | null => {
  if (!data?.access_token) return null
  const token = emptyToken()
  token.access_token = data.access_token
  token.refresh_token = data.refresh_token || ''
  token.expires_in = Number(data.expires_in || 3600)
  token.token_type = data.token_type || 'Bearer'
  token.device_id = clientId.trim()
  token.user_id = `box_${hashString(data.refresh_token || data.access_token)}`
  token.expire_time = new Date(Date.now() + token.expires_in * 1000).toISOString()
  return token
}

export const exchangeBoxCodeForToken = async (
  code: string,
  clientId: string,
  verifier: string
): Promise<ITokenInfo | null> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId.trim(),
    redirect_uri: BOX_DEFAULT_REDIRECT_URL,
    code_verifier: verifier
  })
  if (BOX_CLIENT_SECRET.trim()) body.set('client_secret', BOX_CLIENT_SECRET.trim())
  const data = await boxJson<any>(BOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }, '获取 Box access_token 失败')
  const token = normalizeBoxToken(data, clientId)
  if (token) {
    await applyBoxAccount(token)
    const { default: UserDAL } = await import('../user/userdal')
    UserDAL.SaveUserToken(token)
  }
  return token
}

export const refreshBoxAccessToken = async (token: ITokenInfo): Promise<ITokenInfo | null> => {
  const clientId = token.device_id || BOX_CLIENT_ID
  if (!clientId || !token.refresh_token) return null
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: clientId
  })
  if (BOX_CLIENT_SECRET.trim()) body.set('client_secret', BOX_CLIENT_SECRET.trim())
  const data = await boxJson<any>(BOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }, '刷新 Box Token 失败')
  if (!data?.access_token) return null
  token.access_token = data.access_token
  if (data.refresh_token) token.refresh_token = data.refresh_token
  token.expires_in = Number(data.expires_in || token.expires_in || 3600)
  token.token_type = data.token_type || token.token_type || 'Bearer'
  token.expire_time = new Date(Date.now() + token.expires_in * 1000).toISOString()
  token.tokenfrom = 'box'
  token.default_drive_id = token.default_drive_id || 'box'
  await applyBoxAccount(token)
  return token
}

export const applyBoxQuota = async (token: ITokenInfo): Promise<boolean> => {
  if (!token.access_token) return false
  await applyBoxAccount(token)
  return true
}

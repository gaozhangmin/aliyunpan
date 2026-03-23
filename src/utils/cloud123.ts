import { ITokenInfo } from '../user/userstore'
import UserDAL from '../user/userdal'
import message from './message'
import Config from '../config'

const CLOUD123_AUTH_URL = 'https://www.123pan.com/auth'
const CLOUD123_ACCESS_TOKEN_URL = 'https://open-api.123pan.com/api/v1/oauth2/access_token'
const CLOUD123_USER_INFO_URL = 'https://open-api.123pan.com/api/v1/user/info'

const CLOUD123_APP_ID = Config.PAN123_APP_ID
const CLOUD123_APP_SECRET = Config.PAN123_APP_SECRET
const CLOUD123_REDIRECT_URL = 'xbyboxplayer-oauth://callback'

const CLOUD123_SCOPE = 'user:base,file:all:read,file:all:write'

const base64UrlDecode = (input: string): string => {
  const pad = '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
  } catch {
    return ''
  }
}

const parseJwtPayload = (token: string): Record<string, any> | null => {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json)
  } catch {
    return null
  }
}

const hashString = (value: string): string => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export const buildCloud123AuthUrl = () => {
  const params = new URLSearchParams({
    client_id: CLOUD123_APP_ID,
    redirect_uri: CLOUD123_REDIRECT_URL,
    scope: CLOUD123_SCOPE,
    response_type: 'code',
    state: `boxplayer_${Date.now()}`
  })
  return `${CLOUD123_AUTH_URL}?${params.toString()}`
}

const normalizeToken = (data: any): ITokenInfo | null => {
  if (!data?.access_token) return null
  const payload = parseJwtPayload(data.access_token) || {}
  const userId = payload.user_id || payload.id || payload.uid || `cloud123_${hashString(data.refresh_token || data.access_token)}`
  const expireTime = new Date(Date.now() + (data.expires_in || 0) * 1000).toISOString()

  return {
    tokenfrom: 'cloud123',
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    session_expires_in: 0,
    open_api_token_type: '',
    open_api_access_token: '',
    open_api_refresh_token: '',
    open_api_expires_in: 0,
    signature: '',
    device_id: '',
    expires_in: data.expires_in || 0,
    token_type: data.token_type || 'Bearer',
    user_id: `cloud123_${userId}`,
    user_name: '123网盘',
    avatar: '',
    nick_name: '123网盘',
    default_drive_id: '',
    default_sbox_drive_id: '',
    resource_drive_id: '',
    backup_drive_id: '',
    sbox_drive_id: '',
    role: '',
    status: '',
    expire_time: expireTime,
    state: '',
    pin_setup: false,
    is_first_login: false,
    need_rp_verify: false,
    name: '123网盘',
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
  }
}

const fetchCloud123UserInfo = async (accessToken: string) => {
  const response = await fetch(CLOUD123_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Platform: 'open_platform'
    }
  })
  if (!response.ok) return null
  const data = await response.json()
  return data?.data || null
}

export const exchangeCloud123CodeForToken = async (code: string): Promise<ITokenInfo | null> => {
  const body = new URLSearchParams({
    client_id: CLOUD123_APP_ID,
    client_secret: CLOUD123_APP_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: CLOUD123_REDIRECT_URL
  })

  const response = await fetch(CLOUD123_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    message.error('获取 access_token 失败')
    return null
  }
  const data = await response.json()
  const token = normalizeToken(data)
  if (token) {
    try {
      const userInfo = await fetchCloud123UserInfo(token.access_token)
      if (userInfo) {
        const uid = userInfo.uid ?? userInfo.userId
        if (uid) token.user_id = `cloud123_${uid}`
        token.user_name = userInfo.nickname || token.user_name
        token.nick_name = userInfo.nickname || token.nick_name
        token.avatar = userInfo.headImage || token.avatar
        const totalSize = userInfo.spacePermanent
        const usedSize = userInfo.spaceUsed
        if (typeof totalSize === 'number') token.total_size = totalSize
        if (typeof usedSize === 'number') token.used_size = usedSize
        if (typeof totalSize === 'number' && typeof usedSize === 'number') {
          token.spaceinfo = `${(usedSize / (1024 ** 3)).toFixed(2)} GB / ${(totalSize / (1024 ** 3)).toFixed(2)} GB`
        }
        const vipInfo = Array.isArray(userInfo.vipInfo) ? userInfo.vipInfo : []
        const vipCurrent = vipInfo[0]
        if (vipCurrent?.vipLabel) token.vipname = vipCurrent.vipLabel
        if (vipCurrent?.endTime) token.vipexpire = vipCurrent.endTime
        if (userInfo.vip) token.vipIcon = token.vipIcon || ''
      }
    } catch {
      // ignore user info failure
    }
    UserDAL.SaveUserToken(token)
  }
  return token
}

export const refreshCloud123AccessToken = async (refreshToken: string): Promise<ITokenInfo | null> => {
  const body = new URLSearchParams({
    client_id: CLOUD123_APP_ID,
    client_secret: CLOUD123_APP_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })
  const response = await fetch(CLOUD123_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  if (!response.ok) return null
  const data = await response.json()
  const token = normalizeToken(data)
  if (token) {
    try {
    const userInfo = await fetchCloud123UserInfo(token.access_token)
    if (userInfo) {
      const uid = userInfo.uid ?? userInfo.userId
      if (uid) token.user_id = `cloud123_${uid}`
      token.user_name = userInfo.nickname || token.user_name
      token.nick_name = userInfo.nickname || token.nick_name
      token.avatar = userInfo.headImage || token.avatar
      const totalSize = userInfo.spacePermanent
      const usedSize = userInfo.spaceUsed
      if (typeof totalSize === 'number') token.total_size = totalSize
      if (typeof usedSize === 'number') token.used_size = usedSize
      if (typeof totalSize === 'number' && typeof usedSize === 'number') {
        token.spaceinfo = `${(usedSize / (1024 ** 3)).toFixed(2)} GB / ${(totalSize / (1024 ** 3)).toFixed(2)} GB`
      }
      const vipInfo = Array.isArray(userInfo.vipInfo) ? userInfo.vipInfo : []
      const vipCurrent = vipInfo[0]
      if (vipCurrent?.vipLabel) token.vipname = vipCurrent.vipLabel
      if (vipCurrent?.endTime) token.vipexpire = vipCurrent.endTime
      if (userInfo.vip) token.vipIcon = token.vipIcon || ''
    }
  } catch {
    // ignore user info failure
  }
  }
  return token
}

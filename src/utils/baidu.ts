import { ITokenInfo } from '../user/userstore'
import UserDAL from '../user/userdal'
import message from './message'

const BAIDU_AUTH_URL = 'https://openapi.baidu.com/oauth/2.0/authorize'
const BAIDU_TOKEN_URL = 'https://openapi.baidu.com/oauth/2.0/token'
const BAIDU_USER_INFO_URL = 'https://pan.baidu.com/rest/2.0/xpan/nas'
const BAIDU_QUOTA_URL = 'https://pan.baidu.com/api/quota'

const BAIDU_APP_ID = import.meta.env.VITE_BAIDU_APP_ID || ''
const BAIDU_APP_SECRET = import.meta.env.VITE_BAIDU_APP_SECRET || ''
const BAIDU_REDIRECT_URL = 'xbyboxplayer-oauth://callback'
const BAIDU_SCOPE = 'basic,netdisk'

const normalizeToken = (data: any): ITokenInfo | null => {
  if (!data?.access_token) return null
  const expiresIn = Number(data.expires_in || 0)
  const expireTime = new Date(Date.now() + expiresIn * 1000).toISOString()
  return {
    tokenfrom: 'baidu',
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    session_expires_in: 0,
    open_api_token_type: '',
    open_api_access_token: '',
    open_api_refresh_token: '',
    open_api_expires_in: 0,
    signature: '',
    device_id: '',
    expires_in: expiresIn,
    token_type: data.token_type || 'Bearer',
    user_id: '',
    user_name: '百度网盘',
    avatar: '',
    nick_name: '百度网盘',
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
    name: '百度网盘',
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

export const buildBaiduAuthUrl = () => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: BAIDU_APP_ID,
    redirect_uri: BAIDU_REDIRECT_URL,
    scope: BAIDU_SCOPE,
    state: `boxplayer_${Date.now()}`
  })
  return `${BAIDU_AUTH_URL}?${params.toString()}`
}

const fetchBaiduUserInfo = async (accessToken: string) => {
  const params = new URLSearchParams({
    method: 'uinfo',
    access_token: accessToken,
    vip_version: 'v2'
  })
  const url = `${BAIDU_USER_INFO_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) return null
  const data = await resp.json()
  if (data?.errno !== 0) return null
  return data
}

const fetchBaiduQuota = async (accessToken: string) => {
  const params = new URLSearchParams({
    access_token: accessToken,
    checkfree: '1',
    checkexpire: '1'
  })
  const url = `${BAIDU_QUOTA_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) return null
  const data = await resp.json()
  if (data?.errno !== 0) return null
  return data
}

export const exchangeBaiduCodeForToken = async (code: string): Promise<ITokenInfo | null> => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: BAIDU_APP_ID,
    client_secret: BAIDU_APP_SECRET,
    redirect_uri: BAIDU_REDIRECT_URL
  })
  const url = `${BAIDU_TOKEN_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) {
    message.error('获取 access_token 失败')
    return null
  }
  const data = await resp.json()
  const token = normalizeToken(data)
  if (token) {
    try {
      const info = await fetchBaiduUserInfo(token.access_token)
      if (info) {
        const uk = info.uk ?? info.user_id
        if (uk) token.user_id = `baidu_${uk}`
        token.user_name = info.netdisk_name || info.baidu_name || token.user_name
        token.nick_name = info.netdisk_name || info.baidu_name || token.nick_name
        token.avatar = info.avatar_url || token.avatar
        if (info.vip_type === 2) token.vipname = 'SVIP'
        if (info.vip_type === 1) token.vipname = 'VIP'
      }
      const quota = await fetchBaiduQuota(token.access_token)
      if (quota) {
        if (typeof quota.total === 'number') token.total_size = quota.total
        if (typeof quota.used === 'number') token.used_size = quota.used
        if (typeof quota.free === 'number') token.free_size = quota.free
        if (typeof quota.expire === 'boolean') token.space_expire = quota.expire
        if (typeof quota.total === 'number' && typeof quota.used === 'number') {
          token.spaceinfo = `${(quota.used / (1024 ** 3)).toFixed(2)} GB / ${(quota.total / (1024 ** 3)).toFixed(2)} GB`
        }
      }
    } catch {
      // ignore user info failure
    }
    UserDAL.SaveUserToken(token)
  }
  return token
}

export const refreshBaiduAccessToken = async (refreshToken: string): Promise<ITokenInfo | null> => {
  if (!refreshToken) return null
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: BAIDU_APP_ID,
    client_secret: BAIDU_APP_SECRET
  })
  const url = `${BAIDU_TOKEN_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) return null
  const data = await resp.json()
  const token = normalizeToken(data)
  if (token) {
    try {
      const info = await fetchBaiduUserInfo(token.access_token)
      if (info) {
        const uk = info.uk ?? info.user_id
        if (uk) token.user_id = `baidu_${uk}`
        token.user_name = info.netdisk_name || info.baidu_name || token.user_name
        token.nick_name = info.netdisk_name || info.baidu_name || token.nick_name
        token.avatar = info.avatar_url || token.avatar
        if (info.vip_type === 2) token.vipname = 'SVIP'
        if (info.vip_type === 1) token.vipname = 'VIP'
      }
      const quota = await fetchBaiduQuota(token.access_token)
      if (quota) {
        if (typeof quota.total === 'number') token.total_size = quota.total
        if (typeof quota.used === 'number') token.used_size = quota.used
        if (typeof quota.free === 'number') token.free_size = quota.free
        if (typeof quota.expire === 'boolean') token.space_expire = quota.expire
        if (typeof quota.total === 'number' && typeof quota.used === 'number') {
          token.spaceinfo = `${(quota.used / (1024 ** 3)).toFixed(2)} GB / ${(quota.total / (1024 ** 3)).toFixed(2)} GB`
        }
      }
    } catch {
      // ignore user info failure
    }
  }
  return token
}

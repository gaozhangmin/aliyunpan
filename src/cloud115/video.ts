import UserDAL from '../user/userdal'
import message from '../utils/message'
import { apiDrive115FileDetail } from './filecmd'

type Drive115VideoUrlItem = {
  url: string
  height?: number
  width?: number
  definition?: number | string
  definition_n?: number | string
  title?: string
}

type Drive115VideoPlayData = {
  file_id?: string
  file_name?: string
  play_long?: number | string
  user_def?: number
  multitrack_list?: { title?: string; is_selected?: string | number }[]
  definition_list_new?: number[]
  video_url?: Drive115VideoUrlItem[]
}

type Drive115VideoPlayResp = {
  state: boolean
  code: number
  message: string
  data?: Drive115VideoPlayData
}

type Drive115VideoHistoryResp = {
  state: boolean
  code: number
  message: string
  data?: { time?: string | number }[]
}

const PLAY_URL = 'https://proapi.115.com/open/video/play'
const HISTORY_URL = 'https://proapi.115.com/open/video/history'

const pickCodeCache = new Map<string, { pick_code: string; play_long: number }>()

export const apiDrive115VideoPlay = async (user_id: string, pick_code: string): Promise<Drive115VideoPlayData | string> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token || !pick_code) return '参数错误'
  const params = new URLSearchParams({ pick_code })
  const url = `${PLAY_URL}?${params.toString()}`
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
    if (!resp.ok) return '获取播放地址失败'
    const data = (await resp.json()) as Drive115VideoPlayResp
    if (data?.code !== 0 || !data?.data) {
      return data?.message || '获取播放地址失败'
    }
    return data.data
  } catch (err: any) {
    message.error('获取播放地址失败 ' + (err?.message || ''))
    return '获取播放地址失败'
  }
}

export const apiDrive115VideoHistory = async (user_id: string, pick_code: string): Promise<number> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token || !pick_code) return 0
  const params = new URLSearchParams({ pick_code })
  const url = `${HISTORY_URL}?${params.toString()}`
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
    if (!resp.ok) return 0
    const data = (await resp.json()) as Drive115VideoHistoryResp
    if (data?.code !== 0 || !Array.isArray(data.data) || data.data.length === 0) return 0
    const time = Number(data.data[0]?.time || 0)
    return Number.isFinite(time) ? time : 0
  } catch {
    return 0
  }
}

export const apiDrive115VideoHistoryUpdate = async (
  user_id: string,
  pick_code: string,
  time: number,
  watch_end: number = 0
): Promise<boolean> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token || !pick_code) return false
  const body = new URLSearchParams()
  body.set('pick_code', pick_code)
  body.set('time', Math.max(0, Math.trunc(time)).toString())
  body.set('watch_end', watch_end ? '1' : '0')
  try {
    const resp = await fetch(HISTORY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })
    if (!resp.ok) return false
    const data = await resp.json()
    return data?.code === 0 && data?.state === true
  } catch {
    return false
  }
}

export const getDrive115PickCode = async (user_id: string, file_id: string): Promise<{ pick_code: string; play_long: number } | null> => {
  const cacheKey = `${user_id}:${file_id}`
  if (pickCodeCache.has(cacheKey)) return pickCodeCache.get(cacheKey) || null
  const detail = await apiDrive115FileDetail(user_id, file_id)
  if (!detail?.pick_code) return null
  const meta = { pick_code: detail.pick_code, play_long: Number(detail.play_long || 0) }
  pickCodeCache.set(cacheKey, meta)
  return meta
}

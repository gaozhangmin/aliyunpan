import UserDAL from '../user/userdal'
import { pikpakAuthHeaders } from './auth'

export type PikPakShareCreateResult = {
  shareId: string
  shareUrl: string
  passCode: string
  error: string
}

const PIKPAK_API_HOST = 'https://api-drive.mypikpak.com'

const parsePikPakError = (data: any, fallback: string) => {
  return data?.error_description || data?.message || data?.error || fallback
}

export const toPikPakExpirationDays = (expiration: string): number => {
  if (!expiration) return -1
  const target = new Date(expiration).getTime()
  if (Number.isNaN(target)) return -1
  const diff = target - Date.now()
  if (diff <= 0) return 1
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

export const apiPikPakShareCreate = async (
  user_id: string,
  fileIDList: string[],
  needPassword: boolean,
  expiration: string
): Promise<PikPakShareCreateResult> => {
  const result: PikPakShareCreateResult = { shareId: '', shareUrl: '', passCode: '', error: '创建 PikPak 分享链接失败' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录 PikPak'
    return result
  }
  try {
    const resp = await fetch(`${PIKPAK_API_HOST}/drive/v1/share`, {
      method: 'POST',
      headers: pikpakAuthHeaders(token),
      body: JSON.stringify({
        file_ids: fileIDList,
        share_to: needPassword ? 'encryptedlink' : 'publiclink',
        expiration_days: toPikPakExpirationDays(expiration),
        pass_code_option: needPassword ? 'REQUIRED' : 'NOT_REQUIRED'
      })
    })
    const data = await resp.json().catch(() => undefined)
    if (!resp.ok || data?.error) {
      result.error = parsePikPakError(data, result.error)
      return result
    }
    result.shareId = String(data?.share_id || data?.id || '')
    result.shareUrl = data?.share_url || data?.share_link || ''
    result.passCode = data?.pass_code || data?.passcode || ''
    result.error = result.shareId && result.shareUrl ? '' : '创建 PikPak 分享链接失败'
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

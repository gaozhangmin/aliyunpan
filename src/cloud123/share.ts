import UserDAL from '../user/userdal'

export type Cloud123ShareCreateResult = {
  shareId: string
  shareKey: string
  error: string
}

export type Cloud123ShareListItem = {
  shareId: number
  shareKey: string
  shareName: string
  expiration: string
  expired: number
  sharePwd: string
  trafficSwitch: number
  trafficLimitSwitch: number
  trafficLimit: number
  bytesCharge: number
  previewCount: number
  downloadCount: number
  saveCount: number
}

export type Cloud123ShareListResult = {
  list: Cloud123ShareListItem[]
  lastShareId: number
  error: string
}

export type Cloud123ShareUpdateResult = {
  success: boolean
  error: string
}

export const apiCloud123ShareCreate = async (
  user_id: string,
  shareName: string,
  shareExpire: number,
  fileIDList: string[],
  sharePwd: string,
  trafficSwitch?: number,
  trafficLimitSwitch?: number,
  trafficLimit?: number
): Promise<Cloud123ShareCreateResult> => {
  const result: Cloud123ShareCreateResult = { shareId: '', shareKey: '', error: '创建分享链接失败' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录123云盘'
    return result
  }
  const url = 'https://open-api.123pan.com/api/v1/share/create'
  const fileIDListStr = fileIDList.join(',')
  const safeShareName = shareName || '分享链接'
  const body: any = {
    shareName: safeShareName,
    shareExpire,
    fileIDList: fileIDListStr
  }
  if (sharePwd) body.sharePwd = sharePwd
  if (trafficSwitch) body.trafficSwitch = trafficSwitch
  if (trafficLimitSwitch) body.trafficLimitSwitch = trafficLimitSwitch
  if (trafficLimit) body.trafficLimit = trafficLimit
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Platform: 'open_platform',
        Authorization: `Bearer ${token.access_token}`
      },
      body: JSON.stringify(body)
    })
    if (!resp.ok) return result
    const data = await resp.json()
    if (data?.code === 0) {
      const shareId = data?.data?.shareID ?? data?.data?.shareId ?? ''
      const shareKey = data?.data?.shareKey ?? ''
      return { shareId: shareId ? String(shareId) : '', shareKey: shareKey || '', error: '' }
    }
    if (data?.message) result.error = data.message
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

export const apiCloud123ShareList = async (
  user_id: string,
  lastShareId: number,
  limit: number
): Promise<Cloud123ShareListResult> => {
  const result: Cloud123ShareListResult = { list: [], lastShareId: -1, error: '' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录123云盘'
    return result
  }
  const url = `https://open-api.123pan.com/api/v1/share/list?limit=${limit}&lastShareId=${lastShareId}`
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Platform: 'open_platform',
        Authorization: `Bearer ${token.access_token}`
      }
    })
    if (!resp.ok) {
      result.error = '获取分享列表失败'
      return result
    }
    const data = await resp.json()
    if (data?.code === 0) {
      result.list = Array.isArray(data?.data?.shareList) ? data.data.shareList : []
      result.lastShareId = typeof data?.data?.lastShareId === 'number' ? data.data.lastShareId : -1
      return result
    }
    if (data?.message) result.error = data.message
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

export const apiCloud123ShareUpdate = async (
  user_id: string,
  shareIdList: string[],
  trafficSwitch?: number,
  trafficLimitSwitch?: number,
  trafficLimit?: number
): Promise<Cloud123ShareUpdateResult> => {
  const result: Cloud123ShareUpdateResult = { success: false, error: '修改分享链接失败' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录123云盘'
    return result
  }
  const ids = shareIdList.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
  if (ids.length === 0) {
    result.error = '分享链接ID错误'
    return result
  }
  const url = 'https://open-api.123pan.com/api/v1/share/list/info'
  const body: any = {
    shareIdList: ids
  }
  if (trafficSwitch) body.trafficSwitch = trafficSwitch
  if (trafficLimitSwitch) body.trafficLimitSwitch = trafficLimitSwitch
  if (trafficLimit) body.trafficLimit = trafficLimit
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Platform: 'open_platform',
        Authorization: `Bearer ${token.access_token}`
      },
      body: JSON.stringify(body)
    })
    if (!resp.ok) return result
    const data = await resp.json()
    if (data?.code === 0) return { success: true, error: '' }
    if (data?.message) result.error = data.message
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

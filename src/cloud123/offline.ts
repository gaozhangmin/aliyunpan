import UserDAL from '../user/userdal'

export type Cloud123OfflineCreateResult = {
  taskId: number | null
  error: string
}

export type Cloud123OfflineProcessResult = {
  process: number
  status: number
  error: string
}

export const apiCloud123OfflineCreate = async (user_id: string, url: string, fileName: string, dirID?: string) => {
  const result: Cloud123OfflineCreateResult = { taskId: null, error: '创建离线下载失败' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录123云盘'
    return result
  }
  const body: any = { url }
  if (fileName) body.fileName = fileName
  if (dirID && !dirID.includes('root')) {
    const dirNum = Number(dirID)
    if (!Number.isNaN(dirNum)) body.dirID = dirNum
  }
  try {
    const resp = await fetch('https://open-api.123pan.com/api/v1/offline/download', {
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
      const taskId = data?.data?.taskID ?? data?.data?.taskId
      return { taskId: typeof taskId === 'number' ? taskId : Number(taskId), error: '' }
    }
    if (data?.message) result.error = data.message
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

export const apiCloud123OfflineProcess = async (user_id: string, taskID: string) => {
  const result: Cloud123OfflineProcessResult = { process: 0, status: 0, error: '' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录123云盘'
    return result
  }
  const taskIdNum = Number(taskID)
  if (Number.isNaN(taskIdNum)) {
    result.error = '任务ID无效'
    return result
  }
  try {
    const resp = await fetch(`https://open-api.123pan.com/api/v1/offline/download/process?taskID=${taskIdNum}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Platform: 'open_platform',
        Authorization: `Bearer ${token.access_token}`
      }
    })
    if (!resp.ok) {
      result.error = '获取离线下载进度失败'
      return result
    }
    const data = await resp.json()
    if (data?.code === 0) {
      result.process = Number(data?.data?.process) || 0
      result.status = Number(data?.data?.status) || 0
      return result
    }
    if (data?.message) result.error = data.message
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

import UserDAL from '../user/userdal'
import { pikpakAuthHeaders } from './auth'
import { apiPikPakFileDetail } from './dirfilelist'

export type PikPakOfflineCreateResult = {
  taskId: string | null
  fileId: string
  error: string
}

export type PikPakOfflineProcessResult = {
  process: number
  status: number
  error: string
}

const PIKPAK_API_HOST = 'https://api-drive.mypikpak.com'

const parsePikPakError = (data: any, fallback: string) => {
  return data?.error_description || data?.message || data?.error || fallback
}

const getTaskId = (data: any) => {
  return data?.task?.id || data?.task_id || data?.id || data?.upload_task_id || ''
}

const getFileId = (data: any) => {
  return data?.file?.id || data?.file_id || data?.id || ''
}

const normalizeProgress = (task: any) => {
  const raw = task?.progress ?? task?.params?.progress ?? task?.progress_percent ?? 0
  const progress = Number(raw)
  if (!Number.isFinite(progress)) return 0
  if (progress > 0 && progress <= 1) return Math.floor(progress * 100)
  return Math.floor(progress)
}

export const apiPikPakOfflineCreate = async (user_id: string, url: string, fileName: string, parentId?: string) => {
  const result: PikPakOfflineCreateResult = { taskId: null, fileId: '', error: '创建 PikPak 离线下载失败' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录 PikPak'
    return result
  }
  const body: any = {
    kind: 'drive#file',
    name: fileName || undefined,
    upload_type: 'UPLOAD_TYPE_URL',
    url: { url }
  }
  if (parentId && !parentId.includes('root')) {
    body.parent_id = parentId
    body.folder_type = ''
  } else {
    body.folder_type = 'DOWNLOAD'
  }
  try {
    const resp = await fetch(`${PIKPAK_API_HOST}/drive/v1/files`, {
      method: 'POST',
      headers: pikpakAuthHeaders(token),
      body: JSON.stringify(body)
    })
    const data = await resp.json().catch(() => undefined)
    if (!resp.ok || data?.error) {
      result.error = parsePikPakError(data, result.error)
      return result
    }
    const taskId = getTaskId(data)
    result.taskId = taskId ? String(taskId) : null
    result.fileId = String(getFileId(data) || '')
    result.error = result.taskId || result.fileId ? '' : '创建 PikPak 离线下载失败'
  } catch (err: any) {
    result.error = err?.message || result.error
  }
  return result
}

export const apiPikPakOfflineProcess = async (user_id: string, taskId: string, fileId?: string) => {
  const result: PikPakOfflineProcessResult = { process: 0, status: 0, error: '' }
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    result.error = '请先登录 PikPak'
    return result
  }
  try {
    const params = new URLSearchParams()
    params.set('type', 'offline')
    params.set('thumbnail_size', 'SIZE_SMALL')
    params.set('limit', '100')
    params.set('filters', JSON.stringify({
      phase: {
        in: [
          'PHASE_TYPE_PENDING',
          'PHASE_TYPE_RUNNING',
          'PHASE_TYPE_COMPLETE',
          'PHASE_TYPE_ERROR'
        ].join(',')
      }
    }))
    params.set('with', 'reference_resource')
    const resp = await fetch(`${PIKPAK_API_HOST}/drive/v1/tasks?${params.toString()}`, {
      method: 'GET',
      headers: pikpakAuthHeaders(token)
    })
    const data = await resp.json().catch(() => undefined)
    if (!resp.ok || data?.error) {
      result.error = parsePikPakError(data, '获取 PikPak 离线下载进度失败')
      return result
    }
    const tasks = Array.isArray(data?.tasks) ? data.tasks : []
    const task = tasks.find((item: any) => String(item?.id || item?.task_id || '') === taskId)
    if (task) {
      const phase = String(task?.phase || task?.status || '')
      result.process = Math.max(0, Math.min(100, normalizeProgress(task)))
      if (phase === 'PHASE_TYPE_COMPLETE') {
        result.status = 2
        result.process = 100
      } else if (phase === 'PHASE_TYPE_ERROR') {
        result.status = 1
        result.error = task?.message || task?.error || ''
      } else if (phase === 'PHASE_TYPE_PENDING') {
        result.status = 3
      } else {
        result.status = 0
      }
      return result
    }
    if (fileId) {
      const file = await apiPikPakFileDetail(user_id, fileId)
      if (file?.id) {
        result.status = 2
        result.process = 100
        return result
      }
    }
  } catch (err: any) {
    result.error = err?.message || '获取 PikPak 离线下载进度失败'
  }
  return result
}

export const apiPikPakOfflineDelete = async (user_id: string, taskIds: string[], deleteFiles = false) => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token || taskIds.length === 0) return false
  try {
    const params = new URLSearchParams()
    for (const taskId of taskIds) params.append('task_ids', taskId)
    params.set('delete_files', deleteFiles ? 'true' : 'false')
    const resp = await fetch(`${PIKPAK_API_HOST}/drive/v1/tasks?${params.toString()}`, {
      method: 'DELETE',
      headers: pikpakAuthHeaders(token)
    })
    return resp.ok
  } catch {
    return false
  }
}

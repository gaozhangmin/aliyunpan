import type { IAliGetFileModel } from '../aliapi/alimodels'
import message from '../utils/message'

const DROPBOX_API_HOST = 'https://api.dropboxapi.com/2'

type DropboxFileMetadataResp = {
  metadata?: {
    '.tag'?: 'file' | 'folder' | 'deleted'
    id?: string
    name?: string
    path_lower?: string
    path_display?: string
  }
  error_summary?: string
}

const getDropboxToken = async (user_id: string) => {
  const { default: UserDAL } = await import('../user/userdal')
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)
    if (dbToken) token = dbToken
  }
  return token
}

const parseDropboxError = (data: any, fallback: string) => data?.error_summary || data?.error_description || data?.message || fallback

const dropboxRpc = async <T>(user_id: string, endpoint: string, body: any, title: string): Promise<{ data?: T; error: string }> => {
  const token = await getDropboxToken(user_id)
  if (!token?.access_token) return { error: '请先登录 Dropbox' }
  try {
    const resp = await fetch(`${DROPBOX_API_HOST}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    const data = await resp.json().catch(() => undefined)
    if (!resp.ok || data?.error) return { data, error: parseDropboxError(data, `${title}失败`) }
    return { data: data as T, error: '' }
  } catch (err: any) {
    return { error: err?.message || `${title}失败` }
  }
}

export const extractDropboxPathFromDescription = (description = ''): string => {
  const match = /dropbox_path:([^;]+)/.exec(description)
  if (!match?.[1]) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export const resolveDropboxCommandPath = (fileId: string, description = '', path = ''): string => {
  if (!fileId || fileId.includes('root')) return ''
  if (path) return path
  if (fileId.startsWith('/')) return fileId
  return extractDropboxPathFromDescription(description) || fileId
}

export const parentPathFromDropboxPath = (path: string): string => {
  if (!path.startsWith('/')) return ''
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  return `/${parts.slice(0, -1).join('/')}`
}

export const buildDropboxChildPath = (parentId: string, name: string, parentDescription = '', parentPath = ''): string => {
  const parent = resolveDropboxCommandPath(parentId, parentDescription, parentPath)
  if (!parent) return `/${name}`
  return `${parent.replace(/\/+$/g, '')}/${name}`
}

export const buildDropboxRelocationBody = (fromPath: string, toPath: string) => ({
  from_path: fromPath,
  to_path: toPath,
  allow_shared_folder: true,
  autorename: true,
  allow_ownership_transfer: false
})

const currentFileById = async (fileId: string): Promise<IAliGetFileModel | undefined> => {
  const { default: usePanFileStore } = await import('../pan/panfilestore')
  const list = usePanFileStore().ListDataRaw || []
  return list.find((item: IAliGetFileModel) => item.file_id === fileId)
}

const resolveCurrentPath = async (fileId: string): Promise<string> => {
  const item = await currentFileById(fileId)
  return resolveDropboxCommandPath(fileId, item?.description || '', item?.path || '')
}

const resolveCurrentName = async (fileId: string): Promise<string> => {
  const item = await currentFileById(fileId)
  if (item?.name) return item.name
  const path = await resolveCurrentPath(fileId)
  return path.split('/').filter(Boolean).pop() || fileId
}

export const apiDropboxMkdir = async (user_id: string, parentId: string, name: string): Promise<{ file_id: string; error: string }> => {
  const path = buildDropboxChildPath(parentId, name)
  const resp = await dropboxRpc<DropboxFileMetadataResp>(user_id, '/files/create_folder_v2', { path, autorename: false }, '新建文件夹')
  if (resp.error) return { file_id: '', error: resp.error }
  return { file_id: resp.data?.metadata?.id || resp.data?.metadata?.path_display || path, error: '' }
}

export const apiDropboxDeleteBatch = async (user_id: string, fileIds: string[]): Promise<string[]> => {
  const successList: string[] = []
  for (const fileId of fileIds) {
    const path = await resolveCurrentPath(fileId)
    if (!path) continue
    const resp = await dropboxRpc<DropboxFileMetadataResp>(user_id, '/files/delete_v2', { path }, '删除')
    if (resp.error) message.error(resp.error)
    else successList.push(fileId)
  }
  return successList
}

export const apiDropboxRename = async (user_id: string, fileId: string, name: string): Promise<{ success: boolean; file_id: string; name: string; parent_file_id: string; isDir: boolean }> => {
  const fromPath = await resolveCurrentPath(fileId)
  const parentPath = parentPathFromDropboxPath(fromPath)
  if (!fromPath || !name) return { success: false, file_id: fileId, name, parent_file_id: parentPath, isDir: false }
  const toPath = buildDropboxChildPath(parentPath || 'dropbox_root', name)
  const resp = await dropboxRpc<DropboxFileMetadataResp>(user_id, '/files/move_v2', buildDropboxRelocationBody(fromPath, toPath), '重命名')
  if (resp.error) {
    message.error(resp.error)
    return { success: false, file_id: fileId, name, parent_file_id: parentPath, isDir: false }
  }
  const metadata = resp.data?.metadata
  return {
    success: true,
    file_id: metadata?.id || metadata?.path_display || fileId,
    name: metadata?.name || name,
    parent_file_id: parentPath,
    isDir: metadata?.['.tag'] === 'folder'
  }
}

const apiDropboxRelocateBatch = async (user_id: string, fileIds: string[], toParentId: string, toParentDescription: string, endpoint: '/files/move_v2' | '/files/copy_v2', title: string): Promise<string[]> => {
  const targetParentPath = resolveDropboxCommandPath(toParentId, toParentDescription)
  const successList: string[] = []
  for (const fileId of fileIds) {
    const fromPath = await resolveCurrentPath(fileId)
    const name = await resolveCurrentName(fileId)
    if (!fromPath || !name) continue
    const toPath = buildDropboxChildPath(targetParentPath || 'dropbox_root', name)
    const resp = await dropboxRpc<DropboxFileMetadataResp>(user_id, endpoint, buildDropboxRelocationBody(fromPath, toPath), title)
    if (resp.error) message.error(resp.error)
    else successList.push(fileId)
  }
  return successList
}

export const apiDropboxMoveBatch = async (user_id: string, fileIds: string[], toParentId: string, toParentDescription = ''): Promise<string[]> => {
  return apiDropboxRelocateBatch(user_id, fileIds, toParentId, toParentDescription, '/files/move_v2', '移动')
}

export const apiDropboxCopyBatch = async (user_id: string, fileIds: string[], toParentId: string, toParentDescription = ''): Promise<string[]> => {
  return apiDropboxRelocateBatch(user_id, fileIds, toParentId, toParentDescription, '/files/copy_v2', '复制')
}

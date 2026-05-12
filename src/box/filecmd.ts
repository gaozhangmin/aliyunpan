import { boxApiRequest, mapBoxItemToAliModel, toBoxId } from './dirfilelist'

export const toBoxFolderId = toBoxId

export const buildBoxMkdirBody = (name: string, parentId: string) => ({
  name,
  parent: { id: toBoxFolderId(parentId) }
})

export const buildBoxRenameBody = (name: string) => ({ name })

export const buildBoxMoveBody = (parentId: string) => ({
  parent: { id: toBoxFolderId(parentId) }
})

export const buildBoxCopyBody = (parentId: string, name?: string) => ({
  parent: { id: toBoxFolderId(parentId) },
  ...(name ? { name } : {})
})

export const apiBoxMkdir = async (user_id: string, parentId: string, name: string): Promise<{ file_id: string; error: string }> => {
  const data = await boxApiRequest<any>(user_id, '/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBoxMkdirBody(name, parentId))
  }, '创建 Box 文件夹失败')
  return { file_id: data?.id || '', error: data?.id ? '' : '创建 Box 文件夹失败' }
}

export const apiBoxDeleteBatch = async (user_id: string, fileIdList: string[], permanently = false): Promise<string[]> => {
  const errors: string[] = []
  for (const fileId of fileIdList) {
    const isFolder = fileId.endsWith('_folder')
    const cleanId = isFolder ? fileId.replace(/_folder$/, '') : fileId
    const path = `/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(cleanId)}${isFolder ? '?recursive=true' : ''}`
    const data = await boxApiRequest<any>(user_id, path, { method: 'DELETE' }, '删除 Box 文件失败')
    if (data === null) errors.push(cleanId)
    if (permanently) {
      const trashPath = `/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(cleanId)}/trash`
      const purge = await boxApiRequest<any>(user_id, trashPath, { method: 'DELETE' }, '彻底删除 Box 文件失败')
      if (purge === null) errors.push(cleanId)
    }
  }
  return errors
}

export const apiBoxRename = async (user_id: string, fileId: string, name: string, isFolder = false) => {
  const data = await boxApiRequest<any>(user_id, `/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(fileId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBoxRenameBody(name))
  }, '重命名 Box 文件失败')
  return data ? mapBoxItemToAliModel(data, 'box', data.parent?.id || 'box_root') : undefined
}

export const apiBoxMoveBatch = async (user_id: string, fileIdList: string[], parentId: string, isFolder = false): Promise<string[]> => {
  const errors: string[] = []
  for (const fileId of fileIdList) {
    const data = await boxApiRequest<any>(user_id, `/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(fileId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBoxMoveBody(parentId))
    }, '移动 Box 文件失败')
    if (!data) errors.push(fileId)
  }
  return errors
}

export const apiBoxCopyBatch = async (user_id: string, fileIdList: string[], parentId: string, isFolder = false): Promise<string[]> => {
  const errors: string[] = []
  for (const fileId of fileIdList) {
    const data = await boxApiRequest<any>(user_id, `/${isFolder ? 'folders' : 'files'}/${encodeURIComponent(fileId)}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBoxCopyBody(parentId))
    }, '复制 Box 文件失败')
    if (!data) errors.push(fileId)
  }
  return errors
}

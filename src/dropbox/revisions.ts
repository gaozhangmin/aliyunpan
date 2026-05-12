import type { DropboxMetadata } from './dirfilelist'
import { dropboxRpc } from './dirfilelist'

type DropboxListRevisionsResp = {
  entries?: DropboxMetadata[]
}

export const buildDropboxListRevisionsBody = (fileId: string, limit = 20) => ({
  path: fileId,
  mode: {
    '.tag': 'path'
  },
  limit: Math.max(1, Math.min(limit, 100))
})

export const buildDropboxRestoreBody = (fileId: string, rev: string) => ({
  path: fileId,
  rev
})

export const apiDropboxListRevisions = async (user_id: string, fileId: string, limit = 20): Promise<DropboxMetadata[]> => {
  const data = await dropboxRpc<DropboxListRevisionsResp>(user_id, '/files/list_revisions', buildDropboxListRevisionsBody(fileId, limit), '获取 Dropbox 文件版本失败')
  return Array.isArray(data?.entries) ? data.entries : []
}

export const apiDropboxRestoreRevision = async (user_id: string, fileId: string, rev: string): Promise<DropboxMetadata | null> => {
  return await dropboxRpc<DropboxMetadata>(user_id, '/files/restore', buildDropboxRestoreBody(fileId, rev), '恢复 Dropbox 文件版本失败')
}

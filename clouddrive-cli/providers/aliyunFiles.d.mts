import type { AliyunToken } from './aliyunHttp.mjs'
import type { FileItem } from '../core/models.mjs'

export interface ListDirResult {
  items: FileItem[]
  nextMarker: string
}

export interface RenameInput {
  fileId: string
  newName: string
}

export interface RenameResult {
  fileId: string
  status: 'success' | 'error'
  newName?: string
  code?: string
  message?: string
}

export function aliListDir(token: AliyunToken, driveId: string, parentFileId?: string, marker?: string): Promise<ListDirResult>
export function aliListAll(token: AliyunToken, driveId: string, parentFileId?: string): Promise<FileItem[]>
export function aliWalk(token: AliyunToken, driveId: string, parentFileId?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function aliRenameBatch(token: AliyunToken, driveId: string, renames: RenameInput[]): Promise<RenameResult[]>

import type { FileItem, RenameResult } from '../core/models.mjs'

export interface GenericToken {
  access_token: string
  refresh_token: string
  [key: string]: unknown
}

export interface RenameInput {
  fileId: string
  newName: string
}

export function boxRefreshToken(token: GenericToken): Promise<GenericToken>
export function boxListDir(token: GenericToken, folderId?: string): Promise<FileItem[]>
export function boxWalk(token: GenericToken, folderId?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function boxRenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

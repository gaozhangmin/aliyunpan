import type { FileItem, RenameResult } from '../core/models.mjs'

export interface GenericToken {
  access_token: string
  refresh_token: string
  [key: string]: unknown
}

export interface RenameInput {
  fileId: string
  newName: string
  filePath?: string
}

export function baiduRefreshToken(token: GenericToken): Promise<GenericToken>
export function baiduListDir(token: GenericToken, dirPath?: string): Promise<FileItem[]>
export function baiduWalk(token: GenericToken, dirPath?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function baiduRenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

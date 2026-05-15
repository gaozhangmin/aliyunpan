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

export function dropboxRefreshToken(token: GenericToken): Promise<GenericToken>
export function dropboxListDir(token: GenericToken, path?: string): Promise<FileItem[]>
export function dropboxWalk(token: GenericToken, path?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function dropboxRenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

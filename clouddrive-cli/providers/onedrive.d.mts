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

export function onedriveRefreshToken(token: GenericToken): Promise<GenericToken>
export function onedriveListDir(token: GenericToken, parentFileId?: string): Promise<FileItem[]>
export function onedriveWalk(token: GenericToken, parentFileId?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function onedriveRenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

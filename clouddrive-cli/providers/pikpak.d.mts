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

export function pikpakRefreshToken(token: GenericToken): Promise<GenericToken>
export function pikpakListDir(token: GenericToken, parentFileId?: string): Promise<FileItem[]>
export function pikpakWalk(token: GenericToken, parentFileId?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function pikpakRenameFile(token: GenericToken, fileId: string, newName: string): Promise<RenameResult>
export function pikpakRenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

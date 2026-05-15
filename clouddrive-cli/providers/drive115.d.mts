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

export function drive115RefreshToken(token: GenericToken): Promise<GenericToken>
export function drive115ListDir(token: GenericToken, cid?: string): Promise<FileItem[]>
export function drive115Walk(token: GenericToken, cid?: string, maxDepth?: number): AsyncGenerator<FileItem>
export function drive115RenameBatch(token: GenericToken, renames: RenameInput[]): Promise<RenameResult[]>

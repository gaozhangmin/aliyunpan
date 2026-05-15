export interface FileItem {
  provider: string
  accountId: string
  driveId: string
  fileId: string
  parentFileId: string
  path?: string
  name: string
  type: 'file' | 'folder'
  size?: number
  contentHash?: string
  mimeType?: string
  category?: string
  updatedAt?: string
  createdAt?: string
}

export interface RenameResult {
  fileId: string
  status: 'success' | 'error'
  newName?: string
  code?: string
  message?: string
}

export function createFileItem(fields: Partial<FileItem>): FileItem
export function createRenameResult(fields: Partial<RenameResult>): RenameResult

export type DriveItemForAnalysis = {
  provider?: string
  accountId?: string
  account_id?: string
  driveId?: string
  drive_id?: string
  fileId?: string
  file_id?: string
  parentFileId?: string
  parent_file_id?: string
  name: string
  type: 'file' | 'folder' | string
  size?: number
  category?: string
}

export type DriveAnalysis = {
  version: 1
  provider: string
  account_id: string
  root_file_id: string
  created_at: string
  stats: {
    totalItems: number
    fileCount: number
    folderCount: number
    videoCount: number
    totalBytes: number
  }
  folders: Array<{ file_id: string; parent_file_id: string; name: string }>
  files: Array<{
    file_id: string
    parent_file_id: string
    drive_id: string
    name: string
    size: number
    category: string
    media_kind: string
  }>
}

export type OrganizeAction =
  | { type: 'mkdir'; parent_file_id: string; name: string; ref?: string; reason?: string }
  | { type: 'move'; file_id: string; from_parent_file_id: string; to_parent_file_id?: string; to_parent_ref?: string; name?: string; reason?: string }
  | { type: 'rename'; file_id: string; new_name: string; reason?: string }
  | { type: 'copy' | 'trash'; file_id: string; reason?: string }

export type OrganizePlan = {
  version: 1
  operation: 'organize'
  provider: string
  account_id: string
  root_file_id: string
  created_at: string
  rules?: { text: string }
  actions: OrganizeAction[]
}

export function analyzeDriveItems(options: {
  provider?: string
  accountId?: string
  rootFileId?: string
  items?: DriveItemForAnalysis[]
}): DriveAnalysis

export function createOrganizePlan(options: {
  analysis: DriveAnalysis
  rulesText?: string
}): OrganizePlan

export function validateOrganizePlan(plan: unknown): {
  ok: boolean
  errors: string[]
  actionCount: number
}

export function dryRunOrganizePlan(plan: OrganizePlan | unknown): {
  ok: boolean
  provider?: string
  account_id?: string
  actionCount: number
  counts: { mkdir: number; move: number; rename: number; copy: number; trash: number }
  actions: OrganizeAction[]
  errors: Array<{ code: string; message: string }>
}

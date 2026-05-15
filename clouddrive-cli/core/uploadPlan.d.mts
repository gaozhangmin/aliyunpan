export type UploadPlanItem = {
  type: 'file' | 'folder'
  local_path?: string
  relative_path: string
  target_name: string
  size?: number
  updated_at?: string
}

export type UploadPlan = {
  version: 1
  operation: 'upload'
  provider: string
  account_id: string
  created_at: string
  local_root: string
  remote_parent_file_id: string
  conflict: string
  items: UploadPlanItem[]
}

export function createUploadPlanFromLocalPath(options: {
  localPath: string
  provider?: string
  accountId?: string
  remoteParentFileId?: string
  conflict?: string
}): Promise<UploadPlan>

export function validateUploadPlan(plan: unknown): {
  ok: boolean
  errors: string[]
  itemCount: number
}

export function dryRunUploadPlan(plan: UploadPlan | unknown): {
  ok: boolean
  provider?: string
  account_id?: string
  remote_parent_file_id?: string
  fileCount: number
  folderCount: number
  totalBytes: number
  items: Array<{
    type: string
    relative_path: string
    target_name: string
    size: number
  }>
  errors: Array<{ code: string; message: string }>
}

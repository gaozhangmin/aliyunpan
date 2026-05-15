export interface MediaFileItem {
  fileId?: string
  file_id?: string
  parentFileId?: string
  parent_file_id?: string
  driveId?: string
  drive_id?: string
  name: string
  type: 'file' | 'folder'
}

export interface MediaRenamePlanItem {
  drive_id: string
  file_id: string
  parent_file_id: string
  old_name: string
  new_name: string
  reason: string
}

export interface MediaRenamePlanSkipped {
  fileId: string
  name: string
  reason: string
}

export interface MediaRenamePlanUncertain {
  fileId: string
  name: string
  reason: string
}

export interface MediaRenamePlan {
  version: 1
  operation: 'rename'
  provider: string
  account_id: string
  created_at: string
  style: string
  items: MediaRenamePlanItem[]
  skipped: MediaRenamePlanSkipped[]
  uncertain: MediaRenamePlanUncertain[]
}

export interface GenerateMediaRenamePlanInput {
  provider: string
  accountId: string
  items: MediaFileItem[]
  style?: string
}

export function generateMediaRenamePlan(input: GenerateMediaRenamePlanInput): MediaRenamePlan

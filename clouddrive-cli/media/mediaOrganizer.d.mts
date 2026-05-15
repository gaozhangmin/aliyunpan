import type { MediaFileItem, MediaRenamePlanItem, MediaRenamePlanSkipped, MediaRenamePlanUncertain } from './mediaRenamePlanner.mjs'

export interface OrganizeMkdir {
  path: string
  parent_file_id: string | null
  parent_path: string | null
  step: number
}

export interface OrganizeMove {
  drive_id: string
  file_id: string
  name: string
  type: 'file'
  from_parent_file_id: string
  to_path: string
}

export interface OrganizePlan {
  version: 1
  operation: 'organize'
  provider: string
  account_id: string
  style: string
  root_file_id: string
  drive_id: string
  created_at: string
  summary: {
    movies: number
    series: number
    episodes: number
    new_dirs: number
    renames: number
    moves: number
  }
  mkdirs: OrganizeMkdir[]
  renames: MediaRenamePlanItem[]
  moves: OrganizeMove[]
  skipped: MediaRenamePlanSkipped[]
  uncertain: MediaRenamePlanUncertain[]
}

export interface GenerateOrganizePlanInput {
  provider: string
  accountId: string
  items: MediaFileItem[]
  style?: string
  rootFileId?: string
  driveId?: string
}

export function generateOrganizePlan(input: GenerateOrganizePlanInput): OrganizePlan

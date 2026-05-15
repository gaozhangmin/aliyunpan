export interface OperationLogItem {
  drive_id: string
  file_id: string
  parent_file_id: string
  before_name: string
  after_name: string
  status: string
}

export interface OperationLog {
  id: string
  type: string
  provider: string
  account_id: string
  started_at?: string
  finished_at?: string
  items: OperationLogItem[]
}

export interface OperationSummary {
  id: string
  type: string
  provider: string
  account_id: string
  started_at?: string
  finished_at?: string
  successCount: number
  failureCount: number
}

export interface OperationLogStore {
  save(operation: OperationLog): Promise<OperationLog>
  list(): Promise<OperationSummary[]>
  get(id: string): Promise<OperationLog | null>
}

export interface UndoRenamePlanItem {
  drive_id: string
  file_id: string
  parent_file_id: string
  old_name: string
  new_name: string
  reason: string
}

export interface UndoRenamePlan {
  version: number
  operation: string
  provider: string
  account_id: string
  created_at: string
  source_operation_id: string
  items: UndoRenamePlanItem[]
}

export function createOperationLogStore(input: { configDir: string }): OperationLogStore
export function createUndoRenamePlan(operation: OperationLog): UndoRenamePlan

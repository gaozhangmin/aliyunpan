export interface RenamePlanValidation {
  ok: boolean
  errors: string[]
  itemCount: number
}

export interface RenamePlanDryRun {
  ok: boolean
  changes: Array<Record<string, unknown>>
  errors: Array<Record<string, unknown>>
}

export function validateRenamePlan(plan: unknown): RenamePlanValidation
export function dryRunRenamePlan(plan: unknown, currentItems?: Array<Record<string, unknown>>): RenamePlanDryRun

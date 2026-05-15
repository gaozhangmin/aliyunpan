import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OPERATIONS_DIR = 'operations'

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
}

function operationSummary(operation) {
  const items = Array.isArray(operation.items) ? operation.items : []
  return {
    id: operation.id,
    type: operation.type,
    provider: operation.provider,
    account_id: operation.account_id,
    started_at: operation.started_at,
    finished_at: operation.finished_at,
    successCount: items.filter((item) => item.status === 'success').length,
    failureCount: items.filter((item) => item.status && item.status !== 'success').length,
  }
}

export function createOperationLogStore({ configDir }) {
  if (!configDir) throw new Error('configDir is required')
  const operationsDir = join(configDir, OPERATIONS_DIR)

  async function ensureDir() {
    await mkdir(operationsDir, { recursive: true, mode: 0o700 })
  }

  return {
    async save(operation) {
      if (!operation?.id) throw new Error('operation.id is required')
      await ensureDir()
      await writeJson(join(operationsDir, `${operation.id}.json`), operation)
      return operation
    },

    async list() {
      await ensureDir()
      const files = (await readdir(operationsDir)).filter((file) => file.endsWith('.json')).sort()
      const operations = await Promise.all(files.map((file) => readJson(join(operationsDir, file))))
      return operations.map(operationSummary)
    },

    async get(id) {
      if (!id) throw new Error('operation id is required')
      try {
        return await readJson(join(operationsDir, `${id}.json`))
      } catch (error) {
        if (error && error.code === 'ENOENT') return null
        throw error
      }
    },
  }
}

export function createUndoRenamePlan(operation) {
  if (!operation || operation.type !== 'rename') throw new Error('Only rename operations can be undone')
  const items = (operation.items || [])
    .filter((item) => item.status === 'success')
    .map((item) => ({
      drive_id: item.drive_id,
      file_id: item.file_id,
      parent_file_id: item.parent_file_id,
      old_name: item.after_name,
      new_name: item.before_name,
      reason: `Undo rename from operation ${operation.id}`,
    }))

  return {
    version: 1,
    operation: 'rename',
    provider: operation.provider,
    account_id: operation.account_id,
    created_at: new Date().toISOString(),
    source_operation_id: operation.id,
    items,
  }
}

export function createUndoMovePlan(operation) {
  if (!operation || operation.type !== 'move') throw new Error('Only move operations can be undone with createUndoMovePlan')
  const items = (operation.items || [])
    .filter((item) => item.status === 'success')
    .map((item) => ({
      drive_id: item.drive_id,
      file_id: item.file_id,
      name: item.name,
      type: item.type,
      from_parent_file_id: item.to_parent_file_id,
      to_parent_file_id: item.from_parent_file_id,
      from_path: item.to_path,
      to_folder_path: item.from_folder_path,
      reason: `Undo move from operation ${operation.id}`,
    }))

  return {
    version: 1,
    operation: 'move',
    provider: operation.provider,
    account_id: operation.account_id,
    created_at: new Date().toISOString(),
    source_operation_id: operation.id,
    items,
  }
}

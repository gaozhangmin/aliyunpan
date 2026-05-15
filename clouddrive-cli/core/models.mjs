export function createFileItem(fields) {
  return {
    provider: fields.provider || '',
    accountId: fields.accountId || '',
    driveId: fields.driveId || '',
    fileId: fields.fileId || '',
    parentFileId: fields.parentFileId || '',
    path: fields.path,
    name: fields.name || '',
    type: fields.type === 'folder' ? 'folder' : 'file',
    size: fields.size,
    contentHash: fields.contentHash,
    mimeType: fields.mimeType,
    category: fields.category,
    updatedAt: fields.updatedAt,
    createdAt: fields.createdAt,
  }
}

export function createRenameResult({ fileId, status, newName, code, message }) {
  return { fileId, status, newName, code, message }
}

export function createOperationLog({ id, type, provider, accountId, startedAt, finishedAt, items }) {
  return {
    id,
    type,
    provider,
    account_id: accountId,
    started_at: startedAt || new Date().toISOString(),
    finished_at: finishedAt || new Date().toISOString(),
    items: items || [],
  }
}

export const EXIT_CODES = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1,
  AUTH_ERROR: 2,
  PROVIDER_API_ERROR: 3,
  PARTIAL_SUCCESS: 4,
  UNSUPPORTED_CAPABILITY: 5,
}

export function classifyError(error) {
  const code = error?.code || ''
  if (code.includes('_AUTH') || code === 'ERR_NO_ACCOUNT') return EXIT_CODES.AUTH_ERROR
  if (code.includes('_HTTP') || code.includes('_API')) return EXIT_CODES.PROVIDER_API_ERROR
  return EXIT_CODES.VALIDATION_ERROR
}

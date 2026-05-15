const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.ts'])

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function extensionOf(name) {
  const index = String(name || '').lastIndexOf('.')
  return index >= 0 ? String(name).slice(index).toLowerCase() : ''
}

function isVideo(item) {
  return item?.type === 'file' && VIDEO_EXTENSIONS.has(extensionOf(item.name))
}

function isEpisodeLike(name) {
  return /s\d{1,2}e\d{1,3}/i.test(String(name || ''))
}

function folderKey(name) {
  return String(name || '').trim().toLocaleLowerCase()
}

export function analyzeDriveItems({ provider = 'aliyun', accountId = 'default', rootFileId = 'root', items = [] } = {}) {
  const normalized = Array.isArray(items) ? items : []
  const files = normalized.filter((item) => item.type !== 'folder')
  const folders = normalized.filter((item) => item.type === 'folder')
  const videos = normalized.filter(isVideo)
  return {
    version: 1,
    provider,
    account_id: accountId,
    root_file_id: rootFileId,
    created_at: new Date().toISOString(),
    stats: {
      totalItems: normalized.length,
      fileCount: files.length,
      folderCount: folders.length,
      videoCount: videos.length,
      totalBytes: files.reduce((sum, item) => sum + (Number(item.size) || 0), 0),
    },
    folders: folders.map((item) => ({
      file_id: item.fileId || item.file_id,
      parent_file_id: item.parentFileId || item.parent_file_id || '',
      name: item.name,
    })),
    files: files.map((item) => ({
      file_id: item.fileId || item.file_id,
      parent_file_id: item.parentFileId || item.parent_file_id || '',
      drive_id: item.driveId || item.drive_id || '',
      name: item.name,
      size: Number(item.size) || 0,
      category: isVideo(item) ? 'video' : (item.category || ''),
      media_kind: isVideo(item) ? (isEpisodeLike(item.name) ? 'episode' : 'movie') : '',
    })),
  }
}

export function createOrganizePlan({ analysis, rulesText = '' } = {}) {
  if (!analysis || typeof analysis !== 'object') throw new Error('analysis is required')
  const rootFileId = analysis.root_file_id || 'root'
  const folderByName = new Map((analysis.folders || []).map((folder) => [folderKey(folder.name), folder]))
  const actions = []

  for (const folderName of ['Movies', 'TV Shows']) {
    if (!folderByName.has(folderKey(folderName))) {
      actions.push({
        type: 'mkdir',
        parent_file_id: rootFileId,
        name: folderName,
        ref: `folder:${folderName}`,
        reason: 'Required media category folder is missing',
      })
    }
  }

  for (const file of analysis.files || []) {
    if (file.category !== 'video') continue
    const targetFolderName = file.media_kind === 'episode' ? 'TV Shows' : 'Movies'
    const existing = folderByName.get(folderKey(targetFolderName))
    const targetParentId = existing?.file_id || ''
    if (targetParentId && file.parent_file_id === targetParentId) continue
    actions.push({
      type: 'move',
      file_id: file.file_id,
      from_parent_file_id: file.parent_file_id,
      to_parent_file_id: targetParentId,
      to_parent_ref: `folder:${targetFolderName}`,
      name: file.name,
      reason: file.media_kind === 'episode'
        ? 'Episode-like video belongs in TV Shows'
        : 'Movie-like video belongs in Movies',
    })
  }

  return {
    version: 1,
    operation: 'organize',
    provider: analysis.provider,
    account_id: analysis.account_id,
    root_file_id: rootFileId,
    created_at: new Date().toISOString(),
    rules: rulesText ? { text: rulesText } : undefined,
    actions,
  }
}

export function validateOrganizePlan(plan) {
  const errors = []
  if (!plan || typeof plan !== 'object') return { ok: false, errors: ['plan must be an object'], actionCount: 0 }
  if (plan.version !== 1) errors.push('version must be 1')
  if (plan.operation !== 'organize') errors.push('operation must be organize')
  if (!hasText(plan.provider)) errors.push('provider is required')
  if (!hasText(plan.account_id)) errors.push('account_id is required')
  if (!Array.isArray(plan.actions)) {
    errors.push('actions must be an array')
  } else {
    plan.actions.forEach((action, index) => {
      if (!['mkdir', 'rename', 'move', 'copy', 'trash'].includes(action?.type)) errors.push(`actions[${index}].type is unsupported`)
      if (action?.type === 'mkdir' && (!hasText(action.parent_file_id) || !hasText(action.name))) errors.push(`actions[${index}] mkdir requires parent_file_id and name`)
      if (action?.type === 'move' && (!hasText(action.file_id) || !hasText(action.from_parent_file_id) || (!hasText(action.to_parent_file_id) && !hasText(action.to_parent_ref)))) errors.push(`actions[${index}] move requires file_id, from_parent_file_id, and target parent`)
      if (action?.type === 'rename' && (!hasText(action.file_id) || !hasText(action.new_name))) errors.push(`actions[${index}] rename requires file_id and new_name`)
    })
  }
  return { ok: errors.length === 0, errors, actionCount: Array.isArray(plan.actions) ? plan.actions.length : 0 }
}

export function dryRunOrganizePlan(plan) {
  const validation = validateOrganizePlan(plan)
  const errors = validation.errors.map((message) => ({ code: 'invalid_organize_plan', message }))
  const actions = Array.isArray(plan?.actions) ? plan.actions : []
  const counts = { mkdir: 0, move: 0, rename: 0, copy: 0, trash: 0 }
  for (const action of actions) {
    if (Object.prototype.hasOwnProperty.call(counts, action.type)) counts[action.type]++
  }
  return {
    ok: errors.length === 0,
    provider: plan?.provider,
    account_id: plan?.account_id,
    actionCount: actions.length,
    counts,
    actions: errors.length === 0 ? actions : [],
    errors,
  }
}

import { aliPost } from './aliyunHttp.mjs'

function mapFileItem(raw, driveId, accountId) {
  return {
    provider: 'aliyun',
    accountId,
    driveId: raw.drive_id || driveId,
    fileId: raw.file_id,
    parentFileId: raw.parent_file_id,
    name: raw.name,
    type: raw.type === 'folder' ? 'folder' : 'file',
    size: raw.size,
    contentHash: raw.content_hash,
    mimeType: raw.mime_type,
    category: raw.category,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  }
}

export async function aliListDir(token, driveId, parentFileId = 'root', marker = '') {
  const accountId = token.user_id
  const data = await aliPost('adrive/v3/file/list', {
    drive_id: driveId,
    parent_file_id: parentFileId,
    marker,
    limit: 100,
    all: false,
    url_expire_sec: 14400,
    fields: '*',
    order_by: 'updated_at',
    order_direction: 'DESC',
  }, token)

  return {
    items: (data.items || []).map((f) => mapFileItem(f, driveId, accountId)),
    nextMarker: data.next_marker || '',
  }
}

export async function aliListAll(token, driveId, parentFileId = 'root') {
  const allItems = []
  let marker = ''
  do {
    const page = await aliListDir(token, driveId, parentFileId, marker)
    allItems.push(...page.items)
    marker = page.nextMarker
  } while (marker)
  return allItems
}

export async function* aliWalk(token, driveId, parentFileId = 'root', maxDepth = 10) {
  const queue = [{ parentFileId, depth: 0 }]
  while (queue.length > 0) {
    const { parentFileId: pid, depth } = queue.shift()
    const items = await aliListAll(token, driveId, pid)
    for (const item of items) {
      yield item
      if (item.type === 'folder' && depth < maxDepth) {
        queue.push({ parentFileId: item.fileId, depth: depth + 1 })
      }
    }
  }
}

export async function aliSearch(token, driveId, query, { limit = 100, orderBy = 'updated_at DESC' } = {}) {
  const accountId = token.user_id
  const allItems = []
  let marker = ''
  do {
    const data = await aliPost('adrive/v3/file/search', {
      drive_id: driveId,
      query,
      marker,
      limit,
      fields: '*',
      order_by: orderBy,
    }, token)
    const items = (data.items || []).map((f) => mapFileItem(f, driveId, accountId))
    allItems.push(...items)
    marker = data.next_marker || ''
  } while (marker)
  return allItems
}

export async function aliRenameBatch(token, driveId, renames) {
  const BATCH_SIZE = 100
  const results = []

  for (let i = 0; i < renames.length; i += BATCH_SIZE) {
    const chunk = renames.slice(i, i + BATCH_SIZE)
    const requests = chunk.map(({ fileId, newName }) => ({
      body: {
        drive_id: driveId,
        file_id: fileId,
        name: newName,
        check_name_mode: 'refuse',
      },
      headers: { 'Content-Type': 'application/json' },
      id: fileId,
      method: 'POST',
      url: '/file/update',
    }))

    const data = await aliPost('adrive/v4/batch', { requests, resource: 'file' }, token)
    const responses = data.responses || []

    for (const res of responses) {
      if (res.status >= 200 && res.status < 300) {
        results.push({ fileId: res.id, status: 'success', newName: res.body?.name })
      } else {
        results.push({
          fileId: res.id,
          status: 'error',
          code: res.body?.code || String(res.status),
          message: res.body?.message || `HTTP ${res.status}`,
        })
      }
    }
  }

  return results
}

export async function aliGetFile(token, driveId, fileId) {
  const accountId = token.user_id
  const data = await aliPost('v2/file/get', { drive_id: driveId, file_id: fileId, fields: '*' }, token)
  return mapFileItem(data, driveId, accountId)
}

export async function aliMove(token, driveId, moves) {
  const BATCH_SIZE = 100
  const results = []
  for (let i = 0; i < moves.length; i += BATCH_SIZE) {
    const chunk = moves.slice(i, i + BATCH_SIZE)
    const requests = chunk.map(({ fileId, toParentId }) => ({
      body: { drive_id: driveId, file_id: fileId, to_drive_id: driveId, to_parent_file_id: toParentId, check_name_mode: 'refuse' },
      headers: { 'Content-Type': 'application/json' },
      id: fileId,
      method: 'POST',
      url: '/file/move',
    }))
    const data = await aliPost('adrive/v4/batch', { requests, resource: 'file' }, token)
    for (const res of data.responses || []) {
      if (res.status >= 200 && res.status < 300) {
        results.push({ fileId: res.id, status: 'success' })
      } else {
        results.push({ fileId: res.id, status: 'error', code: res.body?.code || String(res.status), message: res.body?.message || `HTTP ${res.status}` })
      }
    }
  }
  return results
}

export async function aliMkdir(token, driveId, parentId, name) {
  const accountId = token.user_id
  const data = await aliPost('adrive/v3/file/create', {
    drive_id: driveId,
    name,
    type: 'folder',
    parent_file_id: parentId,
    check_name_mode: 'refuse',
  }, token)
  return mapFileItem({ ...data, parent_file_id: parentId }, driveId, accountId)
}

export async function aliTrash(token, driveId, fileIds) {
  const results = []
  for (const fileId of fileIds) {
    try {
      await aliPost('adrive/v3/file/recyclebin/trash', { drive_id: driveId, file_id: fileId }, token)
      results.push({ fileId, status: 'success' })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

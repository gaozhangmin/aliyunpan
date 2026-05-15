const BASE_API = 'https://api-drive.mypikpak.com'
const BASE_USER = 'https://user.mypikpak.com'
const CLIENT_ID = 'YNxT9w7GMdWvEOKa'
const CLIENT_SECRET = 'dbw2OtmVEeuUvIptb1Coyg'

async function pikpakPost(url, body, token) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' }
  if (token?.access_token) headers['Authorization'] = `Bearer ${token.access_token}`
  if (token?.device_id) headers['X-Device-Id'] = token.device_id
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`PikPak API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_PIKPAK_HTTP'
    err.status = resp.status
    throw err
  }
  return resp.json()
}

async function pikpakGet(url, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token?.access_token) headers['Authorization'] = `Bearer ${token.access_token}`
  if (token?.device_id) headers['X-Device-Id'] = token.device_id
  const resp = await fetch(url, { headers })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`PikPak API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_PIKPAK_HTTP'
    throw err
  }
  return resp.json()
}

async function pikpakPatch(url, body, token) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${token.access_token}`,
  }
  if (token.device_id) headers['X-Device-Id'] = token.device_id
  const resp = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`PikPak API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_PIKPAK_HTTP'
    throw err
  }
  return resp.json()
}

export async function pikpakRefreshToken(token) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' }
  if (token.device_id) headers['X-Device-Id'] = token.device_id
  const resp = await fetch(`${BASE_USER}/v1/auth/token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ client_id: CLIENT_ID, refresh_token: token.refresh_token, grant_type: 'refresh_token' }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`PikPak token refresh failed ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_PIKPAK_AUTH'
    throw err
  }
  const data = await resp.json()
  return {
    ...token,
    access_token: data.access_token,
    refresh_token: data.refresh_token || token.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type || 'Bearer',
  }
}

function mapFileItem(raw, accountId) {
  const isFolder = (raw.kind || '').includes('folder')
  return {
    provider: 'pikpak',
    accountId,
    driveId: 'pikpak',
    fileId: raw.id,
    parentFileId: raw.parent_id || '',
    name: raw.name,
    type: isFolder ? 'folder' : 'file',
    size: raw.size != null ? Number(raw.size) : undefined,
    mimeType: raw.mime_type,
    updatedAt: raw.modified_time,
    createdAt: raw.created_time,
  }
}

export async function pikpakListDir(token, parentFileId = '') {
  const accountId = token.user_id
  const params = new URLSearchParams({
    thumbnail_size: 'SIZE_MEDIUM',
    limit: '100',
    with_audit: 'true',
    filters: JSON.stringify({ trashed: { eq: false }, phase: { eq: 'PHASE_TYPE_COMPLETE' } }),
  })
  if (parentFileId) params.set('parent_id', parentFileId)

  const allItems = []
  let pageToken = ''
  do {
    if (pageToken) params.set('page_token', pageToken)
    const data = await pikpakGet(`${BASE_API}/drive/v1/files?${params}`, token)
    for (const f of data.files || []) allItems.push(mapFileItem(f, accountId))
    pageToken = data.next_page_token || ''
  } while (pageToken)

  return allItems
}

export async function* pikpakWalk(token, parentFileId = '', maxDepth = 10) {
  const queue = [{ parentFileId, depth: 0 }]
  while (queue.length > 0) {
    const { parentFileId: pid, depth } = queue.shift()
    const items = await pikpakListDir(token, pid)
    for (const item of items) {
      yield item
      if (item.type === 'folder' && depth < maxDepth) {
        queue.push({ parentFileId: item.fileId, depth: depth + 1 })
      }
    }
  }
}

export async function pikpakSearch(token, keyword, { limit = 100 } = {}) {
  const accountId = token.user_id
  const params = new URLSearchParams({
    thumbnail_size: 'SIZE_MEDIUM',
    limit: String(Math.min(limit, 100)),
    q: `name contains '${keyword.replace(/'/g, "\\'")}'`,
    filters: JSON.stringify({ trashed: { eq: false } }),
  })
  const allItems = []
  let pageToken = ''
  do {
    if (pageToken) params.set('page_token', pageToken)
    const data = await pikpakGet(`${BASE_API}/drive/v1/files?${params}`, token)
    for (const f of data.files || []) allItems.push(mapFileItem(f, accountId))
    pageToken = data.next_page_token || ''
  } while (pageToken && allItems.length < limit)
  return allItems.slice(0, limit)
}

export async function pikpakRenameFile(token, fileId, newName) {
  const data = await pikpakPatch(`${BASE_API}/drive/v1/files/${fileId}`, { name: newName }, token)
  const file = data.file || data
  return { fileId: file.id || fileId, status: 'success', newName: file.name || newName }
}

export async function pikpakRenameBatch(token, renames) {
  const results = []
  for (const { fileId, newName } of renames) {
    try {
      results.push(await pikpakRenameFile(token, fileId, newName))
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

export async function pikpakGetFile(token, fileId) {
  const accountId = token.user_id
  const data = await pikpakGet(`${BASE_API}/drive/v1/files/${fileId}`, token)
  return mapFileItem(data.file || data, accountId)
}

export async function pikpakMoveBatch(token, moves) {
  const results = []
  for (const { fileId, toParentId } of moves) {
    try {
      await pikpakPatch(`${BASE_API}/drive/v1/files/${fileId}`, { parent_id: toParentId }, token)
      results.push({ fileId, status: 'success' })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

export async function pikpakMkdir(token, parentId, name) {
  const accountId = token.user_id
  const data = await pikpakPost(`${BASE_API}/drive/v1/files`, {
    kind: 'drive#folder',
    name,
    parent_id: parentId || '',
  }, token)
  const file = data.file || data
  return mapFileItem({ ...file, kind: 'drive#folder' }, accountId)
}

export async function pikpakTrash(token, fileIds) {
  if (fileIds.length === 0) return []
  try {
    await pikpakPost(`${BASE_API}/drive/v1/files:batchTrash`, { ids: fileIds }, token)
    return fileIds.map((fileId) => ({ fileId, status: 'success' }))
  } catch (e) {
    return fileIds.map((fileId) => ({ fileId, status: 'error', code: e.code || 'ERR', message: e.message }))
  }
}

const BASE = 'https://api.dropboxapi.com/2'
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'

function dropboxHeaders(token) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
}

async function dropboxRpc(endpoint, body, token) {
  const resp = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: dropboxHeaders(token),
    body: body == null ? '' : JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Dropbox API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_DROPBOX_HTTP'
    err.status = resp.status
    throw err
  }
  const text = await resp.text()
  return text ? JSON.parse(text) : {}
}

export async function dropboxRefreshToken(token) {
  const appKey = token.device_id || ''
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: appKey,
  })
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Dropbox token refresh failed ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_DROPBOX_AUTH'
    throw err
  }
  const data = await resp.json()
  return { ...token, access_token: data.access_token, expires_in: data.expires_in, token_type: data.token_type || 'Bearer' }
}

function mapFileItem(entry, accountId) {
  const isFolder = entry['.tag'] === 'folder'
  return {
    provider: 'dropbox',
    accountId,
    driveId: 'dropbox',
    fileId: entry.id || entry.path_display || entry.path_lower || '',
    parentFileId: entry.path_display ? entry.path_display.split('/').slice(0, -1).join('/') || '/' : '/',
    path: entry.path_display,
    name: entry.name,
    type: isFolder ? 'folder' : 'file',
    size: entry.size,
    contentHash: entry.content_hash,
    updatedAt: entry.server_modified,
  }
}

export async function dropboxListDir(token, path = '') {
  const accountId = token.user_id
  const allItems = []
  let data = await dropboxRpc('/files/list_folder', {
    path,
    recursive: false,
    include_media_info: false,
    include_deleted: false,
    include_has_explicit_shared_members: false,
    include_mounted_folders: true,
    limit: 500,
  }, token)
  for (const e of data.entries || []) {
    if (e['.tag'] !== 'deleted') allItems.push(mapFileItem(e, accountId))
  }
  while (data.has_more && data.cursor) {
    data = await dropboxRpc('/files/list_folder/continue', { cursor: data.cursor }, token)
    for (const e of data.entries || []) {
      if (e['.tag'] !== 'deleted') allItems.push(mapFileItem(e, accountId))
    }
  }
  return allItems
}

export async function* dropboxWalk(token, path = '', maxDepth = 10) {
  const queue = [{ path, depth: 0 }]
  while (queue.length > 0) {
    const { path: p, depth } = queue.shift()
    const items = await dropboxListDir(token, p)
    for (const item of items) {
      yield item
      if (item.type === 'folder' && depth < maxDepth) {
        queue.push({ path: item.path || `/${item.name}`, depth: depth + 1 })
      }
    }
  }
}

export async function dropboxSearch(token, keyword, { limit = 100 } = {}) {
  const accountId = token.user_id
  const allItems = []
  let cursor = null
  do {
    const data = cursor
      ? await dropboxRpc('/files/search/continue_v2', { cursor }, token)
      : await dropboxRpc('/files/search_v2', {
          query: keyword,
          options: { max_results: Math.min(limit, 200), file_status: 'active' },
        }, token)
    for (const match of data.matches || []) {
      const meta = match.metadata?.metadata
      if (meta && meta['.tag'] !== 'deleted') allItems.push(mapFileItem(meta, accountId))
    }
    cursor = data.has_more ? data.cursor : null
  } while (cursor && allItems.length < limit)
  return allItems.slice(0, limit)
}

export async function dropboxRenameBatch(token, renames) {
  const results = []
  for (const { fileId, newName } of renames) {
    try {
      const fromPath = fileId.startsWith('/') ? fileId : `/${fileId}`
      const parentPath = fromPath.split('/').slice(0, -1).join('/') || '/'
      const toPath = `${parentPath}/${newName}`
      const data = await dropboxRpc('/files/move_v2', {
        from_path: fromPath,
        to_path: toPath,
        allow_shared_folder: true,
        autorename: false,
        allow_ownership_transfer: false,
      }, token)
      const meta = data.metadata || data
      results.push({ fileId, status: 'success', newName: meta.name || newName })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

export async function dropboxGetFile(token, fileId) {
  const accountId = token.user_id
  const path = fileId.startsWith('id:') || fileId.startsWith('/') ? fileId : `/${fileId}`
  const data = await dropboxRpc('/files/get_metadata', { path }, token)
  return mapFileItem(data, accountId)
}

export async function dropboxMove(token, moves) {
  const results = []
  for (const { fileId, fromPath, toFolderPath, name } of moves) {
    try {
      const from = fromPath || (fileId.startsWith('/') ? fileId : `/${fileId}`)
      const to = `${toFolderPath}/${name}`.replace(/\/+/g, '/')
      const data = await dropboxRpc('/files/move_v2', {
        from_path: from,
        to_path: to,
        allow_shared_folder: true,
        autorename: false,
        allow_ownership_transfer: false,
      }, token)
      const meta = data.metadata || data
      results.push({ fileId, status: 'success', newPath: meta.path_display || to })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

export async function dropboxMkdir(token, parentPath, name) {
  const accountId = token.user_id
  const path = `${parentPath}/${name}`.replace(/\/+/g, '/')
  const data = await dropboxRpc('/files/create_folder_v2', { path, autorename: false }, token)
  const meta = data.metadata || data
  return mapFileItem({ ...meta, '.tag': 'folder' }, accountId)
}

export async function dropboxDelete(token, items) {
  const results = []
  for (const { fileId, path } of items) {
    try {
      const p = path || (fileId.startsWith('/') ? fileId : `/${fileId}`)
      await dropboxRpc('/files/delete_v2', { path: p }, token)
      results.push({ fileId, status: 'success' })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

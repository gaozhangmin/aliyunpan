const BASE = 'https://pan.baidu.com/rest/2.0/xpan'
const TOKEN_URL = 'https://openapi.baidu.com/oauth/2.0/token'
const CLIENT_ID = ''
const CLIENT_SECRET = ''

async function baiduGet(path, params, token) {
  const qs = new URLSearchParams({ ...params, access_token: token.access_token })
  const resp = await fetch(`${BASE}${path}?${qs}`, {
    headers: { 'User-Agent': 'pan.baidu.com' },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Baidu API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_BAIDU_HTTP'
    err.status = resp.status
    throw err
  }
  const data = await resp.json()
  if (data.errno != null && data.errno !== 0) {
    const err = new Error(`Baidu API error errno=${data.errno}: ${data.errmsg || ''}`)
    err.code = 'ERR_BAIDU_API'
    err.errno = data.errno
    throw err
  }
  return data
}

async function baiduPost(path, queryParams, formBody, token) {
  const qs = new URLSearchParams({ ...queryParams, access_token: token.access_token })
  const resp = await fetch(`${BASE}${path}?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'pan.baidu.com' },
    body: new URLSearchParams(formBody).toString(),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Baidu API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_BAIDU_HTTP'
    throw err
  }
  const data = await resp.json()
  if (data.errno != null && data.errno !== 0) {
    const err = new Error(`Baidu API error errno=${data.errno}`)
    err.code = 'ERR_BAIDU_API'
    err.errno = data.errno
    throw err
  }
  return data
}

export async function baiduRefreshToken(token) {
  const clientId = CLIENT_ID || token.client_id || ''
  const clientSecret = CLIENT_SECRET || token.client_secret || ''
  const qs = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const resp = await fetch(`${TOKEN_URL}?${qs}`)
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`Baidu token refresh failed ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_BAIDU_AUTH'
    throw err
  }
  const data = await resp.json()
  if (data.error) {
    const err = new Error(`Baidu token refresh error: ${data.error_description || data.error}`)
    err.code = 'ERR_BAIDU_AUTH'
    throw err
  }
  return { ...token, access_token: data.access_token, refresh_token: data.refresh_token || token.refresh_token, expires_in: data.expires_in }
}

function mapFileItem(item, accountId) {
  return {
    provider: 'baidu',
    accountId,
    driveId: 'baidu',
    fileId: String(item.fs_id),
    parentFileId: item.path ? item.path.split('/').slice(0, -1).join('/') || '/' : '/',
    path: item.path,
    name: item.server_filename || item.filename || '',
    type: item.isdir === 1 ? 'folder' : 'file',
    size: item.size,
    contentHash: item.md5,
    updatedAt: item.server_mtime ? new Date(item.server_mtime * 1000).toISOString() : undefined,
    createdAt: item.server_ctime ? new Date(item.server_ctime * 1000).toISOString() : undefined,
  }
}

export async function baiduListDir(token, dirPath = '/') {
  const accountId = token.user_id
  const allItems = []
  let start = 0
  const limit = 1000
  while (true) {
    const data = await baiduGet('/file', { method: 'list', dir: dirPath, order: 'name', start, limit, web: '1', folder: '0', desc: '0' }, token)
    for (const item of data.list || []) allItems.push(mapFileItem(item, accountId))
    if (!data.list || data.list.length < limit) break
    start += limit
  }
  return allItems
}

export async function* baiduWalk(token, dirPath = '/', maxDepth = 10) {
  const queue = [{ dirPath, depth: 0 }]
  while (queue.length > 0) {
    const { dirPath: dp, depth } = queue.shift()
    const items = await baiduListDir(token, dp)
    for (const item of items) {
      yield item
      if (item.type === 'folder' && depth < maxDepth && item.path) {
        queue.push({ dirPath: item.path, depth: depth + 1 })
      }
    }
  }
}

export async function baiduSearch(token, keyword, { limit = 500 } = {}) {
  const accountId = token.user_id
  const allItems = []
  let page = 1
  const num = Math.min(limit, 1000)
  while (allItems.length < limit) {
    const data = await baiduGet('/file', {
      method: 'search', key: keyword, dir: '/', recursion: '1',
      num: String(num), page: String(page), web: '1',
    }, token)
    for (const item of data.list || []) allItems.push(mapFileItem(item, accountId))
    if (!data.list || data.list.length < num) break
    page++
  }
  return allItems.slice(0, limit)
}

export async function baiduRenameBatch(token, renames) {
  if (renames.length === 0) return []
  const filelist = renames.map(({ filePath, newName }) => ({ path: filePath, newname: newName }))
  const data = await baiduPost(
    '/file',
    { method: 'filemanager', opera: 'rename' },
    { async: '1', ondup: 'overwrite', filelist: JSON.stringify(filelist) },
    token
  )
  return renames.map((r, i) => {
    const info = (data.info || [])[i]
    if (info && info.errno === 0) return { fileId: r.fileId, status: 'success', newName: r.newName }
    return { fileId: r.fileId, status: 'error', code: String(info?.errno || 'ERR'), message: `errno=${info?.errno}` }
  })
}

export async function baiduGetFile(token, fsId) {
  const accountId = token.user_id
  const data = await baiduGet('/multimedia', {
    method: 'filemetas',
    fsids: JSON.stringify([Number(fsId)]),
    dlink: '1',
    thumb: '1',
    extra: '1',
    needmedia: '1',
    detail: '1',
  }, token)
  const metas = Array.isArray(data.list) ? data.list : Array.isArray(data.info) ? data.info : []
  const item = metas[0]
  if (!item) {
    const err = new Error(`File not found: ${fsId}`)
    err.code = 'ERR_BAIDU_NOT_FOUND'
    throw err
  }
  return mapFileItem(item, accountId)
}

export async function baiduMove(token, moves) {
  if (moves.length === 0) return []
  const filelist = moves.map(({ fromPath, toFolderPath, name }) => ({ path: fromPath, dest: toFolderPath, newname: name }))
  const data = await baiduPost(
    '/file',
    { method: 'filemanager', opera: 'move' },
    { async: '1', ondup: 'overwrite', filelist: JSON.stringify(filelist) },
    token
  )
  return moves.map((m, i) => {
    const info = (data.info || [])[i]
    if (info && info.errno === 0) return { fileId: m.fileId, status: 'success' }
    return { fileId: m.fileId, status: 'error', code: String(info?.errno || 'ERR'), message: `errno=${info?.errno}` }
  })
}

export async function baiduMkdir(token, parentPath, name) {
  const accountId = token.user_id
  const fullPath = `${parentPath}/${name}`.replace(/\/+/g, '/')
  const data = await baiduPost(
    '/file',
    { method: 'create' },
    { path: fullPath, isdir: '1', block_list: '[]' },
    token
  )
  return mapFileItem({ fs_id: data.fs_id, path: data.path || fullPath, isdir: 1, server_filename: name }, accountId)
}

export async function baiduTrash(token, items) {
  if (items.length === 0) return []
  const filelist = items.map(({ path }) => path).filter(Boolean)
  if (filelist.length === 0) {
    const err = new Error('Baidu trash requires file paths; add "path" field to plan items')
    err.code = 'ERR_BAIDU_NO_PATH'
    throw err
  }
  const data = await baiduPost(
    '/file',
    { method: 'filemanager', opera: 'delete' },
    { async: '1', filelist: JSON.stringify(filelist) },
    token
  )
  return items.map((item, i) => {
    const info = (data.info || [])[i]
    if (info && info.errno === 0) return { fileId: item.fileId, status: 'success' }
    return { fileId: item.fileId, status: 'error', code: String(info?.errno || 'ERR'), message: `errno=${info?.errno}` }
  })
}

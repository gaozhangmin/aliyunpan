const BASE = 'https://proapi.115.com/open'
const REFRESH_URL = 'https://passportapi.115.com/open/refreshToken'
const CLIENT_ID = '100195153'
const CLIENT_SECRET = 'ba2656d8fd7ef83a39283e7dfc9dc4fb'

function drive115Headers(token) {
  return { 'Authorization': `Bearer ${token.access_token}` }
}

async function drive115Get(url, token) {
  const resp = await fetch(url, { headers: drive115Headers(token) })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`115 API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_115_HTTP'
    err.status = resp.status
    throw err
  }
  const data = await resp.json()
  if (data.code != null && data.code !== 0) {
    const err = new Error(`115 API error code=${data.code}: ${data.message || ''}`)
    err.code = 'ERR_115_API'
    throw err
  }
  return data
}

async function drive115Post(url, formBody, token) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { ...drive115Headers(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formBody).toString(),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`115 API ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_115_HTTP'
    throw err
  }
  const data = await resp.json()
  if (data.code != null && data.code !== 0) {
    const err = new Error(`115 API error code=${data.code}: ${data.message || ''}`)
    err.code = 'ERR_115_API'
    throw err
  }
  return data
}

export async function drive115RefreshToken(token) {
  const resp = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: token.refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }).toString(),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error(`115 token refresh failed ${resp.status}: ${text.slice(0, 200)}`)
    err.code = 'ERR_115_AUTH'
    throw err
  }
  const data = await resp.json()
  if (data.code != null && data.code !== 0) {
    const err = new Error(`115 token refresh error: ${data.message || data.code}`)
    err.code = 'ERR_115_AUTH'
    throw err
  }
  return { ...token, access_token: data.data?.access_token || data.access_token, refresh_token: data.data?.refresh_token || data.refresh_token || token.refresh_token, expires_in: data.data?.expires_in || data.expires_in }
}

function mapFileItem(item, accountId) {
  const isFolder = item.fc === '1' || item.isdir === 1 || (!item.fid && !!item.cid)
  return {
    provider: '115',
    accountId,
    driveId: '115',
    fileId: String(item.fid || item.cid || item.file_id || ''),
    parentFileId: String(item.pid || item.parent_id || '0'),
    name: item.n || item.fn || item.file_name || '',
    type: isFolder ? 'folder' : 'file',
    size: item.s != null ? Number(item.s) : undefined,
    contentHash: item.sha,
    updatedAt: item.te ? new Date(Number(item.te) * 1000).toISOString() : undefined,
    createdAt: item.tp ? new Date(Number(item.tp) * 1000).toISOString() : undefined,
  }
}

export async function drive115ListDir(token, cid = '0') {
  const accountId = token.user_id
  const allItems = []
  let offset = 0
  const limit = 200
  while (true) {
    const qs = new URLSearchParams({ cid, limit: String(limit), offset: String(offset), cur: '1', show_dir: '1' })
    const data = await drive115Get(`${BASE}/ufile/files?${qs}`, token)
    for (const item of data.data || []) allItems.push(mapFileItem(item, accountId))
    offset += limit
    if (offset >= (data.count || 0)) break
  }
  return allItems
}

export async function* drive115Walk(token, cid = '0', maxDepth = 10) {
  const queue = [{ cid, depth: 0 }]
  while (queue.length > 0) {
    const { cid: c, depth } = queue.shift()
    const items = await drive115ListDir(token, c)
    for (const item of items) {
      yield item
      if (item.type === 'folder' && depth < maxDepth) {
        queue.push({ cid: item.fileId, depth: depth + 1 })
      }
    }
  }
}

export async function drive115Search(token, keyword, { limit = 200 } = {}) {
  const accountId = token.user_id
  const allItems = []
  let offset = 0
  const pageSize = Math.min(limit, 200)
  while (allItems.length < limit) {
    const qs = new URLSearchParams({ search_value: keyword, limit: String(pageSize), offset: String(offset), show_dir: '1' })
    const data = await drive115Get(`${BASE}/ufile/search?${qs}`, token)
    for (const item of data.data || []) allItems.push(mapFileItem(item, accountId))
    offset += pageSize
    if (!data.data || data.data.length < pageSize) break
  }
  return allItems.slice(0, limit)
}

export async function drive115RenameBatch(token, renames) {
  const results = []
  for (const { fileId, newName } of renames) {
    try {
      await drive115Post(`${BASE}/ufile/update`, { file_id: fileId, file_name: newName }, token)
      results.push({ fileId, status: 'success', newName })
    } catch (e) {
      results.push({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })
    }
  }
  return results
}

export async function drive115GetFile(token, fileId) {
  const accountId = token.user_id
  const qs = new URLSearchParams({ file_id: fileId, cid: '', limit: '1', show_dir: '1' })
  const data = await drive115Get(`${BASE}/ufile/files?${qs}`, token)
  const item = (data.data || [])[0]
  if (!item) {
    const err = new Error(`File not found: ${fileId}`)
    err.code = 'ERR_115_NOT_FOUND'
    throw err
  }
  return mapFileItem(item, accountId)
}

export async function drive115MoveBatch(token, moves) {
  if (moves.length === 0) return []
  const groups = new Map()
  for (const m of moves) {
    const key = m.toParentId
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(m)
  }
  const results = []
  for (const [toParentId, group] of groups) {
    try {
      const formBody = { pid: String(toParentId) }
      group.forEach(({ fileId }, i) => { formBody[`fid[${i}]`] = String(fileId) })
      await drive115Post(`${BASE}/ufile/move`, formBody, token)
      results.push(...group.map(({ fileId }) => ({ fileId, status: 'success' })))
    } catch (e) {
      results.push(...group.map(({ fileId }) => ({ fileId, status: 'error', code: e.code || 'ERR', message: e.message })))
    }
  }
  return results
}

export async function drive115Mkdir(token, parentId, name) {
  const accountId = token.user_id
  const data = await drive115Post(`${BASE}/ufile/mkdir`, { cid: String(parentId), cname: name }, token)
  return {
    provider: '115',
    accountId,
    driveId: '115',
    fileId: String(data.file_id || data.cid || ''),
    parentFileId: String(parentId),
    name,
    type: 'folder',
  }
}

export async function drive115Trash(token, fileIds) {
  if (fileIds.length === 0) return []
  const formBody = {}
  fileIds.forEach((id, i) => { formBody[`fid[${i}]`] = String(id) })
  await drive115Post(`${BASE}/ufile/delete`, formBody, token)
  return fileIds.map((fileId) => ({ fileId, status: 'success' }))
}

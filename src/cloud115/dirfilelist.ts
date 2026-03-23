import { humanDateTimeDateStr, humanSize } from '../utils/format'
import { HanToPin } from '../utils/utils'
import type { IAliGetFileModel } from '../aliapi/alimodels'
import getFileIcon from '../aliapi/fileicon'
import UserDAL from '../user/userdal'
import message from '../utils/message'

export type Drive115FileItem = {
  fid: string | number
  pid: string | number
  fc: string | number
  fn: string
  fs?: number
  upt?: number
  uet?: number
  uppt?: number
  ico?: string
}

export type Drive115FileListResp = {
  state: boolean
  code: number
  message: string
  data?: Drive115FileItem[]
}

const API_URL = 'https://proapi.115.com/open/ufile/files'
const SEARCH_URL = 'https://proapi.115.com/open/ufile/search'

const toTime = (val?: number | string) => {
  if (val === undefined || val === null) return 0
  const n = Number(val)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n < 1000000000000 ? n * 1000 : n
}

export const apiDrive115FileList = async (
  user_id: string,
  cid: string | number,
  limit = 200,
  offset = 0,
  showDir = true
): Promise<Drive115FileItem[]> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)
    if (dbToken) {
      token = dbToken
    }
  }
  if (!token?.access_token) {
    message.error('未登录 115 网盘')
    return []
  }
  const params = new URLSearchParams()
  params.set('cid', String(cid))
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  params.set('cur', '1')
  params.set('show_dir', showDir ? '1' : '0')
  const url = `${API_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  })
  if (!resp.ok) {
    message.error('获取 115 网盘文件列表失败')
    return []
  }
  const data = (await resp.json()) as Drive115FileListResp
  if (data?.code !== 0 || !Array.isArray(data.data)) {
    if (data?.message) message.error(data.message)
    else message.error('获取 115 网盘文件列表失败')
    return []
  }
  return data.data
}

export const mapDrive115FileToAliModel = (item: Drive115FileItem, drive_id: string): IAliGetFileModel => {
  const isDir = String(item.fc) === '0'
  const name = item.fn || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const time = toTime(item.upt || item.uet || item.uppt)
  const timeStr = time ? humanDateTimeDateStr(new Date(time).toISOString()) : ''
  const size = Number(item.fs || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id,
    file_id: String(item.fid),
    parent_file_id: String(item.pid),
    name: name,
    namesearch: HanToPin(name),
    ext: ext,
    mime_type: '',
    mime_extension: ext,
    category,
    icon,
    file_count: 0,
    size,
    sizeStr: humanSize(size),
    time,
    timeStr,
    starred: false,
    isDir,
    thumbnail: '',
    description: ''
  }
}

export type Drive115SearchItem = {
  file_id: string
  parent_id: string
  file_name: string
  file_size?: string | number
  user_utime?: string | number
  file_category?: string
  ico?: string
}

export type Drive115SearchResp = {
  state: boolean
  code: number
  message: string
  count?: number
  data?: Drive115SearchItem[]
}

export type Drive115TrashItem = {
  id: string
  file_name: string
  type: string
  file_size?: string | number
  dtime?: string | number
  cid?: number
  parent_name?: string
  pick_code?: string
}

export const apiDrive115Search = async (
  user_id: string,
  searchValue: string,
  limit = 200,
  offset = 0
): Promise<{ items: Drive115SearchItem[]; total: number }> => {
  const token = UserDAL.GetUserToken(user_id)
  if (!token.access_token) {
    message.error('未登录 115 网盘')
    return { items: [], total: 0 }
  }
  const params = new URLSearchParams()
  params.set('search_value', searchValue)
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  const url = `${SEARCH_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  })
  if (!resp.ok) {
    message.error('获取 115 网盘搜索结果失败')
    return { items: [], total: 0 }
  }
  const data = (await resp.json()) as Drive115SearchResp
  if (data?.code !== 0 || !Array.isArray(data.data)) return { items: [], total: 0 }
  return { items: data.data, total: Number(data.count || data.data.length) }
}

export const mapDrive115SearchToAliModel = (item: Drive115SearchItem, drive_id: string): IAliGetFileModel => {
  const isDir = String(item.file_category) !== '1'
  const name = item.file_name || ''
  const ext = isDir ? '' : (item.ico || name.split('.').pop() || '')
  const time = toTime(item.user_utime)
  const timeStr = time ? humanDateTimeDateStr(new Date(time).toISOString()) : ''
  const size = Number(item.file_size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id,
    file_id: String(item.file_id),
    parent_file_id: String(item.parent_id),
    name: name,
    namesearch: HanToPin(name),
    ext: ext,
    mime_type: '',
    mime_extension: ext,
    category,
    icon,
    file_count: 0,
    size,
    sizeStr: humanSize(size),
    time,
    timeStr,
    starred: false,
    isDir,
    thumbnail: '',
    description: ''
  }
}

export const mapDrive115TrashToAliModel = (item: Drive115TrashItem, drive_id: string): IAliGetFileModel => {
  const isDir = String(item.type) === '2'
  const name = item.file_name || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const time = toTime(item.dtime)
  const timeStr = time ? humanDateTimeDateStr(new Date(time).toISOString()) : ''
  const size = Number(item.file_size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id,
    file_id: String(item.id),
    parent_file_id: String(item.cid || ''),
    name: name,
    namesearch: HanToPin(name),
    ext: ext,
    mime_type: '',
    mime_extension: ext,
    category,
    icon,
    file_count: 0,
    size,
    sizeStr: humanSize(size),
    time,
    timeStr,
    starred: false,
    isDir,
    thumbnail: '',
    description: ''
  }
}

export const mapDrive115DetailToAliModel = (detail: {
  file_id: string
  name: string
  size: number
  isDir: boolean
  updated_at: string
  created_at: string
  play_long?: number
}, drive_id: string): IAliGetFileModel => {
  const isDir = detail.isDir
  const name = detail.name || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const timeStr = humanDateTimeDateStr(detail.updated_at || detail.created_at || '')
  const time = new Date(detail.updated_at || detail.created_at || '').getTime()
  const size = Number(detail.size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id,
    file_id: String(detail.file_id),
    parent_file_id: '',
    name: name,
    namesearch: HanToPin(name),
    ext: ext,
    mime_type: '',
    mime_extension: ext,
    category,
    icon,
    file_count: 0,
    size,
    sizeStr: humanSize(size),
    time,
    timeStr,
    starred: false,
    isDir,
    thumbnail: '',
    description: ''
  }
}

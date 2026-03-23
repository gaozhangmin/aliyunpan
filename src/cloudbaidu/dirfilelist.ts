import type { IAliGetFileModel } from '../aliapi/alimodels'
import getFileIcon from '../aliapi/fileicon'
import { HanToPin } from '../utils/utils'
import { humanDateTimeDateStr, humanSize } from '../utils/format'
import UserDAL from '../user/userdal'
import message from '../utils/message'

export type BaiduFileItem = {
  fs_id: number
  path: string
  server_filename: string
  size: number
  server_mtime: number
  server_ctime: number
  local_mtime?: number
  local_ctime?: number
  isdir: number
  category?: number
  md5?: string
  dir_empty?: number
  thumbs?: { url1?: string; url2?: string; url3?: string }
}

export type BaiduFileListResp = {
  errno: number
  list?: BaiduFileItem[]
}

const API_URL = 'https://pan.baidu.com/rest/2.0/xpan/file'

export const apiBaiduFileList = async (
  user_id: string,
  dir: string,
  order = 'name',
  start = 0,
  limit = 1000
): Promise<BaiduFileItem[]> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token) {
    message.error('未登录百度网盘')
    return []
  }
  const params = new URLSearchParams({
    method: 'list',
    access_token: token.access_token,
    dir: dir || '/',
    order,
    start: String(start),
    limit: String(limit),
    web: '1',
    folder: '0',
    desc: '0'
  })
  const url = `${API_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) {
    message.error('获取百度网盘文件列表失败')
    return []
  }
  const data = (await resp.json()) as BaiduFileListResp
  if (data?.errno !== 0 || !Array.isArray(data.list)) return []
  return data.list
}

export const apiBaiduSearch = async (
  user_id: string,
  keyword: string,
  dir = '/',
  recursion = true
): Promise<BaiduFileItem[]> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token) {
    message.error('未登录百度网盘')
    return []
  }
  if (!keyword) return []
  const params = new URLSearchParams({
    method: 'search',
    access_token: token.access_token,
    key: keyword,
    dir: dir || '/',
    num: '500',
    web: '1'
  })
  if (recursion) params.set('recursion', '1')
  const url = `${API_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'pan.baidu.com'
    }
  })
  if (!resp.ok) {
    message.error('获取百度网盘搜索结果失败')
    return []
  }
  const data = (await resp.json()) as BaiduFileListResp & { has_more?: number }
  if (data?.errno !== 0 || !Array.isArray(data.list)) return []
  return data.list
}

export const mapBaiduFileToAliModel = (item: BaiduFileItem, drive_id: string, parentDir: string): IAliGetFileModel => {
  const isDir = item.isdir === 1
  const name = item.server_filename || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const time = (item.server_mtime || item.server_ctime || 0) * 1000
  const timeStr = time ? humanDateTimeDateStr(new Date(time).toISOString()) : ''
  const size = Number(item.size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  const thumbnail = item.thumbs?.url2 || item.thumbs?.url1 || item.thumbs?.url3 || ''
  const description = item.fs_id ? `baidu_fsid:${item.fs_id};baidu_path:${item.path || ''}` : ''
  return {
    __v_skip: true,
    drive_id,
    file_id:  String(item.fs_id) || '',
    parent_file_id: parentDir,
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
    thumbnail,
    path: item.path || '',
    description
  }
}

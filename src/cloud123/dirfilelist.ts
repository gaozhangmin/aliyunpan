import { humanDateTimeDateStr, humanSize } from '../utils/format'
import { HanToPin } from '../utils/utils'
import type { IAliGetFileModel } from '../aliapi/alimodels'
import getFileIcon from '../aliapi/fileicon'
import UserDAL from '../user/userdal'
import message from '../utils/message'

export type Cloud123FileItem = {
  fileId: number
  filename: string
  parentFileId: number
  type: number
  size: number
  category: number
  status: number
  trashed: number
  createAt?: string
  updateAt?: string
}

export type Cloud123FileListResp = {
  code: number
  message: string
  data?: {
    lastFileId: number
    fileList: Cloud123FileItem[]
  }
}

const API_URL = 'https://open-api.123pan.com/api/v2/file/list'

export const apiCloud123FileList = async (
  user_id: string,
  parentFileId: string | number,
  limit = 100,
  trashed: boolean = false,
  searchData: string = '',
  searchMode: number = 0
): Promise<Cloud123FileItem[]> => {
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)

    if (dbToken) {

      token = dbToken

    }
  }
  if (!token?.access_token) {
    message.error('未登录 123 网盘')
    return []
  }
  const params = new URLSearchParams()
  params.set('parentFileId', String(parentFileId))
  params.set('limit', String(limit))
  params.set('trashed', trashed ? '1' : '0')
  if (searchData) {
    params.set('parentFileId', '0')
    params.set('searchData', searchData)
    params.set('searchMode', String(searchMode))
  }
  const url = `${API_URL}?${params.toString()}`
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.access_token}`,
      Platform: 'open_platform'
    }
  })
  if (!resp.ok) {
    message.error('获取 123 网盘文件列表失败')
    return []
  }
  const data = (await resp.json()) as Cloud123FileListResp
  if (data.code !== 0 || !data.data?.fileList) return []
  if (trashed) return data.data.fileList.filter((item) => item.trashed === 1)
  return data.data.fileList.filter((item) => item.trashed !== 1)
}

export const mapCloud123FileToAliModel = (item: Cloud123FileItem): IAliGetFileModel => {
  const isDir = item.type === 1
  const name = item.filename
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const timeStr = humanDateTimeDateStr(item.updateAt || item.createAt || '')
  const time = new Date(item.updateAt || item.createAt || '').getTime()
  const size = item.size || 0
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id: 'cloud123',
    file_id: String(item.fileId),
    parent_file_id: String(item.parentFileId),
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

export const mapCloud123InfoToAliModel = (item: any): IAliGetFileModel => {
  const isDir = Number(item.type) === 1
  const name = item.filename || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const timeStr = humanDateTimeDateStr(item.updateAt || item.createAt || '')
  const time = new Date(item.updateAt || item.createAt || '').getTime()
  const size = Number(item.size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon('', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id: 'cloud123',
    file_id: String(item.fileId || item.fileID || item.file_id || ''),
    parent_file_id: String(item.parentFileId || item.parentFileID || item.parent_file_id || ''),
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

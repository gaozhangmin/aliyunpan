import type { IAliGetFileModel } from '../aliapi/alimodels'
import getFileIcon from '../aliapi/fileicon'
import { humanDateTimeDateStr, humanSize } from '../utils/format'
import { HanToPin } from '../utils/utils'
import message from '../utils/message'

export type OneDriveItem = {
  id: string
  name: string
  size?: number
  createdDateTime?: string
  lastModifiedDateTime?: string
  parentReference?: {
    id?: string
    driveId?: string
    path?: string
  }
  folder?: {
    childCount?: number
  }
  file?: {
    mimeType?: string
    hashes?: {
      sha1Hash?: string
      quickXorHash?: string
    }
  }
  image?: {
    width?: number
    height?: number
  }
  video?: {
    width?: number
    height?: number
    duration?: number
  }
  thumbnails?: Array<{
    small?: { url?: string }
    medium?: { url?: string }
    large?: { url?: string }
  }>
  '@content.downloadUrl'?: string
}

type OneDriveChildrenResp = {
  value?: OneDriveItem[]
  '@odata.nextLink'?: string
}

const GRAPH_API_HOST = 'https://graph.microsoft.com/v1.0'

const getOneDriveToken = async (user_id: string) => {
  const { default: UserDAL } = await import('../user/userdal')
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)
    if (dbToken) token = dbToken
  }
  return token
}

const graphRequest = async <T>(user_id: string, pathOrUrl: string, fallback: string): Promise<T | null> => {
  const token = await getOneDriveToken(user_id)
  if (!token?.access_token) {
    message.error('未登录 OneDrive')
    return null
  }
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${GRAPH_API_HOST}${pathOrUrl}`
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token.access_token}`
    }
  })
  const data = await resp.json().catch(() => undefined)
  if (!resp.ok || data?.error) {
    message.error(data?.error?.message || fallback)
    return null
  }
  return data as T
}

export const buildOneDriveChildrenPath = (parentId: string): string => {
  const expand = '$expand=thumbnails'
  if (!parentId || parentId === 'onedrive_root') return `/me/drive/root/children?${expand}`
  return `/me/drive/items/${encodeURIComponent(parentId)}/children?${expand}`
}

export const apiOneDriveFileList = async (user_id: string, parentId: string): Promise<OneDriveItem[]> => {
  let data = await graphRequest<OneDriveChildrenResp>(user_id, buildOneDriveChildrenPath(parentId), '获取 OneDrive 文件列表失败')
  const items = Array.isArray(data?.value) ? [...data.value] : []
  while (data?.['@odata.nextLink']) {
    data = await graphRequest<OneDriveChildrenResp>(user_id, data['@odata.nextLink'], '获取 OneDrive 文件列表失败')
    if (!data) break
    items.push(...(Array.isArray(data.value) ? data.value : []))
  }
  return items
}

export const apiOneDriveFileDetail = async (user_id: string, fileId: string): Promise<OneDriveItem | null> => {
  const path = fileId === 'onedrive_root'
    ? '/me/drive/root?$expand=thumbnails'
    : `/me/drive/items/${encodeURIComponent(fileId)}?$expand=thumbnails`
  return await graphRequest<OneDriveItem>(user_id, path, '获取 OneDrive 文件详情失败')
}

const encodeDescription = (item: OneDriveItem) => {
  const parts: string[] = []
  if (item.parentReference?.id) parts.push(`onedrive_parent:${item.parentReference.id}`)
  if (item.parentReference?.path) parts.push(`onedrive_path:${encodeURIComponent(item.parentReference.path)}`)
  if (item.parentReference?.driveId) parts.push(`onedrive_drive:${item.parentReference.driveId}`)
  if (item['@content.downloadUrl']) parts.push(`onedrive_download:${encodeURIComponent(item['@content.downloadUrl'])}`)
  return parts.join(';')
}

const pickThumbnail = (item: OneDriveItem): string => {
  const thumbnail = item.thumbnails?.[0]
  return thumbnail?.medium?.url || thumbnail?.large?.url || thumbnail?.small?.url || ''
}

export const mapOneDriveItemToAliModel = (item: OneDriveItem, drive_id: string, parentId: string): IAliGetFileModel => {
  const isDir = !!item.folder
  const name = item.name || ''
  const ext = isDir ? '' : (name.split('.').pop() || '')
  const time = new Date(item.lastModifiedDateTime || item.createdDateTime || '').getTime() || 0
  const timeStr = time ? humanDateTimeDateStr(new Date(time).toISOString()) : ''
  const size = Number(item.size || 0)
  let category = ''
  let icon = 'iconfile-folder'
  if (!isDir) {
    const iconInfo = getFileIcon(item.file?.mimeType || '', ext, ext, '', size)
    category = iconInfo[0]
    icon = iconInfo[1]
  }
  return {
    __v_skip: true,
    drive_id,
    file_id: item.id || '',
    parent_file_id: parentId,
    name,
    namesearch: HanToPin(name),
    ext,
    mime_type: item.file?.mimeType || '',
    mime_extension: ext,
    category,
    icon,
    file_count: Number(item.folder?.childCount || 0),
    size,
    sizeStr: humanSize(size),
    time,
    timeStr,
    starred: false,
    isDir,
    thumbnail: pickThumbnail(item),
    description: encodeDescription(item),
    content_hash: item.file?.hashes?.sha1Hash || item.file?.hashes?.quickXorHash || '',
    created_at: item.createdDateTime || '',
    updated_at: item.lastModifiedDateTime || item.createdDateTime || '',
    type: isDir ? 'folder' : 'file',
    image_media_metadata: item.image ? { width: item.image.width || 0, height: item.image.height || 0 } : undefined,
    video_media_metadata: item.video ? {
      width: item.video.width || 0,
      height: item.video.height || 0,
      duration: Math.floor(Number(item.video.duration || 0) / 1000)
    } : undefined
  } as any
}

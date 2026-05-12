import type { IAliGetFileModel } from '../aliapi/alimodels'
import { OneDriveItem, mapOneDriveItemToAliModel } from './dirfilelist'
import message from '../utils/message'

const GRAPH_API_HOST = 'https://graph.microsoft.com/v1.0'

type OneDriveSearchResp = {
  value?: OneDriveItem[]
  '@odata.nextLink'?: string
}

export type OneDriveSearchFilters = {
  query: string
  extensions: string[]
  categories: string[]
  minSize: number
  maxSize: number
}

const getOneDriveToken = async (user_id: string) => {
  const { default: UserDAL } = await import('../user/userdal')
  let token = UserDAL.GetUserToken(user_id)
  if (!token?.access_token) {
    const dbToken = await UserDAL.GetUserTokenFromDB(user_id)
    if (dbToken) token = dbToken
  }
  return token
}

const graphGet = async <T>(user_id: string, pathOrUrl: string, fallback: string): Promise<T | null> => {
  const token = await getOneDriveToken(user_id)
  if (!token?.access_token) {
    message.error('未登录 OneDrive')
    return null
  }
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${GRAPH_API_HOST}${pathOrUrl}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } })
  const data = await resp.json().catch(() => undefined)
  if (!resp.ok || data?.error) {
    message.error(data?.error?.message || fallback)
    return null
  }
  return data as T
}

const numericValue = (value: string): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const parseOneDriveSearchId = (searchId: string): OneDriveSearchFilters => {
  const raw = searchId.startsWith('search') ? searchId.substring('search'.length).trim() : searchId.trim()
  const queryParts: string[] = []
  const extensions: string[] = []
  const categories: string[] = []
  let minSize = 0
  let maxSize = 0
  raw.split(/\s+/).filter(Boolean).forEach((part) => {
    const [key, ...rest] = part.split(':')
    const value = rest.join(':').trim()
    if (!value) {
      queryParts.push(part)
      return
    }
    if (key === 'ext') {
      extensions.push(...value.split(',').map((item) => item.trim().replace(/^\./, '').toLowerCase()).filter(Boolean))
      return
    }
    if (key === 'type') {
      categories.push(...value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))
      return
    }
    if (key === 'min') {
      minSize = numericValue(value)
      return
    }
    if (key === 'max') {
      maxSize = numericValue(value)
      return
    }
    if (key === 'size' || key === 'begin' || key === 'end' || key === 'range') return
    queryParts.push(part)
  })
  return {
    query: queryParts.join(' ').trim(),
    extensions: [...new Set(extensions)],
    categories: [...new Set(categories)],
    minSize,
    maxSize
  }
}

const quoteGraphSearch = (query: string) => query.replace(/'/g, "''")

export const buildOneDriveSearchPath = (query: string): string => {
  return `/me/drive/search(q='${quoteGraphSearch(query)}')?$expand=thumbnails`
}

export const apiOneDriveSearch = async (user_id: string, query: string): Promise<OneDriveItem[]> => {
  let data = await graphGet<OneDriveSearchResp>(user_id, buildOneDriveSearchPath(query), '搜索 OneDrive 文件失败')
  const items = Array.isArray(data?.value) ? [...data.value] : []
  while (data?.['@odata.nextLink']) {
    data = await graphGet<OneDriveSearchResp>(user_id, data['@odata.nextLink'], '搜索 OneDrive 文件失败')
    if (!data) break
    items.push(...(Array.isArray(data.value) ? data.value : []))
  }
  return items
}

export const filterOneDriveSearchResults = (items: IAliGetFileModel[], filters: OneDriveSearchFilters): IAliGetFileModel[] => {
  return items.filter((item) => {
    if (filters.extensions.length > 0 && (!item.ext || !filters.extensions.includes(item.ext.toLowerCase()))) return false
    if (filters.categories.length > 0 && !filters.categories.some((category) => item.category === category || item.category.startsWith(category))) return false
    if (filters.minSize > 0 && Number(item.size || 0) < filters.minSize) return false
    if (filters.maxSize > 0 && Number(item.size || 0) > filters.maxSize) return false
    return true
  })
}

export const mapOneDriveSearchItems = (items: OneDriveItem[], driveId: string) => {
  return items.map((item) => mapOneDriveItemToAliModel(item, driveId, item.parentReference?.id || 'onedrive_root'))
}

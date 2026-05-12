import type { IAliGetFileModel } from '../aliapi/alimodels'
import { DropboxMetadata, dropboxRpc } from './dirfilelist'

type DropboxSearchMatch = {
  metadata?: DropboxMetadata | {
    metadata?: DropboxMetadata
  }
}

type DropboxSearchResp = {
  matches?: DropboxSearchMatch[]
  has_more?: boolean
  cursor?: string
}

export type DropboxSearchFilters = {
  query: string
  extensions: string[]
  categories: string[]
  minSize: number
  maxSize: number
}

const numericValue = (value: string): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const parseDropboxSearchId = (searchId: string): DropboxSearchFilters => {
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

export const buildDropboxSearchBody = (query: string, limit = 100) => ({
  query,
  options: {
    file_status: 'active',
    filename_only: false,
    max_results: Math.max(1, Math.min(limit, 1000))
  }
})

const unwrapSearchMetadata = (match: DropboxSearchMatch): DropboxMetadata | undefined => {
  const metadata = match.metadata as any
  return metadata?.metadata || metadata
}

export const apiDropboxSearch = async (user_id: string, query: string, limit = 100): Promise<DropboxMetadata[]> => {
  const data = await dropboxRpc<DropboxSearchResp>(user_id, '/files/search_v2', buildDropboxSearchBody(query, limit), '搜索 Dropbox 文件失败')
  const matches = Array.isArray(data?.matches) ? data.matches : []
  return matches
    .map(unwrapSearchMetadata)
    .filter((item): item is DropboxMetadata => !!item && item['.tag'] !== 'deleted')
}

export const filterDropboxSearchResults = (items: IAliGetFileModel[], filters: DropboxSearchFilters): IAliGetFileModel[] => {
  return items.filter((item) => {
    if (filters.extensions.length > 0 && !item.isDir && !filters.extensions.includes((item.ext || '').toLowerCase())) return false
    if (filters.extensions.length > 0 && item.isDir) return false
    if (filters.categories.length > 0 && !filters.categories.some((category) => item.category === category || item.category.startsWith(category))) return false
    if (filters.minSize > 0 && Number(item.size || 0) < filters.minSize) return false
    if (filters.maxSize > 0 && Number(item.size || 0) > filters.maxSize) return false
    return true
  })
}

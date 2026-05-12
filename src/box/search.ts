import { boxApiRequest, BOX_FIELDS, BoxItem, mapBoxItemToAliModel } from './dirfilelist'

type BoxSearchResp = {
  entries?: BoxItem[]
  total_count?: number
  limit?: number
  offset?: number
}

export const parseBoxSearchId = (dirID: string): { query: string } => {
  if (!dirID.startsWith('box_search:')) return { query: '' }
  return { query: decodeURIComponent(dirID.slice('box_search:'.length)) }
}

export const buildBoxSearchPath = (query: string, limit = 100, offset = 0) => {
  const params = new URLSearchParams({
    query,
    fields: BOX_FIELDS,
    limit: String(limit),
    offset: String(offset)
  })
  return `/search?${params.toString()}`
}

export const apiBoxSearch = async (user_id: string, query: string, limit = 100): Promise<BoxItem[]> => {
  let offset = 0
  const items: BoxItem[] = []
  while (true) {
    const data = await boxApiRequest<BoxSearchResp>(user_id, buildBoxSearchPath(query, limit, offset), {
      method: 'GET',
      headers: { 'x-rep-hints': '[jpg?dimensions=320x320]' }
    }, '搜索 Box 文件失败')
    const entries = Array.isArray(data?.entries) ? data.entries : []
    items.push(...entries)
    const total = Number(data?.total_count || 0)
    offset += Number(data?.limit || limit)
    if (!data || offset >= total || entries.length === 0) break
  }
  return items
}

export const mapBoxSearchItems = (items: BoxItem[], drive_id: string) => {
  return items.map((item) => mapBoxItemToAliModel(item, drive_id, item.parent?.id || 'box_root'))
}

import type { MediaServerConfig } from '../types/mediaServer'
import { mediaServerFetch, mediaServerFetchVoid } from './http'

export interface ServerPlaylist { id: string; title: string; count: number }
export interface ServerPlaylistTarget { config: MediaServerConfig; itemId: string; title: string }
export function openServerPlaylist(target: ServerPlaylistTarget): void {
  window.dispatchEvent(new CustomEvent('boxplayer:server-playlist', { detail: target }))
}
type Entry = Record<string, any>
const segment = (id: string) => encodeURIComponent(id)
const query = (values: Record<string, string>) => new URLSearchParams(values).toString()

async function allItems(config: MediaServerConfig, path: string, params: Record<string, string> = {}): Promise<Entry[]> {
  const plex = config.type === 'plex'
  const result: Entry[] = []
  let offset = 0
  for (;;) {
    const page = await mediaServerFetch(config, `${path}?${query({ ...params, [plex ? 'X-Plex-Container-Start' : 'StartIndex']: String(offset), [plex ? 'X-Plex-Container-Size' : 'Limit']: '100' })}`)
    const container = plex ? page.MediaContainer : page
    const rows = (plex ? container?.Metadata : container?.Items) || []
    if (!Array.isArray(rows)) throw new Error('播放列表数据格式错误')
    result.push(...rows)
    offset += rows.length
    const total = plex ? container?.totalSize : container?.TotalRecordCount
    if (!rows.length || (typeof total === 'number' ? offset >= total : rows.length < 100)) return result
  }
}

export async function listServerPlaylists(config: MediaServerConfig): Promise<ServerPlaylist[]> {
  const plex = config.type === 'plex'
  const rows = await allItems(config, plex ? '/playlists' : `/Users/${segment(config.userId || '')}/Items`, plex ? { playlistType: 'video', smart: '0' } : { IncludeItemTypes: 'Playlist', Recursive: 'true', Fields: 'ChildCount' })
  return rows.filter(row => row[plex ? 'ratingKey' : 'Id'] != null).map(row => ({ id: String(row[plex ? 'ratingKey' : 'Id']), title: String(row[plex ? 'title' : 'Name'] || ''), count: Number(row[plex ? 'leafCount' : 'ChildCount'] || 0) }))
}

async function entries(config: MediaServerConfig, playlistId: string): Promise<Entry[]> {
  return allItems(config, config.type === 'plex' ? `/playlists/${segment(playlistId)}/items` : `/Playlists/${segment(playlistId)}/Items`, config.type === 'plex' ? {} : { UserId: config.userId || '' })
}

export async function serverPlaylistMembership(config: MediaServerConfig, playlistId: string, itemId: string): Promise<boolean> {
  return (await entries(config, playlistId)).some(entry => String(entry[config.type === 'plex' ? 'ratingKey' : 'Id']) === itemId)
}

async function plexURI(config: MediaServerConfig, itemId: string): Promise<string> {
  const root = await mediaServerFetch(config, '/')
  const machine = root.MediaContainer?.machineIdentifier
  if (!machine) throw new Error('无法获取 Plex 服务器标识')
  return `server://${machine}/com.plexapp.plugins.library/library/metadata/${itemId}`
}

export async function createServerPlaylist(config: MediaServerConfig, title: string, itemId: string): Promise<void> {
  title = title.trim()
  if (!title || !itemId) throw new Error('播放列表名称和媒体不能为空')
  if (config.type === 'plex') {
    await mediaServerFetchVoid(config, `/playlists?${query({ title, type: 'video', smart: '0', uri: await plexURI(config, itemId) })}`, { method: 'POST' })
  } else if (config.type === 'emby') {
    await mediaServerFetchVoid(config, `/Playlists?${query({ Name: title, UserId: config.userId || '', Ids: itemId, MediaType: 'Video' })}`, { method: 'POST' })
  } else {
    await mediaServerFetchVoid(config, '/Playlists', { method: 'POST', body: JSON.stringify({ Name: title, UserId: config.userId, Ids: [itemId], MediaType: 'Video', IsPublic: false }) })
  }
}

export async function deleteServerPlaylist(config: MediaServerConfig, playlistId: string): Promise<void> {
  await mediaServerFetchVoid(config, config.type === 'plex' ? `/playlists/${segment(playlistId)}` : `/Items/${segment(playlistId)}`, { method: 'DELETE' })
}

export async function setServerPlaylistMembership(config: MediaServerConfig, playlistId: string, itemId: string, selected: boolean): Promise<void> {
  const plex = config.type === 'plex'
  const matches = (await entries(config, playlistId)).filter(entry => String(entry[plex ? 'ratingKey' : 'Id']) === itemId)
  if (selected) {
    if (matches.length) return
    const params: Record<string, string> = plex ? { uri: await plexURI(config, itemId) } : { Ids: itemId, UserId: config.userId || '' }
    await mediaServerFetchVoid(config, `${plex ? `/playlists/${segment(playlistId)}/items` : `/Playlists/${segment(playlistId)}/Items`}?${query(params)}`, { method: plex ? 'PUT' : 'POST' })
  } else {
    const entryIds = matches.map(entry => entry[plex ? 'playlistItemID' : 'PlaylistItemId'])
    if (entryIds.some(id => id == null)) throw new Error('服务器未返回播放列表条目 ID，无法移除媒体')
    if (!entryIds.length) return
    if (plex) {
      for (const entryId of entryIds) await mediaServerFetchVoid(config, `/playlists/${segment(playlistId)}/items/${segment(String(entryId))}`, { method: 'DELETE' })
    } else {
      await mediaServerFetchVoid(config, `/Playlists/${segment(playlistId)}/Items?${query({ EntryIds: entryIds.join(',') })}`, { method: 'DELETE' })
    }
  }
}

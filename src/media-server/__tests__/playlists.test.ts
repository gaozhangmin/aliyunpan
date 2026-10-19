import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MediaServerConfig } from '../../types/mediaServer'
import { createServerPlaylist, deleteServerPlaylist, listServerPlaylists, setServerPlaylistMembership } from '../playlists'

const config = (type: MediaServerConfig['type']): MediaServerConfig => ({ id: type, type, name: type, baseUrl: 'https://example.test/emby', accessToken: 'test-token', userId: 'user', createdAt: 0, updatedAt: 0 })
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 })
afterEach(() => vi.unstubAllGlobals())
describe('server playlist API', () => {
  it.each(['emby', 'jellyfin'] as const)('removes %s playlist entry IDs, not media IDs', async type => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ Items: [{ Id: 'media', PlaylistItemId: 'entry' }], TotalRecordCount: 1 })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await setServerPlaylistMembership(config(type), 'playlist', 'media', false)
    expect(String(fetch.mock.calls[1][0])).toContain('EntryIds=entry')
    expect(fetch.mock.calls[1][1].method).toBe('DELETE')
  })
  it('removes Plex playlistItemID rather than ratingKey', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ MediaContainer: { Metadata: [{ ratingKey: 'media', playlistItemID: 91 }] } })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await setServerPlaylistMembership(config('plex'), 'playlist', 'media', false)
    expect(String(fetch.mock.calls[1][0])).toContain('/playlists/playlist/items/91')
  })
  it('does not claim success when entry ID is missing', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ Items: [{ Id: 'media' }] }))
    vi.stubGlobal('fetch', fetch)
    await expect(setServerPlaylistMembership(config('emby'), 'playlist', 'media', false)).rejects.toThrow('条目 ID')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('creates Jellyfin playlists with a JSON body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await createServerPlaylist(config('jellyfin'), ' test ', 'media')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ Name: 'test', Ids: ['media'], UserId: 'user', IsPublic: false })
  })
  it('creates Plex playlists using the actual machine identifier', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ MediaContainer: { machineIdentifier: 'machine' } })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await createServerPlaylist(config('plex'), 'test', 'media')
    const url = new URL(fetch.mock.calls[1][0])
    expect(url.searchParams.get('uri')).toBe('server://machine/com.plexapp.plugins.library/library/metadata/media')
  })
  it('propagates permission failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    await expect(deleteServerPlaylist(config('emby'), 'playlist')).rejects.toThrow('403')
  })
  it('reads user-owned playlists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ Items: [{ Id: 'playlist', Name: 'test', ChildCount: 2 }], TotalRecordCount: 1 })))
    expect(await listServerPlaylists(config('emby'))).toEqual([{ id: 'playlist', title: 'test', count: 2 }])
  })
})

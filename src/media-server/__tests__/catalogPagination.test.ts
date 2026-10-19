import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import useMediaServerContentStore from '../../store/mediaServerContent'
import { getMediaServerCollectionPage, getMediaServerLibraryPagedItems } from '../contentGateway'
import type { MediaServerConfig } from '../../types/mediaServer'

const config: MediaServerConfig = { id: 'paging', type: 'emby', name: 'Test', baseUrl: 'https://server.invalid', accessToken: 'test', userId: 'user', createdAt: 0, updatedAt: 0 }
const preferences = { resumeNextUp: true, maxNextUpDays: 0 }
const payload = (offset: number, count = 50) => ({ Items: Array.from({ length: count }, (_, i) => ({ Id: String(offset + i), Name: String(offset + i), Type: 'Movie' })), TotalRecordCount: 123 })
const response = (value: unknown) => ({ ok: true, json: async () => value })
beforeEach(() => { setActivePinia(createPinia()); vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() }) })
afterEach(() => vi.unstubAllGlobals())

describe('catalog page requests', () => {
  it.each(['latest', 'nextup'] as const)('%s walks offsets without excluding a moving result set', async kind => {
    const offsets: number[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const params = new URL(url).searchParams
      expect(params.has('ExcludeItemIds')).toBe(false)
      const offset = Number(params.get('StartIndex')); offsets.push(offset)
      return response(payload(offset, Math.min(50, 123 - offset)))
    }))
    const store = useMediaServerContentStore()
    await store.queueCollectionPageLoad(config, kind, preferences)
    expect(offsets).toEqual([0])
    await store.queueCollectionPageLoad(config, kind, preferences)
    await store.queueCollectionPageLoad(config, kind, preferences)
    await store.queueCollectionPageLoad(config, kind, preferences)
    expect(offsets).toEqual([0, 50, 100])
    expect(store.collections['paging:' + kind].items.map(item => item.id)).toEqual(Array.from({ length: 123 }, (_, i) => String(i)))
  })
  it('uses a stable server sort before applying the offset', async () => {
    const fetch = vi.fn(async (_url: string) => response(payload(50)))
    vi.stubGlobal('fetch', fetch)
    await getMediaServerLibraryPagedItems(config, 'movies', 1, { recursiveMedia: true, order: { sort: 'rating', direction: 'descending' } })
    const query = new URL(fetch.mock.calls[0][0] as string).searchParams
    expect(query.get('StartIndex')).toBe('50')
    expect(query.get('SortBy')).toBe('CommunityRating,SortName')
    expect(query.get('SortOrder')).toBe('Descending')
  })
  it('coalesces repeated bottom events instead of draining queued pages', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const fetch = vi.fn(async () => { await gate; return response(payload(0)) })
    vi.stubGlobal('fetch', fetch)
    const store = useMediaServerContentStore()
    const pending = store.queueLibraryPageLoad(config, 'movies')
    await store.queueLibraryPageLoad(config, 'movies')
    await store.queueLibraryPageLoad(config, 'movies')
    release(); await pending
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(store.libraryPagedPages['paging:movies'].items).toHaveLength(50)
  })
  it('does not let an old sort response replace a newer catalog', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (new URL(url).searchParams.get('SortBy') === 'Name,SortName') { await gate; return response(payload(0)) }
      return response(payload(50))
    }))
    const store = useMediaServerContentStore()
    const old = store.queueLibraryPageLoad(config, 'movies', false, true, { sort: 'title' })
    await store.queueLibraryPageLoad(config, 'movies', true, true, { sort: 'rating' })
    release(); await old
    expect(store.libraryPagedPages['paging:movies'].items[0].id).toBe('50')
  })
  it('retries a failed sort change from page zero, never from the old cursor', async () => {
    let fail = true
    const offsets: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const params = new URL(url).searchParams
      if (params.get('SortBy')?.startsWith('CommunityRating')) {
        offsets.push(params.get('StartIndex')!)
        if (fail) { fail = false; throw new Error('network') }
      }
      return response(payload(Number(params.get('StartIndex'))))
    }))
    const store = useMediaServerContentStore()
    await store.queueLibraryPageLoad(config, 'movies', false, true, { sort: 'title' })
    await expect(store.queueLibraryPageLoad(config, 'movies', true, true, { sort: 'rating' })).rejects.toThrow()
    await store.queueLibraryPageLoad(config, 'movies', false, true, { sort: 'rating' })
    expect(offsets).toEqual(['0', '0'])
  })

  it('Plex keeps every item across multiple libraries and pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const parsed = new URL(url)
      if (parsed.pathname === '/library/sections') return response({ MediaContainer: { Directory: [{ key: '1', type: 'movie' }, { key: '2', type: 'movie' }] } })
      const id = parsed.pathname.includes('/1/') ? 1 : 2
      const start = Number(parsed.searchParams.get('X-Plex-Container-Start'))
      return response({ MediaContainer: { totalSize: 80, Metadata: Array.from({ length: Math.max(0, Math.min(50, 80 - start)) }, (_, i) => ({
        ratingKey: `${id}:${start + i}`, type: 'movie', title: `${id}:${start + i}`, addedAt: 10000 - (start + i) * 2 - id
      })) } })
    }))
    const items: string[] = []
    for (let page = 0; page < 4; page++) {
      const result = await getMediaServerCollectionPage({ ...config, type: 'plex' }, 'latest', page)
      items.push(...result.items.map(item => item.id))
    }
    expect(items).toHaveLength(160)
    expect(new Set(items).size).toBe(160)
    expect(items.slice(0, 4)).toEqual(['1:0', '2:0', '1:1', '2:1'])
  })
  it('Plex next-up requests the next server window', async () => {
    const offsets: number[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const start = Number(new URL(url).searchParams.get('X-Plex-Container-Start')); offsets.push(start)
      return response({ MediaContainer: { Metadata: Array.from({ length: 50 }, (_, i) => ({ ratingKey: String(start + i), type: 'episode', title: String(start + i) })) } })
    }))
    const page = await getMediaServerCollectionPage({ ...config, type: 'plex' }, 'nextup', 1)
    expect(offsets).toEqual([50])
    expect(page.items[0].id).toBe('50')
  })

})

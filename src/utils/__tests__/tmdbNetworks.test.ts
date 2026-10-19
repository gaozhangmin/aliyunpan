import { afterEach, describe, expect, it, vi } from 'vitest'
import { TmdbService } from '../tmdb'
import { filterLibraryCategory, libraryCategoryGroups } from '../unifiedLibraryCategories'
import { mergeScrapedMedia } from '../mediaScrapeMerge'
import type { MediaLibraryItem } from '../../types/media'

afterEach(() => vi.unstubAllGlobals())
const response = (data: unknown) => ({ ok: true, json: async () => data })
const media = (networks?: MediaLibraryItem['networks']): MediaLibraryItem => ({
  id: 'tv_42', parentId: '', type: 'tv', name: 'Show', tmdbId: 42, genres: [], driveFiles: [], addedAt: new Date(), networks
})
describe('scraped broadcast networks', () => {
  it('supplements reduced responses and reuses details across seasons', async () => {
    const fetch = vi.fn(async (url: string) => response(url.includes('/proxy/')
      ? { id: 42, networks: [{ id: 213, name: 'Netflix' }] }
      : { data: { tv: { id: 42, certification: 'TV-MA' } } }))
    vi.stubGlobal('fetch', fetch)
    const service = new TmdbService()
    const first = await service.getTvByTmdbId(42)
    await service.getTvByTmdbId(42, 2)
    expect(fetch.mock.calls.filter(([url]) => url.includes('/proxy/tv/42'))).toHaveLength(1)
    const item = media(first?.tv.networks)
    expect(libraryCategoryGroups([item], 'networks').map(group => group.name)).toEqual(['Netflix'])
    expect(filterLibraryCategory([item], 'tv/networks/Netflix', () => false)).toEqual([item])
  })
  it('does not fetch details when the match already includes networks', async () => {
    const fetch = vi.fn(async () => response({ data: { tv: { id: 42, certification: 'TV-MA', networks: [{ id: 213, name: 'Netflix' }] } } }))
    vi.stubGlobal('fetch', fetch)
    await new TmdbService().getTvByTmdbId(42)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('preserves a successful match and stored networks when enrichment fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/proxy/')
      ? { ok: false, status: 503 } : response({ data: { tv: { id: 42, certification: 'TV-MA' } } })))
    expect((await new TmdbService().getTvByTmdbId(42))?.tv.id).toBe(42)
    expect(mergeScrapedMedia(media([{ id: 213, name: 'Netflix' }]), media([])).networks).toEqual([{ id: 213, name: 'Netflix' }])
  })
})

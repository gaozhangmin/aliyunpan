import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import useMediaServerContentStore from '../../store/mediaServerContent'
import { getMediaServerHomeShell } from '../contentGateway'
import type { MediaServerConfig } from '../../types/mediaServer'

const config = (id: string): MediaServerConfig => ({ id, type: 'emby', name: 'Home', baseUrl: 'https://server.invalid', accessToken: 'test', userId: 'user', createdAt: 0, updatedAt: 0 })
const directory = { Items: [{ Id: 'movies', Name: 'Movies', CollectionType: 'movies', Type: 'CollectionFolder' }] }
afterEach(() => vi.unstubAllGlobals())

describe('Home directory independence', () => {
  it('discovers categories without making a statistics request', async () => {
    const fetch = vi.fn(async (url: string) => {
      if (!url.includes('/Views')) throw new Error('Statistics must not gate discovery')
      return { ok: true, json: async () => directory }
    })
    vi.stubGlobal('fetch', fetch)
    const shell = await getMediaServerHomeShell(config('directory-only'))
    expect(shell.libraries.map(item => item.id)).toEqual(['movies'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('publishes Home while counts are pending and preserves it when counts fail', async () => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    let rejectCounts!: (error: Error) => void
    const counts = new Promise<never>((_, reject) => { rejectCounts = reject })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/Items/Counts')) return counts
      return { ok: true, json: async () => directory }
    }))
    const store = useMediaServerContentStore()
    await store.loadHomeShell(config('slow-counts'), true)
    expect(store.homeData['slow-counts'].libraries.map(item => item.id)).toEqual(['movies'])
    expect(store.homeCatalogLoaded['slow-counts']).toBe(true)
    expect(store.homeSectionLoading['slow-counts:statistics']).toBe(true)
    rejectCounts(new Error('Statistics forbidden'))
    await vi.waitFor(() => expect(store.homeSectionLoading['slow-counts:statistics']).toBe(false))
    expect(store.homeData['slow-counts'].libraries).toHaveLength(1)
    expect(store.homeError).toBe('')
    expect(store.homeSectionError['slow-counts:statistics']).toContain('Statistics forbidden')
  })
})

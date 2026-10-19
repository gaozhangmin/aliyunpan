import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import useBookmarks, { CATEGORY_BOOKMARKS_KEY } from '../../store/unifiedLibraryBookmarks'
import useCategoryPlacement from '../../store/categoryPlacement'

const cache = new Map<string, string>()
beforeEach(() => {
  cache.clear()
  setActivePinia(createPinia())
  vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) || null, setItem: (key: string, value: string) => cache.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())
describe('category bookmarks', () => {
  it('decodes books in legacy default favorites with no extra shortcut list', () => {
    const store = useBookmarks()
    expect(store.favorites).toContain('books')
    expect(store.home).toEqual([])
  })
  it('persists exclusive placement through the service across sessions', async () => {
    const service = useCategoryPlacement()
    expect(await service.change('movies/genres/Drama', 'favorite', 'Drama')).toBe(true)
    expect(await service.change('movies/genres/Drama', 'home', 'Other')).toBe(false)
    await service.change('movies/genres/Drama', 'remove')
    expect(await service.change('movies/genres/Drama', 'home', 'Shelf')).toBe(true)
    setActivePinia(createPinia())
    const restored = useCategoryPlacement()
    expect(restored.state('movies/genres/Drama')).toMatchObject({ home: true, favorite: false })
    expect(useBookmarks().home).toEqual([])
  })
  it('decodes old dual placement without presenting an alternative write API', () => {
    localStorage.setItem(CATEGORY_BOOKMARKS_KEY, JSON.stringify({ favorites: ['tv/recent'], home: ['tv/recent'], titles: { 'tv/recent': 'Television' } }))
    const service = useCategoryPlacement()
    expect(service.state('tv/recent')).toMatchObject({ home: true, favorite: true })
    const projection = useBookmarks()
    expect(projection.titles['tv/recent']).toBe('Television')
    expect(projection).not.toHaveProperty('toggle')
    expect(projection).not.toHaveProperty('rename')
    expect(projection).not.toHaveProperty('persist')
  })
  it('retains explicit removal of every favorite without restoring defaults', async () => {
    const service = useCategoryPlacement()
    service.ensureLoaded()
    for (const id of [...useBookmarks().favorites]) await service.change(id, 'remove')
    setActivePinia(createPinia())
    const restored = useBookmarks()
    useCategoryPlacement().ensureLoaded()
    expect(restored.favorites).toEqual([])
  })
})

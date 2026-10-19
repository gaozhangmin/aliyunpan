import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { changeCategoryPlacement, libraryHomeId, migrateCategoryPlacement, orderedFavoriteKeys, renameCategoryRoute } from '../categoryPlacement'
import { defaultHomeSettings, visibleHomeItems, type HomeManagementItem } from '../unifiedHomeManagement'
import useCategoryPlacement, { CATEGORY_PLACEMENT_KEY, LEGACY_FAVORITE_ORDER_KEY } from '../../store/categoryPlacement'
import useHomePreferences from '../../store/unifiedHomePreferences'

const catalog: HomeManagementItem[] = [
  { id: 'recent', title: 'Recent', sourceId: 'local', available: true },
  { id: 'sources', title: 'Favorites', sourceId: 'local', available: true },
  { id: 'custom-series', title: 'Series', sourceId: 'local', available: true },
  { id: 'server:movies', title: 'Server movies', sourceId: 'server', available: true },
  { id: 'catalog:series/42', title: 'Saved series', sourceId: 'local', available: true, optIn: true },
  { id: 'catalog:tv/recent', title: 'Recent TV', sourceId: 'local', available: true, optIn: true },
  { id: 'catalog:tv/years:group:2020%2B', title: 'TV decade', sourceId: 'local', available: true, optIn: true, child: true }
]
const blank = () => migrateCategoryPlacement(defaultHomeSettings(), { favorites: [] })
const visibleIDs = (snapshot: ReturnType<typeof blank>) => visibleHomeItems(catalog, snapshot.home).map(item => item.id)

describe('placement addition order', () => {
  it('appends after the real default home layout when no explicit order is stored', () => {
    const initial = blank()
    const before = visibleIDs(initial)
    const added = changeCategoryPlacement(initial, 'tv/recent', 'home', 'New TV', catalog)
    expect(visibleIDs(added)).toEqual([...before, libraryHomeId('tv/recent')])
    expect(added.home.order.at(-1)).toBe(libraryHomeId('tv/recent'))
  })
  it('preserves manual order, default shelves, and source shelves before sequential additions', () => {
    const initial = migrateCategoryPlacement({ order: ['server:movies', 'catalog:series/42'], hidden: [], titles: {} }, { favorites: [] })
    const before = visibleIDs(initial)
    const first = changeCategoryPlacement(initial, 'tv/recent', 'home', 'TV', catalog)
    const second = changeCategoryPlacement(first, 'tv/years/2020%2B', 'home', '2020+', catalog)
    expect(visibleIDs(second)).toEqual([...before, libraryHomeId('tv/recent'), libraryHomeId('tv/years/2020%2B')])
  })
  it('moves a removed home shelf to the end when re-added instead of reusing its old rank', () => {
    const initial = migrateCategoryPlacement({ order: ['catalog:tv/recent', 'server:movies'], hidden: [], titles: {} }, { favorites: [] })
    const removed = changeCategoryPlacement(initial, 'tv/recent', 'remove', '', catalog)
    const before = visibleIDs(removed)
    const added = changeCategoryPlacement(removed, 'tv/recent', 'home', 'Again', catalog)
    expect(visibleIDs(added)).toEqual([...before, libraryHomeId('tv/recent')])
    expect(added.home.order.filter(id => id === libraryHomeId('tv/recent'))).toHaveLength(1)
  })
  it('keeps offline saved identities while appending a new home shelf', () => {
    const initial = migrateCategoryPlacement({ order: ['offline:42'], hidden: ['offline:42'], titles: {} }, { favorites: [] })
    const added = changeCategoryPlacement(initial, 'tv/recent', 'home', 'TV', catalog)
    expect(added.home.order).toContain('offline:42')
    expect(added.home.order.at(-1)).toBe(libraryHomeId('tv/recent'))
  })
  it('appends favorites after root, child, and source cards with and without a saved manual order', () => {
    const cards = ['movies', 'tv/genres/Drama', 'root:webdav:one', 'source:server:two']
    for (const order of [[], ['source:server:two', 'tv/genres/Drama']]) {
      const initial = migrateCategoryPlacement(defaultHomeSettings(), { favorites: cards.slice(0, 2) }, {}, order)
      const before = orderedFavoriteKeys(initial, cards)
      const added = changeCategoryPlacement(initial, 'tv/recent', 'favorite', 'TV', catalog, cards.slice(2))
      expect(orderedFavoriteKeys(added, [...cards, 'tv/recent'])).toEqual([...before, 'tv/recent'])
    }
  })
  it('clears a stale favorite rank on re-add, while renaming preserves both orders', () => {
    const initial = migrateCategoryPlacement(defaultHomeSettings(), { favorites: ['movies', 'tv/recent'] }, {}, ['tv/recent', 'root:webdav:one', 'movies'])
    const removed = changeCategoryPlacement(initial, 'tv/recent', 'remove')
    const added = changeCategoryPlacement(removed, 'tv/recent', 'favorite', 'New', catalog, ['root:webdav:one'])
    expect(orderedFavoriteKeys(added, ['movies', 'root:webdav:one', 'tv/recent'])).toEqual(['root:webdav:one', 'movies', 'tv/recent'])
    const renamed = changeCategoryPlacement(added, 'tv/recent', 'rename', 'Renamed')
    expect(renamed.favoriteOrder).toEqual(added.favoriteOrder)
    expect(renamed.home.order).toEqual(added.home.order)
  })
  it('renaming a playlist replaces its card key in place', () => {
    const initial = migrateCategoryPlacement(defaultHomeSettings(), { favorites: ['movies', 'playlist/Before'] }, {}, ['source:server:two', 'playlist/Before', 'movies'])
    const renamed = renameCategoryRoute(initial, 'playlist/Before', 'playlist/After')
    expect(renamed.favoriteOrder).toEqual(['source:server:two', 'playlist/After', 'movies'])
  })
})

describe('placement ordering persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const cache = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) ?? null, setItem: (key: string, value: string) => cache.set(key, value) })
  })
  afterEach(() => vi.unstubAllGlobals())
  it('migrates the legacy mixed card order and preserves it across adding a category and reload', async () => {
    localStorage.setItem(LEGACY_FAVORITE_ORDER_KEY, JSON.stringify(['root:webdav:one', 'tv', 'source:server:two', 'movies']))
    const service = useCategoryPlacement()
    const keys = ['movies', 'tv', 'root:webdav:one', 'source:server:two']
    await service.setFavoriteCatalog(keys)
    const before = service.orderFavoriteCards(keys.map(key => ({ key }))).map(card => card.key)
    await service.change('tv/recent', 'favorite', 'New')
    const after = service.orderFavoriteCards([...keys, 'tv/recent'].map(key => ({ key }))).map(card => card.key)
    expect(after).toEqual([...before, 'tv/recent'])
    setActivePinia(createPinia())
    expect(useCategoryPlacement().orderFavoriteCards([...keys, 'tv/recent'].map(key => ({ key }))).map(card => card.key)).toEqual(after)
  })
  it('adds newly discovered source cards at the end and re-adds removed sources at the end', async () => {
    const service = useCategoryPlacement()
    await service.setFavoriteCatalog(['movies', 'source:server:first'])
    await service.reorderFavorites(['source:server:first', 'movies'])
    await service.setFavoriteCatalog(['movies', 'root:webdav:new', 'source:server:first'])
    expect(service.orderFavoriteCards(['movies', 'root:webdav:new', 'source:server:first'].map(key => ({ key }))).map(card => card.key)).toEqual(['source:server:first', 'movies', 'root:webdav:new'])
    await service.setFavoriteCatalog(['movies', 'root:webdav:new'])
    await service.setFavoriteCatalog(['movies', 'source:server:first', 'root:webdav:new'])
    expect(service.orderFavoriteCards(['movies', 'source:server:first', 'root:webdav:new'].map(key => ({ key }))).map(card => card.key)).toEqual(['movies', 'root:webdav:new', 'source:server:first'])
  })
  it('keeps home ordering in the shared projection and reloads without moving the new shelf', async () => {
    const service = useCategoryPlacement()
    service.setCatalog(catalog)
    const before = visibleHomeItems(catalog, useHomePreferences()).map(item => item.id)
    await service.change('tv/recent', 'home', 'New TV')
    const after = visibleHomeItems(catalog, useHomePreferences()).map(item => item.id)
    expect(after).toEqual([...before, libraryHomeId('tv/recent')])
    setActivePinia(createPinia())
    useCategoryPlacement().ensureLoaded()
    expect(visibleHomeItems(catalog, useHomePreferences()).map(item => item.id)).toEqual(after)
    expect(JSON.parse(localStorage.getItem(CATEGORY_PLACEMENT_KEY)!).home.order.at(-1)).toBe(libraryHomeId('tv/recent'))
  })
})

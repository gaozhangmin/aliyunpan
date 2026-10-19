import type { MediaServerPageSort } from '../utils/mediaServerPageSort'
import { homeRequests } from '../utils/homeRequestCoordinator'
import { defineStore } from 'pinia'
import { libraryCover, withLibraryCoverFallback } from '../media-server/libraryCover'
import type { MediaServerConfig } from '../types/mediaServer'
import type { MediaServerHomeData, MediaServerItemDetail, MediaServerLibraryNode, MediaServerPagedCollection, MediaServerPagedLibraryPage, MediaServerSearchData } from '../types/mediaServerContent'
import {
  getMediaServerCollectionPage,
  getMediaServerExcludedLibraries,
  getMediaServerHomeLatest,
  getMediaServerHomeLibraryLatest,
  getMediaServerHomeNextUp,
  getMediaServerHomeResume,
  getMediaServerHomeShell,
  getMediaServerHomeStatistics,
  getMediaServerHomeWithPreferences,
  getMediaServerItemDetail,
  getMediaServerLibraries,
  getMediaServerFilteredPagedItems,
  getMediaServerLibraryPagedItems,
  getMediaServerPersonPagedItems,
  getMediaServerSearch,
  getMediaServerSuggestions
} from '../media-server/contentGateway'
import type { MediaServerHomePreferencesState } from './mediaServerHomePreferences'

interface MediaServerContentState {
  pageQueries: Record<string, string>
  pageVersions: Record<string, number>
  loadingHome: boolean
  homeError: string
  homeData: Record<string, MediaServerHomeData>
  excludedLibraryIds: Record<string, string[]>
  homeSectionLoaded: Record<string, boolean>
  homeSectionLoading: Record<string, boolean>
  homeLibrarySectionLoading: Record<string, boolean>
  homeCatalogLoaded: Record<string, boolean>
  homeFavoriteItems: Record<string, MediaServerLibraryNode[]>
  homeSectionError: Record<string, string>
  loadingLibrary: boolean
  libraryError: string
  libraryPageLoading: Record<string, boolean>
  libraryPageError: Record<string, string>
  libraryRoots: Record<string, MediaServerLibraryNode[]>
  libraryPages: Record<string, MediaServerLibraryNode[]>
  loadingDetail: boolean
  detailError: string
  itemDetails: Record<string, MediaServerItemDetail>
  loadingSearch: boolean
  searchError: string
  loadingSearchSuggestions: boolean
  searchSuggestionsError: string
  searchData: Record<string, MediaServerSearchData>
  searchSuggestions: Record<string, MediaServerLibraryNode[]>
  loadingCollection: boolean
  collectionError: string
  collectionLoading: Record<string, boolean>
  collectionPageError: Record<string, string>
  collectionPendingLoads: Record<string, number>
  collections: Record<string, MediaServerPagedCollection>
  libraryPendingLoads: Record<string, number>
  libraryPagedPages: Record<string, MediaServerPagedLibraryPage>
}

const homeConfigurationIDs = new Map<string, string>()

const emptyHomeData = (): MediaServerHomeData => ({
  resume: [],
  latest: [],
  latestTotal: 0,
  nextUp: [],
  nextUpTotal: 0,
  libraries: [],
  statistics: {
    libraryCount: 0,
    movieCount: 0,
    seriesCount: 0,
    episodeCount: 0
  }
})

const useMediaServerContentStore = defineStore('media-server-content', {
  state: (): MediaServerContentState => ({
    pageQueries: {},
    pageVersions: {},
    loadingHome: false,
    homeError: '',
    homeData: {},
    excludedLibraryIds: {},
    homeSectionLoaded: {},
    homeSectionLoading: {},
    homeLibrarySectionLoading: {},
    homeCatalogLoaded: {},
    homeFavoriteItems: {},
    homeSectionError: {},
    loadingLibrary: false,
    libraryError: '',
    libraryPageLoading: {},
    libraryPageError: {},
    libraryRoots: {},
    libraryPages: {},
    loadingDetail: false,
    detailError: '',
    itemDetails: {},
    loadingSearch: false,
    searchError: '',
    loadingSearchSuggestions: false,
    searchSuggestionsError: '',
    searchData: {},
    searchSuggestions: {},
    loadingCollection: false,
    collectionError: '',
    collectionLoading: {},
    collectionPageError: {},
    collectionPendingLoads: {},
    collections: {},
    libraryPendingLoads: {},
    libraryPagedPages: {}
  }),
  getters: {
    currentHomeData(state) {
      return (serverId: string) => state.homeData[serverId] || emptyHomeData()
    },
    currentLibraryRoot(state) {
      return (serverId: string) => state.libraryRoots[serverId] || []
    },
    currentLibraryPage(state) {
      return (key: string) => state.libraryPages[key] || []
    },
    currentItemDetail(state) {
      return (key: string) => state.itemDetails[key]
    },
    currentSearchData(state) {
      return (key: string) => state.searchData[key] || { query: '', items: [] }
    },
    currentSearchSuggestions(state) {
      return (serverId: string) => state.searchSuggestions[serverId] || []
    },
    currentCollection(state) {
      return (key: string) => state.collections[key] || {
        key,
        items: [],
        total: 0,
        currentPage: -1,
        hasNextPage: true
      }
    },
    currentPagedLibrary(state) {
      return (key: string) => state.libraryPagedPages[key] || {
        key,
        items: [],
        total: 0,
        currentPage: -1,
        hasNextPage: true
      }
    }
  },
  actions: {
    mergeUniqueItems<T extends { id: string }>(existing: T[], incoming: T[]) {
      const seen = new Set(existing.map((item) => item.id))
      const merged = [...existing]
      for (const item of incoming) {
        if (!item.id || seen.has(item.id)) continue
        seen.add(item.id)
        merged.push(item)
      }
      return merged
    },
    queueLibraryPageLoad(config: MediaServerConfig, parentId: string, force = false, recursiveMedia = true, order: MediaServerPageSort = {}) {
      return this.loadLibraryPage(config, parentId, force, recursiveMedia, order)
    },
    queueCollectionPageLoad(config: MediaServerConfig, kind: 'latest' | 'nextup', preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false, order: MediaServerPageSort = {}) {
      return this.loadCollectionPage(config, kind, preferences, force, order)
    },
    async loadHome(config: MediaServerConfig, preferences: MediaServerHomePreferencesState, force = false) {
      if (!force && this.homeData[config.id]) return this.homeData[config.id]
      this.loadingHome = true
      this.homeError = ''
      try {
        const data = await getMediaServerHomeWithPreferences(config, preferences)
        this.homeData[config.id] = data
        return data
      } catch (error: any) {
        this.homeError = error?.message || '加载媒体服务器主页失败'
        throw error
      } finally {
        this.loadingHome = false
      }
    },
    prepareHomeConfiguration(config: MediaServerConfig) {
      const version = JSON.stringify([config.type, config.baseUrl, config.userId, config.username, config.accessToken])
      const previous = homeConfigurationIDs.get(config.id)
      homeConfigurationIDs.set(config.id, version)
      if (previous && previous !== version) {
        delete this.homeData[config.id]
        delete this.homeCatalogLoaded[config.id]
        for (const key of Object.keys(this.homeSectionLoaded)) if (key.startsWith(config.id + ':')) delete this.homeSectionLoaded[key]
        for (const key of Object.keys(this.homeSectionError)) if (key.startsWith(config.id + ':')) delete this.homeSectionError[key]
        for (const key of Object.keys(this.homeFavoriteItems)) if (key.startsWith(config.id + ':')) delete this.homeFavoriteItems[key]
      }
    },
    async loadHomeStatistics(config: MediaServerConfig, force = false) {
      const key = `${config.id}:statistics`
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const statistics = await homeRequests.run(config, 'statistics', force, signal => getMediaServerHomeStatistics({ ...config, requestSignal: signal }), 300_000)
        const current = this.homeData[config.id]
        if (current) this.homeData[config.id] = { ...current, statistics: { ...statistics, libraryCount: current.libraries.length } }
      } catch (error: any) {
        // Keep the catalog, shelves and last successful counts usable independently.
        if (homeRequests.isCurrent(config)) this.homeSectionError[key] = error?.message || String(error)
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[key] = false
      }
    },
    async loadHomeShell(config: MediaServerConfig, force = false) {
      this.prepareHomeConfiguration(config)
      const hasCachedHome = !!this.homeData[config.id]
      const catalogKey = `home-server-catalog-v1:${config.id}:${config.userId || config.username || ''}`
      if (!hasCachedHome) {
        try {
          const libraries = JSON.parse(localStorage.getItem(catalogKey) || 'null')
          if (Array.isArray(libraries)) this.homeData[config.id] = { ...emptyHomeData(), libraries }
        } catch { /* A corrupt cache must not prevent fresh discovery. */ }
      }
      this.loadingHome = !hasCachedHome
      this.homeSectionLoading[`${config.id}:catalog`] = true
      this.homeError = ''
      try {
        const shell = await homeRequests.run(config, 'catalog', force, signal => getMediaServerHomeShell({ ...config, requestSignal: signal }), 300_000)
        this.homeCatalogLoaded[config.id] = true
        try {
          // Directory metadata only: no poster payloads, tokens, or resume history.
          localStorage.setItem(catalogKey, JSON.stringify(shell.libraries.map(library => ({
            id: library.id, title: library.title, collectionType: library.collectionType, items: [], total: 0
          }))))
        } catch { /* Storage failure must not turn a successful network request into an error. */ }
        const excluded = new Set(this.excludedLibraryIds[config.id] || [])
        const previous = this.homeData[config.id]
        this.homeData[config.id] = {
          ...emptyHomeData(),
          ...shell,
          ...previous,
          statistics: config.type === 'plex' ? shell.statistics : { ...(previous?.statistics || shell.statistics), libraryCount: shell.libraries.length },
          libraries: shell.libraries.filter((library) => !excluded.has(library.id)).map((library) => {
            const cached = previous?.libraries.find((item) => item.id === library.id)
            return { ...library, items: cached?.items ?? library.items, total: cached?.total ?? library.total, attempted: cached?.attempted ?? false }
          })
        }
        if (config.type !== 'plex') void this.loadHomeStatistics(config, force)
        return this.homeData[config.id]
      } catch (error: any) {
        if (!homeRequests.isCurrent(config)) throw error
        this.homeError = error?.message || '加载媒体服务器主页失败'
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[`${config.id}:catalog`] = false
        this.loadingHome = false
      }
    },
    async syncHomeExcludedLibraries(config: MediaServerConfig, force = false) {
      if (!force && this.excludedLibraryIds[config.id]) return this.excludedLibraryIds[config.id]
      const excluded = await getMediaServerExcludedLibraries(config)
      this.excludedLibraryIds[config.id] = excluded

      const current = this.homeData[config.id]
      if (current && excluded.length > 0) {
        const excludedSet = new Set(excluded)
        this.homeData[config.id] = {
          ...current,
          libraries: current.libraries.filter((library) => !excludedSet.has(library.id))
        }
      }

      return excluded
    },
    async loadHomeResume(config: MediaServerConfig, force = false) {
      this.prepareHomeConfiguration(config)
      const key = `${config.id}:resume`
      const current = this.homeData[config.id]
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const resume = await homeRequests.run(config, 'resume', force, signal => getMediaServerHomeResume({ ...config, requestSignal: signal }))
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, resume }
        return resume
      } catch (error: any) {
        if (!homeRequests.isCurrent(config)) throw error
        this.homeSectionError[key] = error?.message || '加载继续观看失败'
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[key] = false
      }
    },
    async loadHomeLatest(config: MediaServerConfig, force = false) {
      this.prepareHomeConfiguration(config)
      const key = `${config.id}:latest`
      const current = this.homeData[config.id]
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const latest = await homeRequests.run(config, 'latest', force, signal => getMediaServerHomeLatest({ ...config, requestSignal: signal }))
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, latest: latest.items, latestTotal: latest.total }
        return latest.items
      } catch (error: any) {
        if (!homeRequests.isCurrent(config)) throw error
        this.homeSectionError[key] = error?.message || '加载最近添加失败'
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[key] = false
      }
    },
    async loadHomeNextUp(config: MediaServerConfig, preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false) {
      this.prepareHomeConfiguration(config)
      const key = `${config.id}:nextup`
      const current = this.homeData[config.id]
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const nextUp = await homeRequests.run(config, 'nextup:' + JSON.stringify([preferences.resumeNextUp, preferences.maxNextUpDays]), force, signal => getMediaServerHomeNextUp({ ...config, requestSignal: signal }, preferences))
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, nextUp: nextUp.items, nextUpTotal: nextUp.total }
        this.homeSectionLoaded[key] = true
        return nextUp.items
      } catch (error: any) {
        if (!homeRequests.isCurrent(config)) throw error
        this.homeSectionError[key] = error?.message || '加载下一集失败'
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[key] = false
      }
    },
    async loadHomeLibrarySection(config: MediaServerConfig, libraryId: string, force = false) {
      this.prepareHomeConfiguration(config)
      const sectionKey = `${config.id}:library:${libraryId}`
      const current = this.homeData[config.id]
      const matched = current?.libraries.find((item) => item.id === libraryId)
      this.homeLibrarySectionLoading[sectionKey] = true
      this.homeSectionError[sectionKey] = ''
      try {
        const result = await homeRequests.run(config, 'library:' + libraryId, force, signal => getMediaServerHomeLibraryLatest({ ...config, requestSignal: signal }, libraryId, matched?.collectionType))
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = {
          ...base,
          libraries: base.libraries.map((library) => library.id === libraryId ? { ...library, items: result.items, total: result.total, attempted: true } : library)
        }
        return result.items
      } catch (error: any) {
        if (!homeRequests.isCurrent(config)) throw error
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = {
          ...base,
          libraries: base.libraries.map((library) => library.id === libraryId ? { ...library, attempted: true } : library)
        }
        this.homeSectionError[sectionKey] = error?.message || '加载媒体库分区失败'
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeLibrarySectionLoading[sectionKey] = false
      }
    },
    async loadHomeFavorites(config: MediaServerConfig, parentId: string, force = false) {
      this.prepareHomeConfiguration(config)
      const key = `${config.id}:${parentId}`
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const page = await homeRequests.run(config, 'favorites:' + parentId, force,
          signal => getMediaServerLibraryPagedItems({ ...config, requestSignal: signal }, parentId, 0, { recursiveMedia: true }))
        this.homeFavoriteItems[key] = page.items.slice(0, 24)
        return this.homeFavoriteItems[key]
      } catch (error: any) {
        if (homeRequests.isCurrent(config)) this.homeSectionError[key] = error?.message || String(error)
        throw error
      } finally {
        if (homeRequests.isCurrent(config)) this.homeSectionLoading[key] = false
      }
    },
    async loadLibraries(config: MediaServerConfig, force = false) {
      if (!force && this.libraryRoots[config.id]) return this.libraryRoots[config.id]
      this.loadingLibrary = true
      this.libraryError = ''
      try {
        const data = await getMediaServerLibraries(config)
        const homeLibraries = this.homeData[config.id]?.libraries || []
        const enriched = await Promise.all(
          data.map(async (library) => {
            if (libraryCover(library)) return library
            const cachedSection = homeLibraries.find((item) => item.id === library.id)?.items || []
            const latestSection = cachedSection.length > 0
              ? cachedSection
              : await getMediaServerHomeLibraryLatest(config, library.id, library.collectionType).then((result) => result.items).catch(() => [])
            return withLibraryCoverFallback(library, latestSection)
          })
        )
        this.libraryRoots[config.id] = enriched
        return enriched
      } catch (error: any) {
        this.libraryError = error?.message || '加载媒体库失败'
        throw error
      } finally {
        this.loadingLibrary = false
      }
    },
    async loadLibraryPage(config: MediaServerConfig, parentId: string, force = false, recursiveMedia = true, order: MediaServerPageSort = {}) {
      const key = `${config.id}:${parentId}`
      const queryKey = 'library:' + key
      const query = JSON.stringify([config.baseUrl, config.userId, config.accessToken, [recursiveMedia, order]])
      const reset = force || this.pageQueries[queryKey] !== query
      if (!reset && this.libraryPageLoading[key]) return this.libraryPagedPages[key]?.items || []
      if (reset) {
        delete this.libraryPagedPages[key]
        delete this.libraryPages[key]
        this.pageQueries[queryKey] = query
        this.pageVersions[queryKey] = (this.pageVersions[queryKey] || 0) + 1
      }
      const version = this.pageVersions[queryKey]
      const current = reset ? undefined : this.libraryPagedPages[key]
      if (current && !force && !current.hasNextPage) return current.items
      this.loadingLibrary = true
      this.libraryPageLoading[key] = true
      this.libraryError = ''
      this.libraryPageError[key] = ''
      try {
        const nextPage = force || !current ? 0 : current.currentPage + 1
        const collectionType = this.homeData[config.id]?.libraries.find((library) => library.id === parentId)?.collectionType
          || this.libraryRoots[config.id]?.find((library) => library.id === parentId)?.collectionType
        const data = await getMediaServerLibraryPagedItems(config, parentId, nextPage, {
          recursiveMedia,
          order,
          collectionType
        })
        if (version !== this.pageVersions[queryKey]) return this.libraryPagedPages[key]?.items || []
        const mergedItems = force || !current
          ? data.items
          : this.mergeUniqueItems(current.items, data.items)
        this.libraryPagedPages[key] = force || !current
          ? data
          : {
              ...data,
              items: mergedItems,
              hasNextPage: data.hasNextPage && mergedItems.length > current.items.length
            }
        this.libraryPages[key] = this.libraryPagedPages[key].items
        return this.libraryPages[key]
      } catch (error: any) {
        if (version !== this.pageVersions[queryKey]) return this.libraryPagedPages[key]?.items || []
        this.libraryError = error?.message || '加载媒体库内容失败'
        this.libraryPageError[key] = this.libraryError
        throw error
      } finally {
        if (version === this.pageVersions[queryKey]) {
          this.loadingLibrary = false
          this.libraryPageLoading[key] = false
        }
      }
    },
    async loadPersonPage(config: MediaServerConfig, personId: string, force = false) {
      const key = `${config.id}:${personId}`
      const current = this.libraryPagedPages[key]
      if (current && !force && !current.hasNextPage) return current.items
      this.loadingLibrary = true
      this.libraryPageLoading[key] = true
      this.libraryError = ''
      this.libraryPageError[key] = ''
      try {
        const nextPage = force || !current ? 0 : current.currentPage + 1
        const data = await getMediaServerPersonPagedItems(config, personId, nextPage)
        const mergedItems = force || !current
          ? data.items
          : this.mergeUniqueItems(current.items, data.items)
        this.libraryPagedPages[key] = force || !current
          ? data
          : {
              ...data,
              items: mergedItems,
              hasNextPage: data.items.length >= 60 && mergedItems.length < (data.total || Number.MAX_SAFE_INTEGER)
            }
        this.libraryPages[key] = this.libraryPagedPages[key].items
        return this.libraryPages[key]
      } catch (error: any) {
        this.libraryError = error?.message || '加载人物参演内容失败'
        this.libraryPageError[key] = this.libraryError
        throw error
      } finally {
        this.loadingLibrary = false
        this.libraryPageLoading[key] = false
      }
    },
    async loadFilteredPage(config: MediaServerConfig, keySuffix: string, options: { genre?: string; studio?: string; parentId?: string; order?: MediaServerPageSort }, force = false) {
      const key = `${config.id}:${keySuffix}`
      const queryKey = 'library:' + key
      const query = JSON.stringify([config.baseUrl, config.userId, config.accessToken, options])
      const reset = force || this.pageQueries[queryKey] !== query
      if (!reset && this.libraryPageLoading[key]) return this.libraryPagedPages[key]?.items || []
      if (reset) {
        delete this.libraryPagedPages[key]
        delete this.libraryPages[key]
        this.pageQueries[queryKey] = query
        this.pageVersions[queryKey] = (this.pageVersions[queryKey] || 0) + 1
      }
      const version = this.pageVersions[queryKey]
      const current = reset ? undefined : this.libraryPagedPages[key]
      if (current && !force && !current.hasNextPage) return current.items
      this.loadingLibrary = true
      this.libraryPageLoading[key] = true
      this.libraryError = ''
      this.libraryPageError[key] = ''
      try {
        const nextPage = force || !current ? 0 : current.currentPage + 1
        const data = await getMediaServerFilteredPagedItems(config, nextPage, options)
        if (version !== this.pageVersions[queryKey]) return this.libraryPagedPages[key]?.items || []
        const mergedItems = force || !current
          ? data.items
          : this.mergeUniqueItems(current.items, data.items)
        this.libraryPagedPages[key] = force || !current
          ? { ...data, key }
          : {
              ...data,
              key,
              items: mergedItems,
              hasNextPage: data.hasNextPage && mergedItems.length > current.items.length
            }
        this.libraryPages[key] = this.libraryPagedPages[key].items
        return this.libraryPages[key]
      } catch (error: any) {
        if (version !== this.pageVersions[queryKey]) return this.libraryPagedPages[key]?.items || []
        this.libraryError = error?.message || '加载筛选内容失败'
        this.libraryPageError[key] = this.libraryError
        throw error
      } finally {
        if (version === this.pageVersions[queryKey]) {
          this.loadingLibrary = false
          this.libraryPageLoading[key] = false
        }
      }
    },
    async loadItemDetail(config: MediaServerConfig, itemId: string, force = false) {
      const key = `${config.id}:${itemId}`
      if (!force && this.itemDetails[key]) return this.itemDetails[key]
      this.loadingDetail = true
      this.detailError = ''
      try {
        const data = await getMediaServerItemDetail(config, itemId)
        this.itemDetails[key] = data
        return data
      } catch (error: any) {
        this.detailError = error?.message || '加载媒体详情失败'
        throw error
      } finally {
        this.loadingDetail = false
      }
    },
    async loadSearchSuggestions(config: MediaServerConfig, force = false) {
      const key = config.id
      if (!force && this.searchSuggestions[key]?.length) return this.searchSuggestions[key]
      this.loadingSearchSuggestions = true
      this.searchSuggestionsError = ''
      try {
        const items = await getMediaServerSuggestions(config)
        this.searchSuggestions[key] = items
        return items
      } catch (error: any) {
        this.searchSuggestionsError = error?.message || '加载搜索推荐失败'
        throw error
      } finally {
        this.loadingSearchSuggestions = false
      }
    },

    async loadSearch(config: MediaServerConfig, query: string, force = false) {
      const trimmedQuery = query.trim()
      const key = `${config.id}:${trimmedQuery}`
      if (!trimmedQuery) {
        this.searchError = ''
        return { query: '', items: [] }
      }
      if (!force && this.searchData[key]) return this.searchData[key]
      this.loadingSearch = true
      this.searchError = ''
      try {
        const data = await getMediaServerSearch(config, trimmedQuery)
        this.searchData[key] = data
        return data
      } catch (error: any) {
        this.searchError = error?.message || '搜索媒体服务器内容失败'
        throw error
      } finally {
        this.loadingSearch = false
      }
    },
    async loadCollectionPage(config: MediaServerConfig, kind: 'latest' | 'nextup', preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false, order: MediaServerPageSort = {}) {
      const key = `${config.id}:${kind}`
      const queryKey = 'collection:' + key
      const query = JSON.stringify([config.baseUrl, config.userId, config.accessToken, [preferences, order]])
      const reset = force || this.pageQueries[queryKey] !== query
      if (!reset && this.collectionLoading[key]) return this.collections[key]
      if (reset) {
        delete this.collections[key]
        this.pageQueries[queryKey] = query
        this.pageVersions[queryKey] = (this.pageVersions[queryKey] || 0) + 1
      }
      const version = this.pageVersions[queryKey]
      const current = reset ? undefined : this.collections[key]
      if (current && !force && !current.hasNextPage) return current

      const nextPage = force || !current ? 0 : current.currentPage + 1

      this.loadingCollection = true
      this.collectionLoading[key] = true
      this.collectionError = ''
      this.collectionPageError[key] = ''
      try {
        const page = await getMediaServerCollectionPage(config, kind, nextPage, [], preferences, order)
        if (version !== this.pageVersions[queryKey]) return this.collections[key]
        const mergedItems = force || !current
          ? page.items
          : this.mergeUniqueItems(current.items, page.items)
        this.collections[key] = force || !current
          ? page
          : {
              ...page,
              items: mergedItems,
              hasNextPage: page.hasNextPage && mergedItems.length > current.items.length
            }
        return this.collections[key]
      } catch (error: any) {
        if (version !== this.pageVersions[queryKey]) return this.collections[key]
        this.collectionError = error?.message || '加载媒体集合失败'
        this.collectionPageError[key] = this.collectionError
        throw error
      } finally {
        if (version === this.pageVersions[queryKey]) {
          this.loadingCollection = false
          this.collectionLoading[key] = false
        }
      }
    }
  }
})

export default useMediaServerContentStore

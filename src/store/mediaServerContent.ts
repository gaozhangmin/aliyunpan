import { defineStore } from 'pinia'
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
  loadingHome: boolean
  homeError: string
  homeData: Record<string, MediaServerHomeData>
  excludedLibraryIds: Record<string, string[]>
  homeSectionLoading: Record<string, boolean>
  homeLibrarySectionLoading: Record<string, boolean>
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
    loadingHome: false,
    homeError: '',
    homeData: {},
    excludedLibraryIds: {},
    homeSectionLoading: {},
    homeLibrarySectionLoading: {},
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
    queueLibraryPageLoad(config: MediaServerConfig, parentId: string, force = false, recursiveMedia = true) {
      const key = `${config.id}:${parentId}`
      if (force) {
        this.libraryPendingLoads[key] = 0
        return this.loadLibraryPage(config, parentId, true, recursiveMedia)
      }
      if (this.libraryPageLoading[key]) {
        this.libraryPendingLoads[key] = (this.libraryPendingLoads[key] || 0) + 1
        return Promise.resolve(this.currentPagedLibrary(key).items)
      }
      return this.loadLibraryPage(config, parentId, false, recursiveMedia)
    },
    async flushQueuedLibraryPageLoad(config: MediaServerConfig, parentId: string, recursiveMedia = true) {
      const key = `${config.id}:${parentId}`
      if ((this.libraryPendingLoads[key] || 0) <= 0) return
      this.libraryPendingLoads[key] = Math.max(0, (this.libraryPendingLoads[key] || 0) - 1)
      if (!this.currentPagedLibrary(key).hasNextPage) {
        this.libraryPendingLoads[key] = 0
        return
      }
      try {
        await this.loadLibraryPage(config, parentId, false, recursiveMedia)
      } catch {
        // keep queued state cleared; caller already has per-page error state
      }
    },
    queueCollectionPageLoad(config: MediaServerConfig, kind: 'latest' | 'nextup', preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false) {
      const key = `${config.id}:${kind}`
      if (force) {
        this.collectionPendingLoads[key] = 0
        return this.loadCollectionPage(config, kind, preferences, true)
      }
      if (this.collectionLoading[key]) {
        this.collectionPendingLoads[key] = (this.collectionPendingLoads[key] || 0) + 1
        return Promise.resolve(this.currentCollection(key))
      }
      return this.loadCollectionPage(config, kind, preferences, false)
    },
    async flushQueuedCollectionPageLoad(config: MediaServerConfig, kind: 'latest' | 'nextup', preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>) {
      const key = `${config.id}:${kind}`
      if ((this.collectionPendingLoads[key] || 0) <= 0) return
      this.collectionPendingLoads[key] = Math.max(0, (this.collectionPendingLoads[key] || 0) - 1)
      if (!this.currentCollection(key).hasNextPage) {
        this.collectionPendingLoads[key] = 0
        return
      }
      try {
        await this.loadCollectionPage(config, kind, preferences, false)
      } catch {
        // keep queued state cleared; caller already has per-page error state
      }
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
    async loadHomeShell(config: MediaServerConfig, force = false) {
      const hasCachedHome = !!this.homeData[config.id]
      if (!force && hasCachedHome) return this.homeData[config.id]
      this.loadingHome = !hasCachedHome
      this.homeError = ''
      try {
        const shell = await getMediaServerHomeShell(config)
        const excluded = new Set(this.excludedLibraryIds[config.id] || [])
        this.homeData[config.id] = {
          ...emptyHomeData(),
          ...shell,
          libraries: excluded.size > 0
            ? shell.libraries.filter((library) => !excluded.has(library.id)).map((library) => ({ ...library, attempted: false }))
            : shell.libraries.map((library) => ({ ...library, attempted: false }))
        }
        return this.homeData[config.id]
      } catch (error: any) {
        this.homeError = error?.message || '加载媒体服务器主页失败'
        throw error
      } finally {
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
      const key = `${config.id}:resume`
      const current = this.homeData[config.id]
      if (!force && current?.resume?.length) return current.resume
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const resume = await getMediaServerHomeResume(config)
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, resume }
        return resume
      } catch (error: any) {
        this.homeSectionError[key] = error?.message || '加载继续观看失败'
        throw error
      } finally {
        this.homeSectionLoading[key] = false
      }
    },
    async loadHomeLatest(config: MediaServerConfig, force = false) {
      const key = `${config.id}:latest`
      const current = this.homeData[config.id]
      if (!force && current?.latest?.length) return current.latest
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const latest = await getMediaServerHomeLatest(config)
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, latest: latest.items, latestTotal: latest.total }
        return latest.items
      } catch (error: any) {
        this.homeSectionError[key] = error?.message || '加载最近添加失败'
        throw error
      } finally {
        this.homeSectionLoading[key] = false
      }
    },
    async loadHomeNextUp(config: MediaServerConfig, preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false) {
      const key = `${config.id}:nextup`
      const current = this.homeData[config.id]
      if (!force && current?.nextUp?.length) return current.nextUp
      this.homeSectionLoading[key] = true
      this.homeSectionError[key] = ''
      try {
        const nextUp = await getMediaServerHomeNextUp(config, preferences)
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = { ...base, nextUp: nextUp.items, nextUpTotal: nextUp.total }
        return nextUp.items
      } catch (error: any) {
        this.homeSectionError[key] = error?.message || '加载下一集失败'
        throw error
      } finally {
        this.homeSectionLoading[key] = false
      }
    },
    async loadHomeLibrarySection(config: MediaServerConfig, libraryId: string, force = false) {
      const sectionKey = `${config.id}:library:${libraryId}`
      const current = this.homeData[config.id]
      const matched = current?.libraries.find((item) => item.id === libraryId)
      if (!force && matched?.items?.length) return matched.items
      this.homeLibrarySectionLoading[sectionKey] = true
      this.homeSectionError[sectionKey] = ''
      try {
        const result = await getMediaServerHomeLibraryLatest(config, libraryId, matched?.collectionType)
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = {
          ...base,
          libraries: base.libraries.map((library) => library.id === libraryId ? { ...library, items: result.items, total: result.total, attempted: true } : library)
        }
        return result.items
      } catch (error: any) {
        const base = this.homeData[config.id] || emptyHomeData()
        this.homeData[config.id] = {
          ...base,
          libraries: base.libraries.map((library) => library.id === libraryId ? { ...library, attempted: true } : library)
        }
        this.homeSectionError[sectionKey] = error?.message || '加载媒体库分区失败'
        throw error
      } finally {
        this.homeLibrarySectionLoading[sectionKey] = false
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
            const cachedSection = homeLibraries.find((item) => item.id === library.id)?.items || []
            const latestSection = cachedSection.length > 0
              ? cachedSection
              : await getMediaServerHomeLibraryLatest(config, library.id, library.collectionType).then((result) => result.items).catch(() => [])
            const sectionItems = latestSection
            const candidates = sectionItems.filter((item) => item.images?.primary || item.poster)
            if (candidates.length === 0) return library
            const randomItem = candidates[Math.floor(Math.random() * candidates.length)]
            const primary = randomItem.images?.primary || randomItem.poster
            if (!primary) return library
            return {
              ...library,
              poster: primary,
              backdrop: primary,
              images: {
                ...library.images,
                primary,
                backdrop: primary
              }
            }
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
    async loadLibraryPage(config: MediaServerConfig, parentId: string, force = false, recursiveMedia = true) {
      const key = `${config.id}:${parentId}`
      const current = this.libraryPagedPages[key]
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
          collectionType
        })
        const mergedItems = force || !current
          ? data.items
          : this.mergeUniqueItems(current.items, data.items)
        this.libraryPagedPages[key] = force || !current
          ? data
          : {
              ...data,
              items: mergedItems,
              hasNextPage: data.items.length >= 50 && mergedItems.length < (data.total || Number.MAX_SAFE_INTEGER)
            }
        this.libraryPages[key] = this.libraryPagedPages[key].items
        return this.libraryPages[key]
      } catch (error: any) {
        this.libraryError = error?.message || '加载媒体库内容失败'
        this.libraryPageError[key] = this.libraryError
        throw error
      } finally {
        this.loadingLibrary = false
        this.libraryPageLoading[key] = false
        if (!force && this.libraryPendingLoads[key] > 0 && this.libraryPagedPages[key]?.hasNextPage) {
          void this.flushQueuedLibraryPageLoad(config, parentId, recursiveMedia)
        } else if (!this.libraryPagedPages[key]?.hasNextPage) {
          this.libraryPendingLoads[key] = 0
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
    async loadFilteredPage(config: MediaServerConfig, keySuffix: string, options: { genre?: string; studio?: string; parentId?: string }, force = false) {
      const key = `${config.id}:${keySuffix}`
      const current = this.libraryPagedPages[key]
      if (current && !force && !current.hasNextPage) return current.items
      this.loadingLibrary = true
      this.libraryPageLoading[key] = true
      this.libraryError = ''
      this.libraryPageError[key] = ''
      try {
        const nextPage = force || !current ? 0 : current.currentPage + 1
        const data = await getMediaServerFilteredPagedItems(config, nextPage, options)
        const mergedItems = force || !current
          ? data.items
          : this.mergeUniqueItems(current.items, data.items)
        this.libraryPagedPages[key] = force || !current
          ? { ...data, key }
          : {
              ...data,
              key,
              items: mergedItems,
              hasNextPage: data.items.length >= 50 && mergedItems.length < (data.total || Number.MAX_SAFE_INTEGER)
            }
        this.libraryPages[key] = this.libraryPagedPages[key].items
        return this.libraryPages[key]
      } catch (error: any) {
        this.libraryError = error?.message || '加载筛选内容失败'
        this.libraryPageError[key] = this.libraryError
        throw error
      } finally {
        this.loadingLibrary = false
        this.libraryPageLoading[key] = false
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
    async loadCollectionPage(config: MediaServerConfig, kind: 'latest' | 'nextup', preferences: Pick<MediaServerHomePreferencesState, 'resumeNextUp' | 'maxNextUpDays'>, force = false) {
      const key = `${config.id}:${kind}`
      const current = this.collections[key]
      if (current && !force && !current.hasNextPage) return current

      const nextPage = force || !current ? 0 : current.currentPage + 1
      const excludeItemIds = force || !current ? [] : current.items.map((item) => item.id).filter(Boolean)

      this.loadingCollection = true
      this.collectionLoading[key] = true
      this.collectionError = ''
      this.collectionPageError[key] = ''
      try {
        const page = await getMediaServerCollectionPage(config, kind, nextPage, excludeItemIds, preferences)
        const mergedItems = force || !current
          ? page.items
          : this.mergeUniqueItems(current.items, page.items)
        this.collections[key] = force || !current
          ? page
          : {
              ...page,
              items: mergedItems,
              hasNextPage: page.items.length >= 50 && mergedItems.length < (page.total || Number.MAX_SAFE_INTEGER)
            }
        return this.collections[key]
      } catch (error: any) {
        this.collectionError = error?.message || '加载媒体集合失败'
        this.collectionPageError[key] = this.collectionError
        throw error
      } finally {
        this.loadingCollection = false
        this.collectionLoading[key] = false
        if (!force && this.collectionPendingLoads[key] > 0 && this.collections[key]?.hasNextPage) {
          void this.flushQueuedCollectionPageLoad(config, kind, preferences)
        } else if (!this.collections[key]?.hasNextPage) {
          this.collectionPendingLoads[key] = 0
        }
      }
    }
  }
})

export default useMediaServerContentStore

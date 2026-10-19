import useCategoryPlacement from './categoryPlacement'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { MediaLibraryItem, MediaLibraryFolder, MediaFilter, FavoriteId, PlaylistMap } from '../types/media'
import { getWebDavConnections } from '../utils/webdavClient'
import DB from '../utils/db'
import { mergeDriveFileSources, reconcileMediaItemSource } from '../utils/mediaSourceMembership'
import { MediaPersistenceError, mediaPersistenceSnapshot } from '../utils/mediaPersistenceSnapshot'
import { mergeScrapedMedia, scrapedMediaId } from '../utils/mediaScrapeMerge'
import { t } from '../i18n'

// 本地存储的键名
const STORAGE_KEYS = {
  MEDIA_ITEMS: 'MediaLibrary_MediaItems',
  FOLDERS: 'MediaLibrary_Folders',
  CONTINUE_WATCHING: 'MediaLibrary_ContinueWatching',
  RECENTLY_ADDED: 'MediaLibrary_RecentlyAdded',
  FAVORITES: 'MediaLibrary_Favorites',
  PLAYLISTS: 'MediaLibrary_Playlists',
  WATCHED: 'MediaLibrary_Watched'
}
const MEDIA_LIBRARY_DEXIE_MIGRATION_KEY = 'MediaLibrary_DexieMigrated_v1'
const MEDIA_LIBRARY_CACHE_PAGE_SIZE = 100
const RECENT_RECOVERY_KEY = 'MediaLibrary_RecentRecovery_v1'

const shouldLoadLegacyMediaLibrary = () => {
  try { return localStorage.getItem(MEDIA_LIBRARY_DEXIE_MIGRATION_KEY) !== '1' } catch { return true }
}

// 从localStorage加载数据
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 如果是数组且包含日期字段，需要转换Date对象
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (item.addedAt && typeof item.addedAt === 'string') {
            item.addedAt = new Date(item.addedAt)
          }
          if (item.scanDate && typeof item.scanDate === 'string') {
            item.scanDate = new Date(item.scanDate)
          }
          if (item.lastWatched && typeof item.lastWatched === 'string') {
            item.lastWatched = new Date(item.lastWatched)
          }
          return item
        }) as T
      }
      return parsed
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error)
  }
  return defaultValue
}

// 保存到localStorage
const saveToStorage = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

const normalizeFolders = (folderList: MediaLibraryFolder[]): MediaLibraryFolder[] => {
  const webDavConnections = getWebDavConnections()
  const webDavIds = new Set(webDavConnections.map(item => item.id))
  return folderList.map((folder) => {
    const isWebDavFolder = (folder.driveId || '').startsWith('webdav:')
      || folder.driveServerId === 'webdav'
      || (!!folder.userId && webDavIds.has(folder.userId))
      || folder.id.startsWith('webdav_')
    if (!isWebDavFolder) return folder

    const connectionId = folder.userId && webDavIds.has(folder.userId)
      ? folder.userId
      : (folder.driveId || '').startsWith('webdav:')
        ? folder.driveId.slice('webdav:'.length)
        : folder.id.match(/^webdav_webdav:([^_]+)_/)?.[1] || ''

    if (!connectionId) return folder

    return {
      ...folder,
      userId: connectionId,
      driveId: `webdav:${connectionId}`,
      driveServerId: 'webdav'
    }
  })
}

const mergeNewestById = <T extends { id: string }>(stored: T[], legacy: T[], timestamp: (item: T) => number): T[] => {
  const merged = new Map(stored.map(item => [item.id, item]))
  legacy.forEach((item) => {
    const existing = merged.get(item.id)
    if (!existing || timestamp(item) >= timestamp(existing)) merged.set(item.id, item)
  })
  return Array.from(merged.values())
}

const uniqueDriveFiles = mergeDriveFileSources

export const syncMediaLibraryStoreFromStorage = (store: {
  mediaItems: MediaLibraryItem[]
  folders: MediaLibraryFolder[]
  updateFilters: () => void
}) => {
  store.mediaItems = loadFromStorage(STORAGE_KEYS.MEDIA_ITEMS, [])
  store.folders = normalizeFolders(loadFromStorage(STORAGE_KEYS.FOLDERS, []))
  store.updateFilters()
}

export const useMediaLibraryStore = defineStore('mediaLibrary', () => {
  // 状态 - 从localStorage加载初始数据
  const catalogRevision = ref(0)
  const mediaItems = ref<MediaLibraryItem[]>(shouldLoadLegacyMediaLibrary() ? loadFromStorage(STORAGE_KEYS.MEDIA_ITEMS, []) : [])
  const folders = ref<MediaLibraryFolder[]>(shouldLoadLegacyMediaLibrary() ? normalizeFolders(loadFromStorage(STORAGE_KEYS.FOLDERS, [])) : [])
  const isScanning = ref(false)
  const scanProgress = ref(0)
  const scanTotal = ref(0)
  const continueWatching = ref<MediaLibraryItem[]>(loadFromStorage(STORAGE_KEYS.CONTINUE_WATCHING, []))
  const recentlyAdded = ref<MediaLibraryItem[]>(loadFromStorage(STORAGE_KEYS.RECENTLY_ADDED, []))
  const favorites = ref<FavoriteId[]>(loadFromStorage(STORAGE_KEYS.FAVORITES, []))
  const playlists = ref<PlaylistMap>(loadFromStorage(STORAGE_KEYS.PLAYLISTS, {}))
  const watchedItems = ref<string[]>(loadFromStorage(STORAGE_KEYS.WATCHED, []))
  const hydrated = ref(false)
  const mediaItemCount = ref(0)
  const mediaTypeCounts = ref<Record<MediaLibraryItem['type'], number>>({ movie: 0, tv: 0, unmatched: 0 })
  const mediaChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('boxplayer-media-library')
  let mediaSaveTimer: ReturnType<typeof setTimeout> | undefined
  let mediaWriteChain: Promise<void> = Promise.resolve()
  let mediaWriteError: unknown
  let isHydrating = false
  let persistenceBatchDepth = 0
  const persistenceWatchStops: Array<() => void> = []
  const dirtyMediaItems = new Map<string, MediaLibraryItem>()
  const deletedMediaItemIds = new Set<string>()
  const dirtyFolders = new Map<string, MediaLibraryFolder>()
  const deletedFolderIds = new Set<string>()

  const markMediaItemDirty = (item: MediaLibraryItem) => {
    deletedMediaItemIds.delete(item.id)
    dirtyMediaItems.set(item.id, item)
  }

  const markMediaItemDeleted = (id: string) => {
    dirtyMediaItems.delete(id)
    deletedMediaItemIds.add(id)
  }

  const markFolderDirty = (folder: MediaLibraryFolder) => {
    deletedFolderIds.delete(folder.id)
    dirtyFolders.set(folder.id, folder)
  }

  const markFolderDeleted = (id: string) => {
    dirtyFolders.delete(id)
    deletedFolderIds.add(id)
  }

  const stopPersistenceWatchers = () => {
    while (persistenceWatchStops.length) persistenceWatchStops.pop()?.()
  }

  const startPersistenceWatchers = () => {
    persistenceWatchStops.push(watch(mediaItems, () => scheduleMediaSave(), { deep: true }))
    persistenceWatchStops.push(watch(folders, () => scheduleMediaSave(), { deep: true }))
    persistenceWatchStops.push(watch(continueWatching, (newValue) => saveToStorage(STORAGE_KEYS.CONTINUE_WATCHING, newValue), { deep: true }))
    persistenceWatchStops.push(watch(recentlyAdded, (newValue) => saveToStorage(STORAGE_KEYS.RECENTLY_ADDED, newValue), { deep: true }))
    persistenceWatchStops.push(watch(favorites, (newValue) => saveToStorage(STORAGE_KEYS.FAVORITES, newValue), { deep: true }))
    persistenceWatchStops.push(watch(playlists, (newValue) => saveToStorage(STORAGE_KEYS.PLAYLISTS, newValue), { deep: true }))
    persistenceWatchStops.push(watch(watchedItems, (newValue) => saveToStorage(STORAGE_KEYS.WATCHED, newValue), { deep: true }))
  }

  const beginPersistenceBatch = () => {
    if (persistenceBatchDepth === 0) stopPersistenceWatchers()
    persistenceBatchDepth += 1
  }

  const endPersistenceBatch = () => {
    if (persistenceBatchDepth === 0) return
    persistenceBatchDepth -= 1
    if (persistenceBatchDepth > 0) return

    saveToStorage(STORAGE_KEYS.CONTINUE_WATCHING, continueWatching.value)
    saveToStorage(STORAGE_KEYS.RECENTLY_ADDED, recentlyAdded.value)
    saveToStorage(STORAGE_KEYS.FAVORITES, favorites.value)
    saveToStorage(STORAGE_KEYS.PLAYLISTS, playlists.value)
    saveToStorage(STORAGE_KEYS.WATCHED, watchedItems.value)
    persistMediaLibrary()
    startPersistenceWatchers()
  }

  const checkpointPersistenceBatch = () => {
    if (persistenceBatchDepth === 0) return
    saveToStorage(STORAGE_KEYS.CONTINUE_WATCHING, continueWatching.value)
    saveToStorage(STORAGE_KEYS.RECENTLY_ADDED, recentlyAdded.value)
    persistMediaLibrary()
  }

  const persistMediaLibrary = () => {
    if (isHydrating) return
    const folderDeletes = Array.from(deletedFolderIds)
    const deletedFolderSet = new Set(folderDeletes)
    const itemUpserts = mediaPersistenceSnapshot(Array.from(dirtyMediaItems.values()).filter(item => !item.folderId || !deletedFolderSet.has(item.folderId)))
    const itemDeletes = Array.from(deletedMediaItemIds)
    const folderUpserts = mediaPersistenceSnapshot(Array.from(dirtyFolders.values()))
    if (!itemUpserts.length && !itemDeletes.length && !folderUpserts.length && !folderDeletes.length) return

    dirtyMediaItems.clear()
    deletedMediaItemIds.clear()
    dirtyFolders.clear()
    deletedFolderIds.clear()

    mediaWriteChain = mediaWriteChain
      .catch(() => {})
      .then(async () => {
        await DB.deleteMediaLibraryItems(itemDeletes)
        await DB.deleteMediaLibraryFolders(folderDeletes)
        await DB.upsertMediaLibraryFolders(folderUpserts)
        // Store snapshots are complete; replacements must allow edits and removals.
        await DB.upsertMediaLibraryItems(itemUpserts, false)
        mediaWriteError = undefined
        catalogRevision.value++
        void refreshMediaCounts()
        mediaChannel?.postMessage({ type: 'changed' })
      })
      .catch((error) => {
        mediaWriteError = error
        itemUpserts.forEach(markMediaItemDirty)
        itemDeletes.forEach(markMediaItemDeleted)
        folderUpserts.forEach(markFolderDirty)
        folderDeletes.forEach(markFolderDeleted)
        console.error('Error saving media library to DB:', error)
      })
  }

  const flushPersistence = async () => {
    if (mediaSaveTimer) clearTimeout(mediaSaveTimer)
    await mediaWriteChain
    persistMediaLibrary()
    await mediaWriteChain
    if (mediaWriteError) throw new MediaPersistenceError(mediaWriteError)
  }

  const scheduleMediaSave = () => {
    if (isHydrating) return
    if (mediaSaveTimer) clearTimeout(mediaSaveTimer)
    mediaSaveTimer = setTimeout(persistMediaLibrary, 300)
  }

  const refreshMediaCounts = async () => {
    const [total, movie, tv, unmatched] = await Promise.all([
      DB.countMediaLibraryItems(),
      DB.countMediaLibraryItems({ type: 'movie' }),
      DB.countMediaLibraryItems({ type: 'tv' }),
      DB.countMediaLibraryItems({ type: 'unmatched' })
    ])
    mediaItemCount.value = total
    mediaTypeCounts.value = { movie, tv, unmatched }
  }

  const hydrateInternal = async () => {
    await mediaWriteChain
    if (typeof indexedDB === 'undefined') {
      hydrated.value = true
      catalogRevision.value++
      return
    }
    try {
      isHydrating = true
      const hasLegacyMigration = localStorage.getItem(MEDIA_LIBRARY_DEXIE_MIGRATION_KEY) === '1'
      let items: MediaLibraryItem[] = []
      let folderList = normalizeFolders(await DB.getMediaLibraryFolders())

      if (!hasLegacyMigration) {
        const stored = await DB.getMediaLibrary()
        items = mergeNewestById(stored.items, mediaItems.value, item => new Date(item.addedAt).getTime() || 0)
        folderList = mergeNewestById(folderList, normalizeFolders(folders.value), folder => new Date(folder.scanDate).getTime() || 0)
        if (items.length || folderList.length) await DB.saveMediaLibrary(items, folderList)
        localStorage.setItem(MEDIA_LIBRARY_DEXIE_MIGRATION_KEY, '1')
        localStorage.removeItem(STORAGE_KEYS.MEDIA_ITEMS)
        localStorage.removeItem(STORAGE_KEYS.FOLDERS)
      }
      if (dirtyMediaItems.size || deletedMediaItemIds.size || dirtyFolders.size || deletedFolderIds.size) {
        const itemMap = new Map(mediaItems.value.map(item => [item.id, item]))
        deletedMediaItemIds.forEach(id => itemMap.delete(id))
        dirtyMediaItems.forEach((item, id) => itemMap.set(id, item))
        const folderMap = new Map(folderList.map(folder => [folder.id, folder]))
        deletedFolderIds.forEach(id => folderMap.delete(id))
        dirtyFolders.forEach((folder, id) => folderMap.set(id, folder))
        items = Array.from(itemMap.values())
        folderList = Array.from(folderMap.values())
      }
      if (localStorage.getItem(RECENT_RECOVERY_KEY) !== '1') {
        const folderIds = new Set(folderList.map(folder => folder.id))
        const candidates = recentlyAdded.value.filter(item => item.folderId && folderIds.has(item.folderId)
          && !deletedMediaItemIds.has(item.id)
          && (item.driveFiles?.some(file => !!file.id) || item.seasons?.some(season => season.episodes?.some(episode => episode.driveFiles?.some(file => !!file.id)))))
        const existing = await DB.getMediaLibraryItemsByIds(candidates.map(item => item.id))
        const existingIds = new Set(existing.map(item => item.id))
        const missing = candidates.filter(item => !existingIds.has(item.id))
        if (missing.length) {
          // Preserve the original journal; never overwrite existing DB metadata.
          if (!localStorage.getItem(`${RECENT_RECOVERY_KEY}_backup`)) saveToStorage(`${RECENT_RECOVERY_KEY}_backup`, recentlyAdded.value)
          await DB.upsertMediaLibraryItems(mediaPersistenceSnapshot(missing))
          console.info(`Recovered ${missing.length} media records from the recent journal`)
        }
        localStorage.setItem(RECENT_RECOVERY_KEY, '1')
      }
      const persistedRecent = await DB.getMediaLibraryItemsByIds(recentlyAdded.value.map(item => item.id))
      const recentById = new Map(persistedRecent.map(item => [item.id, item]))
      recentlyAdded.value = recentlyAdded.value.flatMap(item => {
        const canonical = recentById.get(item.id) || dirtyMediaItems.get(item.id)
        return canonical ? [canonical] : []
      })
      mediaItems.value = items.length ? items.slice(0, MEDIA_LIBRARY_CACHE_PAGE_SIZE) : await DB.getMediaLibraryPage({ limit: MEDIA_LIBRARY_CACHE_PAGE_SIZE })
      folders.value = folderList
      updateFilters()
      await refreshMediaCounts()
    } catch (error) {
      console.error('Error hydrating media library from DB:', error)
    } finally {
      isHydrating = false
      hydrated.value = true
      if (dirtyMediaItems.size || deletedMediaItemIds.size || dirtyFolders.size || deletedFolderIds.size) scheduleMediaSave()
    }
  }

  let hydrationPromise: Promise<void> | undefined
  const hydrate = () => {
    if (!hydrationPromise) hydrationPromise = hydrateInternal().finally(() => { hydrationPromise = undefined })
    return hydrationPromise
  }

  mediaChannel?.addEventListener('message', (event) => {
    if (event.data?.type === 'changed') void hydrate()
  })

  const genres = ref<string[]>([])
  const years = ref<number[]>([])

  // 监听数据变化并自动保存到localStorage
  startPersistenceWatchers()

  // 计算属性
  const movies = computed(() => mediaItems.value.filter(item => item.type === 'movie'))
  const tvShows = computed(() => mediaItems.value.filter(item => item.type === 'tv'))
  const unmatchedItems = computed(() => mediaItems.value.filter(item => item.type === 'unmatched'))
  
  const topRated = computed(() => 
    mediaItems.value
      .filter(item => item.rating && item.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 30)
  )

  const ratingCategories = computed(() => {
    const categories = [
      { range: [8, 10], label: t('aggregation.rating8To10'), items: [] as MediaLibraryItem[] },
      { range: [7, 7.99], label: t('home.ratingStars', { count: 7 }), items: [] as MediaLibraryItem[] },
      { range: [6, 6.99], label: t('home.ratingStars', { count: 6 }), items: [] as MediaLibraryItem[] },
      { range: [5, 5.99], label: t('home.ratingStars', { count: 5 }), items: [] as MediaLibraryItem[] },
      { range: [1, 4.99], label: t('aggregation.rating1To4'), items: [] as MediaLibraryItem[] }
    ]

    mediaItems.value.forEach(item => {
      // 更强健的评分检查和转换
      let rating: number | undefined

      if (item.rating !== undefined && item.rating !== null) {
        // 尝试将评分转换为数字
        rating = typeof item.rating === 'string' ? parseFloat(item.rating) : Number(item.rating)

        // 确保评分是有效数字且在合理范围内
        if (!isNaN(rating) && rating > 0 && rating <= 10) {
          const category = categories.find(c =>
            rating! >= c.range[0] && rating! <= c.range[1]
          )
          if (category) {
            category.items.push(item)
          }
        }
      }
    })

    return [{
      name: t('aggregation.top30'), count: topRated.value.length, type: 'rating' as const,
      range: [1, 10], items: topRated.value
    }, ...categories
      .filter(c => c.items.length > 0)
      .map(c => ({
        name: c.label,
        count: c.items.length,
        type: 'rating' as const,
        range: c.range,
        items: c.items
      }))].filter(c => c.items.length > 0)
  })

  const yearGroups = computed(() => {
    const groups: { [key: string]: MediaLibraryItem[] } = {}
    const dated = mediaItems.value.filter(item => item.year && Number.isFinite(parseInt(item.year)))

    mediaItems.value.forEach(item => {
      if (item.year) {
        const year = parseInt(item.year)
        if (!Number.isFinite(year) || year <= 0) return
        const key = year >= 2020 ? '2020+' : year < 1940 ? t('aggregation.earlier') : `${Math.floor(year / 10) * 10}s`
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
      }
    })

    const newest = [...dated].sort((a, b) => String(b.releaseDate || b.year || '').localeCompare(String(a.releaseDate || a.year || ''))).slice(0, 30)
    const order = ['2020+', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s', '1940s', t('aggregation.earlier')]
    return [{ name: t('aggregation.newest'), items: newest }, ...order.filter(key => groups[key]?.length).map(key => ({ name: key, items: groups[key] }))]
      .filter(group => group.items.length > 0)
      .map(group => ({
        name: group.name,
        count: group.items.length,
        type: 'year' as const,
        items: group.items
      }))
  })

  const genreCategories = computed(() => {
    const genreMap = new Map<string, MediaLibraryItem[]>()

    mediaItems.value.forEach(item => {
      item.genres.forEach(genre => {
        if (!genreMap.has(genre)) {
          genreMap.set(genre, [])
        }
        genreMap.get(genre)!.push(item)
      })
    })

    return Array.from(genreMap.entries())
      .map(([name, items]) => ({
        name,
        count: items.length,
        type: 'genre' as const,
        items
      }))
      .sort((a, b) => b.count - a.count)
  })

  // 方法
  const addMediaItem = (item: MediaLibraryItem) => {
    const sameIdentity = item.tmdbId && item.type !== 'unmatched' && !item.collectionId
      ? mediaItems.value.find(existing => existing.type === item.type && existing.tmdbId === item.tmdbId && !existing.collectionId)
      : undefined
    if (sameIdentity) item.id = sameIdentity.id
    else if (item.tmdbId && item.type !== 'unmatched' && !item.collectionId && mediaItems.value.some(existing => existing.id === item.id && existing.type !== item.type)) item.id = scrapedMediaId(item.type, item.tmdbId)
    const existingIndex = mediaItems.value.findIndex(i => i.id === item.id)
    if (existingIndex >= 0) {
      const existing = mediaItems.value[existingIndex]
      item = mergeScrapedMedia(existing, item)
      mediaItems.value[existingIndex] = item
    } else {
      mediaItems.value.push(item)
    }
    markMediaItemDirty(item)
    updateFilters()
  }

  const replaceMediaItemMetadata = (updatedItem: MediaLibraryItem) => {
    const updatedId = String(updatedItem.id)
    const existingIndex = mediaItems.value.findIndex(item => String(item.id) === updatedId)
    let persistedItem = updatedItem

    if (existingIndex >= 0) {
      mediaItems.value[existingIndex] = updatedItem
      markMediaItemDirty(updatedItem)
    } else {
      const collectionIndex = mediaItems.value.findIndex(item => item.collectionMovies?.some(movie => String(movie.id) === updatedId))
      if (collectionIndex >= 0) {
        const collection = mediaItems.value[collectionIndex]
        persistedItem = {
          ...collection,
          collectionMovies: collection.collectionMovies?.map(movie => String(movie.id) === updatedId ? { ...movie, ...updatedItem, type: 'movie' } : movie)
        }
        mediaItems.value[collectionIndex] = persistedItem
        markMediaItemDirty(persistedItem)
      } else {
        mediaItems.value.push(updatedItem)
        markMediaItemDirty(updatedItem)
      }
    }

    recentlyAdded.value = recentlyAdded.value.map(item => String(item.id) === updatedId ? updatedItem : item)
    continueWatching.value = continueWatching.value.map(item => {
      const itemId = String(item.id)
      if (itemId === updatedId) return { ...item, ...updatedItem }
      if (itemId.startsWith(`${updatedId}_`)) return { ...item, ...updatedItem, id: item.id }
      return item
    })
    updateFilters()
    return persistedItem
  }

  // All scrape paths share the same identity and season/file merge rules.
  const addOrMergeTvSeries = (item: MediaLibraryItem): boolean => {
    addMediaItem(item)
    return true
  }

  const removeMediaItem = (id: string) => {
    markMediaItemDeleted(id)
    mediaItems.value = mediaItems.value.filter(item => item.id !== id)
    recentlyAdded.value = recentlyAdded.value.filter(item => item.id !== id)
    updateFilters()
  }

  const updateMediaItem = (id: string, changes: Partial<MediaLibraryItem>) => {
    const index = mediaItems.value.findIndex(item => item.id === id)
    if (index < 0) return
    const item = { ...mediaItems.value[index], ...changes }
    mediaItems.value[index] = item
    markMediaItemDirty(item)
    updateFilters()
  }

  const addFolder = (folder: MediaLibraryFolder) => {
    const existingIndex = folders.value.findIndex(f => f.id === folder.id)
    if (existingIndex >= 0) {
      folders.value[existingIndex] = folder
    } else {
      folders.value.push(folder)
    }
    markFolderDirty(folder)
  }

  const pruneOrphanDuplicateFolders = () => {
    const referencedFolderIds = new Set(mediaItems.value.map(item => item.folderId).filter((id): id is string => Boolean(id)))
    const referencedFolderPaths = new Set(mediaItems.value.map(item => item.folderPath).filter((path): path is string => Boolean(path)))
    const sourceKey = (folder: MediaLibraryFolder) => [folder.userId || '', folder.driveServerId || '', folder.driveId || '', folder.fileId || '', folder.path || ''].join('\n')
    const referencedSourceKeys = new Set(folders.value.filter(folder => referencedFolderIds.has(folder.id) || (!!folder.path && referencedFolderPaths.has(folder.path))).map(sourceKey))
    const originalFolders = folders.value

    folders.value = folders.value.filter(folder => {
      if (referencedFolderIds.has(folder.id) || (!!folder.path && referencedFolderPaths.has(folder.path))) return true
      return !referencedSourceKeys.has(sourceKey(folder))
    })

    const removedCount = originalFolders.length - folders.value.length
    if (removedCount > 0) {
      const keptIds = new Set(folders.value.map(folder => folder.id))
      originalFolders.filter(folder => !keptIds.has(folder.id)).forEach(folder => markFolderDeleted(folder.id))
    }
    return removedCount
  }

  // 移除特定文件夹下的所有媒体项目
  const removeMediaItemsByFolder = (folderId: string) => {
    const removedItems = mediaItems.value.filter(item => item.folderId === folderId)
    mediaItems.value = mediaItems.value.filter(item => item.folderId !== folderId)
    removedItems.forEach(item => markMediaItemDeleted(item.id))
    const removedIds = new Set(removedItems.map(item => item.id))
    recentlyAdded.value = recentlyAdded.value.filter(item => !removedIds.has(item.id))
    const removedCount = removedItems.length
    console.log(`移除了文件夹 ${folderId} 下的 ${removedCount} 个媒体项目`)
    updateFilters()
  }

  // 根据文件夹ID获取媒体项目
  const getMediaItemsByFolder = (folderId: string) => {
    return mediaItems.value.filter(item => item.folderId === folderId)
  }

  // 根据文件夹路径获取媒体项目
  const getMediaItemsByFolderPath = (folderPath: string) => {
    return mediaItems.value.filter(item => item.folderPath === folderPath)
  }

  const reconcileFolderSource = (folderId: string, seenFileKeys: Iterable<string>) => {
    const seen = new Set(seenFileKeys)
    const nextItems: MediaLibraryItem[] = []
    for (const item of mediaItems.value) {
      const result = reconcileMediaItemSource(item, folderId, seen)
      if (!result.changed) {
        nextItems.push(item)
      } else if (result.item) {
        nextItems.push(result.item)
        markMediaItemDirty(result.item)
      } else {
        markMediaItemDeleted(item.id)
      }
    }
    mediaItems.value = nextItems
    const remainingIds = new Set(nextItems.map(item => item.id))
    continueWatching.value = continueWatching.value.filter(item => remainingIds.has(item.id))
    recentlyAdded.value = recentlyAdded.value.filter(item => remainingIds.has(item.id))
    updateFilters()
  }

  const removeFolder = (id: string) => {
    const target = folders.value.find(folder => folder.id === id)
    if (!target) return
    const sourceKey = (folder: MediaLibraryFolder) => [folder.userId || '', folder.driveServerId || '', folder.driveId || '', folder.fileId || '', folder.path || ''].join('\n')
    const targetSourceKey = sourceKey(target)
    const removedFolders = folders.value.filter(folder => folder.id === id || sourceKey(folder) === targetSourceKey)
    const removedFolderIds = new Set(removedFolders.map(folder => folder.id))
    if (target.isDriveRootFavorite) {
      // Removing a root clears its media, not separately saved child favorites.
      for (const folder of folders.value) {
        if (folder.userId === target.userId && folder.driveId === target.driveId
            && folder.driveServerId === target.driveServerId) reconcileFolderSource(folder.id, [])
      }
    }
    reconcileFolderSource(id, [])
    const originalItems = mediaItems.value
    // 删除文件夹
    folders.value = folders.value.filter(folder => !removedFolderIds.has(folder.id))

    for (const folderId of removedFolderIds) {
      if (folderId !== id) reconcileFolderSource(folderId, [])
    }

    // 清理孤儿项：folderId 不属于任何现有文件夹的未匹配项
    const remainingFolderIds = new Set(folders.value.map(f => f.id))
    mediaItems.value = mediaItems.value.filter(item =>
      item.type !== 'unmatched' || !item.folderId || remainingFolderIds.has(item.folderId)
    )
    removedFolders.forEach(folder => markFolderDeleted(folder.id))
    const remainingItemIds = new Set(mediaItems.value.map(item => item.id))
    originalItems.filter(item => !remainingItemIds.has(item.id)).forEach(item => markMediaItemDeleted(item.id))

    // 从继续观看列表中移除相关项目
    continueWatching.value = continueWatching.value.filter(item => !item.folderId || !removedFolderIds.has(item.folderId))

    // 从最近添加列表中移除相关项目
    recentlyAdded.value = recentlyAdded.value.filter(item => !item.folderId || !removedFolderIds.has(item.folderId))

    // 更新筛选器
    updateFilters()
  }

  const removeMediaSourceByUserId = (userId: string) => {
    if (!userId) return

    const removedFolderIds = new Set(
      folders.value
        .filter(folder => folder.userId === userId)
        .map(folder => folder.id)
    )

    const shouldKeep = (item: MediaLibraryItem) => {
      if (item.folderId && removedFolderIds.has(item.folderId)) return false
      return !(item.driveFiles || []).some(file => file.userId === userId)
    }

    const removedFolders = folders.value.filter(folder => folder.userId === userId)
    const originalItems = mediaItems.value
    folders.value = folders.value.filter(folder => folder.userId !== userId)
    mediaItems.value = mediaItems.value.filter(shouldKeep)
    removedFolders.forEach(folder => markFolderDeleted(folder.id))
    const remainingItemIds = new Set(mediaItems.value.map(item => item.id))
    originalItems.filter(item => !remainingItemIds.has(item.id)).forEach(item => markMediaItemDeleted(item.id))
    continueWatching.value = continueWatching.value.filter(shouldKeep)
    recentlyAdded.value = recentlyAdded.value.filter(shouldKeep)

    favorites.value = favorites.value.filter(id => mediaItems.value.some(item => item.id === id))
    Object.keys(playlists.value).forEach((name) => {
      playlists.value[name] = (playlists.value[name] || []).filter(id => mediaItems.value.some(item => item.id === id))
    })
    watchedItems.value = watchedItems.value.filter(id => mediaItems.value.some(item => item.id === id))

    updateFilters()
  }

  const updateFilters = () => {
    // 更新genres
    const allGenres = new Set<string>()
    mediaItems.value.forEach(item => {
      item.genres.forEach(genre => allGenres.add(genre))
    })
    genres.value = Array.from(allGenres).sort()

    // 更新years
    const allYears = new Set<number>()
    mediaItems.value.forEach(item => {
      if (item.year) {
        allYears.add(parseInt(item.year))
      }
    })
    years.value = Array.from(allYears).sort((a, b) => b - a)
  }

  const filterItems = (filter: MediaFilter) => {
    let filtered = [...mediaItems.value]

    if (filter.type) {
      filtered = filtered.filter(item => item.type === filter.type)
    }

    if (filter.genre) {
      filtered = filtered.filter(item => item.genres.includes(filter.genre!))
    }

    if (filter.yearRange) {
      filtered = filtered.filter(item => {
        if (!item.year) return false
        const year = parseInt(item.year)
        return year >= filter.yearRange![0] && year <= filter.yearRange![1]
      })
    }

    if (filter.ratingRange) {
      filtered = filtered.filter(item => {
        if (!item.rating) return false
        return item.rating >= filter.ratingRange![0] && item.rating <= filter.ratingRange![1]
      })
    }

    if (filter.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any

        switch (filter.sortBy) {
          case 'added':
            aVal = a.addedAt.getTime()
            bVal = b.addedAt.getTime()
            break
          case 'title':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'year':
            aVal = parseInt(a.year || '0')
            bVal = parseInt(b.year || '0')
            break
          case 'rating':
            aVal = a.rating || 0
            bVal = b.rating || 0
            break
          default:
            return 0
        }

        if (filter.sortOrder === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        }
      })
    }

    return filtered
  }

  const setScanning = (scanning: boolean) => {
    isScanning.value = scanning
  }

  const setScanProgress = (progress: number, total: number) => {
    scanProgress.value = progress
    scanTotal.value = total
  }

  const addToContinueWatching = (item: MediaLibraryItem) => {
    const isEpisodeId = item.type === 'tv' && String(item.id).split('_').length >= 3
    if (isEpisodeId) {
      continueWatching.value = continueWatching.value.filter(i => i.id !== item.id)
      continueWatching.value.unshift(item)
    } else if (item.type === 'tv' && item.lastPlayedFileId) {
      const season = item.seasons?.find(s =>
        s.episodes?.some(ep => ep.driveFiles?.some(file => file.id === item.lastPlayedFileId))
      )
      const episode = season?.episodes?.find(ep =>
        ep.driveFiles?.some(file => file.id === item.lastPlayedFileId)
      )
      if (season && episode) {
        const episodeId = `${item.id}_${season.seasonNumber}_${episode.episodeNumber}`
        const episodeItem = {
          ...item,
          id: episodeId
        }
        continueWatching.value = continueWatching.value.filter(i => i.id !== episodeId)
        continueWatching.value.unshift(episodeItem)
      } else {
        continueWatching.value = continueWatching.value.filter(i => i.id !== item.id)
        continueWatching.value.unshift(item)
      }
    } else {
      continueWatching.value = continueWatching.value.filter(i => i.id !== item.id)
      continueWatching.value.unshift(item)
    }
    if (continueWatching.value.length > 20) {
      continueWatching.value = continueWatching.value.slice(0, 20)
    }
  }

  const addToRecentlyAdded = (item: MediaLibraryItem) => {
    recentlyAdded.value = recentlyAdded.value.filter(i => i.id !== item.id)
    recentlyAdded.value.unshift(item)
    if (recentlyAdded.value.length > 50) {
      recentlyAdded.value = recentlyAdded.value.slice(0, 50)
    }
  }

  const isFavorite = (id: string) => {
    return favorites.value.includes(id)
  }

  const toggleFavorite = (favoriteId: FavoriteId) => {
    if (isFavorite(favoriteId)) {
      const key = String(favoriteId)
      favorites.value = favorites.value.filter(item => !String(item).startsWith(key))
    } else {
      favorites.value.unshift(favoriteId)
    }
  }

  const removeFromFavorites = (id: string) => {
    favorites.value = favorites.value.filter(item => item !== id)
  }

  const isWatched = (id: string) => watchedItems.value.includes(id)

  const markWatched = (id: string, watched: boolean) => {
    if (watched) {
      if (!watchedItems.value.includes(id)) watchedItems.value.unshift(id)
    } else {
      watchedItems.value = watchedItems.value.filter(item => item !== id)
    }
  }

  const isWatchedById = (id: string) => watchedItems.value.includes(id)

  const removeWatchedByPrefix = (prefix: string) => {
    watchedItems.value = watchedItems.value.filter(item => item !== prefix && !String(item).startsWith(prefix + '_'))
  }

  const removeFromContinueWatching = (id: string) => {
    continueWatching.value = continueWatching.value.filter(item => item.id !== id)
  }

  const removeFromPlaylists = (id: string) => {
    const updated: PlaylistMap = {}
    Object.entries(playlists.value || {}).forEach(([name, ids]) => {
      updated[name] = ids.filter(itemId => itemId !== id)
    })
    playlists.value = updated
  }

  const addPlaylist = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!playlists.value[trimmed]) {
      playlists.value = { ...playlists.value, [trimmed]: [] }
    }
  }

  const removePlaylist = (name: string) => {
    if (!playlists.value[name]) return
    const { [name]: _removed, ...rest } = playlists.value
    playlists.value = rest
  }

  const renamePlaylist = (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || !playlists.value[oldName] || oldName === trimmed) return
    if (playlists.value[trimmed]) return
    const items = playlists.value[oldName]
    const { [oldName]: _removed, ...rest } = playlists.value
    playlists.value = { ...rest, [trimmed]: items }
    useCategoryPlacement().renameRoute('playlist/' + encodeURIComponent(oldName), 'playlist/' + encodeURIComponent(trimmed))
  }

  const isInPlaylist = (name: string, itemId: string) => {
    const list = playlists.value[name]
    if (!list) return false
    return list.includes(itemId)
  }

  const togglePlaylistItem = (name: string, itemId: string) => {
    const list = playlists.value[name] || []
    if (list.includes(itemId)) {
      playlists.value = {
        ...playlists.value,
        [name]: list.filter(id => id !== itemId)
      }
    } else {
      playlists.value = {
        ...playlists.value,
        [name]: [...list, itemId]
      }
    }
  }

  // 清除所有数据（用于调试或重置）
  const clearAllData = () => {
    mediaItems.value.forEach(item => markMediaItemDeleted(item.id))
    folders.value.forEach(folder => markFolderDeleted(folder.id))
    mediaItems.value = []
    folders.value = []
    continueWatching.value = []
    recentlyAdded.value = []
    favorites.value = []
    playlists.value = {}
    watchedItems.value = []
    genres.value = []
    years.value = []

    // 清除localStorage
    localStorage.removeItem(STORAGE_KEYS.MEDIA_ITEMS)
    localStorage.removeItem(STORAGE_KEYS.FOLDERS)
    localStorage.removeItem(STORAGE_KEYS.CONTINUE_WATCHING)
    localStorage.removeItem(STORAGE_KEYS.RECENTLY_ADDED)
    localStorage.removeItem(STORAGE_KEYS.FAVORITES)
    localStorage.removeItem(STORAGE_KEYS.PLAYLISTS)
    localStorage.removeItem(STORAGE_KEYS.WATCHED)
    persistMediaLibrary()
  }

  // 初始化时更新筛选器
  pruneOrphanDuplicateFolders()
  updateFilters()
  void hydrate()

  return {
    // 状态
    mediaItems,
    catalogRevision,
    folders,
    hydrated,
    mediaItemCount,
    mediaTypeCounts,
    isScanning,
    scanProgress,
    scanTotal,
    continueWatching,
    recentlyAdded,
    favorites,
    playlists,
    watchedItems,
    genres,
    years,

    // 计算属性
    movies,
    tvShows,
    unmatchedItems,
    topRated,
    ratingCategories,
    yearGroups,
    genreCategories,

    // 方法
    addMediaItem,
    replaceMediaItemMetadata,
    addOrMergeTvSeries,
    updateMediaItem,
    removeMediaItem,
    removeMediaItemsByFolder,
    addFolder,
    pruneOrphanDuplicateFolders,
    removeFolder,
    removeMediaSourceByUserId,
    getMediaItemsByFolder,
    getMediaItemsByFolderPath,
    reconcileFolderSource,
    filterItems,
    setScanning,
    setScanProgress,
    addToContinueWatching,
    addToRecentlyAdded,
    toggleFavorite,
    removeFromFavorites,
    isWatched,
    isWatchedById,
    markWatched,
    isFavorite,
    removeFromContinueWatching,
    removeFromPlaylists,
    removeWatchedByPrefix,
    addPlaylist,
    removePlaylist,
    renamePlaylist,
    isInPlaylist,
    togglePlaylistItem,
    updateFilters,
    beginPersistenceBatch,
    checkpointPersistenceBatch,
    flushPersistence,
    hydrate,
    endPersistenceBatch,
    clearAllData
  }
})

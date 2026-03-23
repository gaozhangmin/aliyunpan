import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { MediaLibraryItem, MediaLibraryFolder, MediaFilter, FavoriteId, PlaylistMap } from '../types/media'
import { getWebDavConnections } from '../utils/webdavClient'

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

export const useMediaLibraryStore = defineStore('mediaLibrary', () => {
  // 状态 - 从localStorage加载初始数据
  const mediaItems = ref<MediaLibraryItem[]>(loadFromStorage(STORAGE_KEYS.MEDIA_ITEMS, []))
  const folders = ref<MediaLibraryFolder[]>(normalizeFolders(loadFromStorage(STORAGE_KEYS.FOLDERS, [])))
  const isScanning = ref(false)
  const scanProgress = ref(0)
  const scanTotal = ref(0)
  const continueWatching = ref<MediaLibraryItem[]>(loadFromStorage(STORAGE_KEYS.CONTINUE_WATCHING, []))
  const recentlyAdded = ref<MediaLibraryItem[]>(loadFromStorage(STORAGE_KEYS.RECENTLY_ADDED, []))
  const favorites = ref<FavoriteId[]>(loadFromStorage(STORAGE_KEYS.FAVORITES, []))
  const playlists = ref<PlaylistMap>(loadFromStorage(STORAGE_KEYS.PLAYLISTS, {}))
  const watchedItems = ref<string[]>(loadFromStorage(STORAGE_KEYS.WATCHED, []))
  saveToStorage(STORAGE_KEYS.FOLDERS, folders.value)
  const genres = ref<string[]>([])
  const years = ref<number[]>([])

  // 监听数据变化并自动保存到localStorage
  watch(mediaItems, (newValue) => {
    saveToStorage(STORAGE_KEYS.MEDIA_ITEMS, newValue)
  }, { deep: true })

  watch(folders, (newValue) => {
    saveToStorage(STORAGE_KEYS.FOLDERS, newValue)
  }, { deep: true })

  watch(continueWatching, (newValue) => {
    saveToStorage(STORAGE_KEYS.CONTINUE_WATCHING, newValue)
  }, { deep: true })

  watch(recentlyAdded, (newValue) => {
    saveToStorage(STORAGE_KEYS.RECENTLY_ADDED, newValue)
  }, { deep: true })

  watch(favorites, (newValue) => {
    saveToStorage(STORAGE_KEYS.FAVORITES, newValue)
  }, { deep: true })

  watch(playlists, (newValue) => {
    saveToStorage(STORAGE_KEYS.PLAYLISTS, newValue)
  }, { deep: true })

  watch(watchedItems, (newValue) => {
    saveToStorage(STORAGE_KEYS.WATCHED, newValue)
  }, { deep: true })

  // 计算属性
  const movies = computed(() => mediaItems.value.filter(item => item.type === 'movie'))
  const tvShows = computed(() => mediaItems.value.filter(item => item.type === 'tv'))
  const unmatchedItems = computed(() => mediaItems.value.filter(item => item.type === 'unmatched'))
  
  const topRated = computed(() => 
    mediaItems.value
      .filter(item => item.rating && item.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20)
  )

  const ratingCategories = computed(() => {
    const categories = [
      { range: [1, 5.99], label: '1-5分', items: [] as MediaLibraryItem[] },
      { range: [6, 6.99], label: '6分', items: [] as MediaLibraryItem[] },
      { range: [7, 7.99], label: '7分', items: [] as MediaLibraryItem[] },
      { range: [8, 8.99], label: '8分', items: [] as MediaLibraryItem[] },
      { range: [9, 9.99], label: '9分', items: [] as MediaLibraryItem[] },
      { range: [10, 10], label: '10分', items: [] as MediaLibraryItem[] }
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

    return categories
      .filter(c => c.items.length > 0)
      .map(c => ({
        name: c.label,
        count: c.items.length,
        type: 'rating' as const,
        range: c.range,
        items: c.items
      }))
  })

  const yearGroups = computed(() => {
    const groups: { [key: string]: MediaLibraryItem[] } = {}

    mediaItems.value.forEach(item => {
      if (item.year) {
        const year = parseInt(item.year)
        const decade = Math.floor(year / 10) * 10
        const key = `${decade}s`
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
      }
    })

    return Object.entries(groups)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([year, items]) => ({
        name: year,
        count: items.length,
        type: 'year' as const,
        items
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
    const existingIndex = mediaItems.value.findIndex(i => i.id === item.id)
    if (existingIndex >= 0) {
      mediaItems.value[existingIndex] = item
    } else {
      mediaItems.value.unshift(item)
    }
    updateFilters()
  }

  // 添加电视剧合并方法
  const addOrMergeTvSeries = (newTvItem: MediaLibraryItem): boolean => {
    if (newTvItem.type !== 'tv') {
      addMediaItem(newTvItem)
      return true
    }

    // 查找是否已存在同名的电视剧
    const existingTvIndex = mediaItems.value.findIndex(item =>
      item.type === 'tv' &&
      item.tmdbId === newTvItem.tmdbId &&
      item.name === newTvItem.name
    )

    if (existingTvIndex >= 0) {
      // 找到现有的电视剧，合并季集信息
      console.log(`🔄 合并电视剧: ${newTvItem.name}`)
      const existingTv = mediaItems.value[existingTvIndex]

      // 合并seasons
      const mergedSeasons = [...(existingTv.seasons || [])]
      if (newTvItem.seasons && newTvItem.seasons.length > 0) {
        const newSeason = newTvItem.seasons[0]
        const existingSeasonIndex = mergedSeasons.findIndex(s => s.seasonNumber === newSeason.seasonNumber)

        if (existingSeasonIndex >= 0) {
          // 季已存在，更新episode count
          mergedSeasons[existingSeasonIndex] = {
            ...mergedSeasons[existingSeasonIndex],
            episodeCount: Math.max(
              mergedSeasons[existingSeasonIndex].episodeCount || 0,
              newSeason.episodeCount || 0
            )
          }
        } else {
          // 新季，直接添加
          console.log(`  📺 添加新季: 第${newSeason.seasonNumber}季`)
          mergedSeasons.push(newSeason)
        }
      }

      // 合并集数信息（从seasons中的episodes处理）
      const mergedSeasonsCopy = [...mergedSeasons]

      // 处理新项目中的集数信息
      if (newTvItem.seasons && newTvItem.seasons.length > 0) {
        newTvItem.seasons.forEach(newSeason => {
          const existingSeasonIndex = mergedSeasonsCopy.findIndex(s => s.seasonNumber === newSeason.seasonNumber)

          if (existingSeasonIndex >= 0 && newSeason.episodes && newSeason.episodes.length > 0) {
            // 季已存在，合并episodes
            const existingSeason = mergedSeasonsCopy[existingSeasonIndex]
            const mergedEpisodes = [...(existingSeason.episodes || [])]

            newSeason.episodes.forEach(newEpisode => {
              const existingEpisodeIndex = mergedEpisodes.findIndex(e =>
                e.seasonNumber === newEpisode.seasonNumber &&
                e.episodeNumber === newEpisode.episodeNumber
              )

              if (existingEpisodeIndex >= 0) {
                // 集已存在，合并driveFiles
                console.log(`  📹 合并集数: S${newEpisode.seasonNumber}E${newEpisode.episodeNumber}`)
                const existingEpisode = mergedEpisodes[existingEpisodeIndex]
                mergedEpisodes[existingEpisodeIndex] = {
                  ...existingEpisode,
                  driveFiles: [...existingEpisode.driveFiles, ...newEpisode.driveFiles]
                }
              } else {
                // 新集，直接添加
                console.log(`  ➕ 添加新集: S${newEpisode.seasonNumber}E${newEpisode.episodeNumber}`)
                mergedEpisodes.push(newEpisode)
              }
            })

            // 更新季的episodes
            mergedSeasonsCopy[existingSeasonIndex] = {
              ...existingSeason,
              episodes: mergedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
            }
          }
        })
      }

      // 合并driveFiles到主条目
      const mergedDriveFiles = [
        ...(existingTv.driveFiles || []),
        ...newTvItem.driveFiles
      ]

      // 更新现有条目
      const updatedTv: MediaLibraryItem = {
        ...existingTv,
        seasons: mergedSeasonsCopy.sort((a, b) => a.seasonNumber - b.seasonNumber),
        driveFiles: mergedDriveFiles,
        credits: existingTv.credits || newTvItem.credits,
        addedAt: new Date() // 更新添加时间
      }

      mediaItems.value[existingTvIndex] = updatedTv
      updateFilters()
      return true
    } else {
      // 新电视剧，直接添加
      console.log(`🆕 新增电视剧: ${newTvItem.name}`)
      addMediaItem(newTvItem)
      return true
    }
  }

  const removeMediaItem = (id: string) => {
    mediaItems.value = mediaItems.value.filter(item => item.id !== id)
    updateFilters()
  }

  const addFolder = (folder: MediaLibraryFolder) => {
    const existingIndex = folders.value.findIndex(f => f.id === folder.id)
    if (existingIndex >= 0) {
      folders.value[existingIndex] = folder
    } else {
      folders.value.push(folder)
    }
  }

  // 移除特定文件夹下的所有媒体项目
  const removeMediaItemsByFolder = (folderId: string) => {
    const originalCount = mediaItems.value.length
    mediaItems.value = mediaItems.value.filter(item => item.folderId !== folderId)
    const removedCount = originalCount - mediaItems.value.length
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

  const removeFolder = (id: string) => {
    // 删除文件夹
    folders.value = folders.value.filter(folder => folder.id !== id)

    // 删除该文件夹相关的所有媒体项目
    mediaItems.value = mediaItems.value.filter(item => item.folderId !== id)

    // 从继续观看列表中移除相关项目
    continueWatching.value = continueWatching.value.filter(item => item.folderId !== id)

    // 从最近添加列表中移除相关项目
    recentlyAdded.value = recentlyAdded.value.filter(item => item.folderId !== id)

    // 更新筛选器
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
    watchedItems.value = watchedItems.value.filter(item => !String(item).startsWith(prefix))
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
  }

  // 初始化时更新筛选器
  updateFilters()

  return {
    // 状态
    mediaItems,
    folders,
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
    addOrMergeTvSeries,
    removeMediaItem,
    removeMediaItemsByFolder,
    addFolder,
    removeFolder,
    getMediaItemsByFolder,
    getMediaItemsByFolderPath,
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
    clearAllData
  }
})

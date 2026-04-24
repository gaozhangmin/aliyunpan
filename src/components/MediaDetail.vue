<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAppStore, usePanTreeStore } from '../store'
import { useMediaLibraryStore } from '../store/medialibrary'
import type { MediaLibraryItem, MediaSeason, MediaEpisode, CastMember, CrewMember, DriveFileItem } from '../types/media'
import type { IAliGetFileModel } from '../aliapi/alimodels'
import type { IPageVideoPlaylistEntry } from '../store/appstore'
import { menuOpenFile } from '../utils/openfile'
import path from 'path'

// Props
const props = defineProps<{
  mediaItem: MediaLibraryItem
  activePlaylistName?: string
  playlistItems?: MediaLibraryItem[]
}>()

// Emits
const emit = defineEmits<{
  back: []
  tagClick: [tagType: string, tagValue: string]
}>()

const appStore = useAppStore()
const panTreeStore = usePanTreeStore()
const mediaStore = useMediaLibraryStore()

// 响应式状态
const selectedSeason = ref(props.mediaItem.type === 'tv' && props.mediaItem.seasons?.length ? props.mediaItem.seasons[0].seasonNumber : 1)
const selectedEpisode = ref<number>()
const hasUserSelectedEpisode = ref(false)
const isFavorited = computed(() => {
  if (typeof mediaStore.isFavorite !== 'function') return false
  if (props.mediaItem.type === 'tv') {
    return mediaStore.isFavorite(props.mediaItem.id)
  }
  return mediaStore.isFavorite(props.mediaItem.id)
})
const inPlaylist = computed(() => {
  if (!currentPlaylistItemId.value) return false
  return Object.values(mediaStore.playlists).some(list => list.includes(currentPlaylistItemId.value))
})
const watchedId = computed(() => currentPlaylistItemId.value || props.mediaItem.id)
const isWatched = computed(() => {
  if (typeof mediaStore.isWatched !== 'function') return false
  return mediaStore.isWatched(watchedId.value)
})
const showPlaylistModal = ref(false)
const showCreatePlaylist = ref(false)
const newPlaylistName = ref('')
const renameTarget = ref('')
const renameValue = ref('')
const actionButtonsRef = ref<HTMLElement | null>(null)
const playButtonWidth = ref<number | null>(null)

// 计算属性
const currentSeason = computed(() => {
  if (props.mediaItem.type !== 'tv' || !props.mediaItem.seasons) return null
  return props.mediaItem.seasons.find(s => s.seasonNumber === selectedSeason.value) || props.mediaItem.seasons[0]
})

const currentSeasonEpisodes = computed(() => {
  if (props.mediaItem.type !== 'tv' || !props.mediaItem.seasons) return []

  const currentSeason = props.mediaItem.seasons.find(s => s.seasonNumber === selectedSeason.value)

  // 临时测试：如果只有一集，创建更多集用于测试
  if (currentSeason?.episodes && currentSeason.episodes.length === 1) {
    const baseEpisode = currentSeason.episodes[0]
    const testEpisodes = []

    for (let i = 1; i <= 5; i++) {
      testEpisodes.push({
        ...baseEpisode,
        id: baseEpisode.id + i,
        episodeNumber: i,
        name: `Episode ${i}`
      })
    }

    return testEpisodes
  }

  return currentSeason?.episodes || []
})

const continueRecord = computed(() => {
  if (props.mediaItem.type !== 'tv') {
    return mediaStore.continueWatching.find(item => item.id === props.mediaItem.id)
  }
  const idValue = String(props.mediaItem.id)
  const parts = idValue.split('_')
  if (parts.length >= 3) {
    return mediaStore.continueWatching.find(item => item.id === idValue)
  }
  const seriesId = parts[0]
  return mediaStore.continueWatching.find(item => String(item.id).startsWith(`${seriesId}_`))
})

const findEpisodeByFileId = (fileId: string | undefined | null) => {
  if (!fileId || props.mediaItem.type !== 'tv') return undefined
  const seasons = props.mediaItem.seasons || []
  for (const season of seasons) {
    const episode = season.episodes?.find(ep => ep.driveFiles?.some(file => file.id === fileId))
    if (episode) return episode
  }
  return undefined
}

const parseContinueEpisodeId = (value: string | undefined) => {
  if (!value) return null
  const parts = String(value).split('_')
  if (parts.length < 3) return null
  const seasonNumber = parseInt(parts[parts.length - 2] || '', 10)
  const episodeNumber = parseInt(parts[parts.length - 1] || '', 10)
  if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) return null
  const tvId = parts.slice(0, -2).join('_')
  return { seasonNumber, episodeNumber, tvId }
}

const continueEpisode = computed(() => {
  if (props.mediaItem.type !== 'tv') return undefined
  const info = parseContinueEpisodeId(continueRecord.value?.id)
  if (info) {
    const season = props.mediaItem.seasons?.find(s => s.seasonNumber === info.seasonNumber)
    const episode = season?.episodes?.find(ep => ep.episodeNumber === info.episodeNumber)
    if (episode) return episode
  }
  return findEpisodeByFileId(continueRecord.value?.lastPlayedFileId)
})

watchEffect(() => {
  if (props.mediaItem.type !== 'tv') return
  if (hasUserSelectedEpisode.value) return
  const episode = continueEpisode.value
  if (episode) {
    selectedSeason.value = episode.seasonNumber
    selectedEpisode.value = episode.episodeNumber
  }
})

const availableSeasons = computed(() => {
  if (props.mediaItem.type !== 'tv' || !props.mediaItem.seasons) return []
  return props.mediaItem.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber)
})

const totalEpisodeCount = computed(() => {
  if (props.mediaItem.type !== 'tv' || !props.mediaItem.seasons) return 0
  return props.mediaItem.seasons.reduce((total, season) => {
    return total + (season.episodes?.length || 0)
  }, 0)
})

const currentFilePath = computed(() => {
  if (props.mediaItem.type === 'tv') {
    return currentEpisode.value?.driveFiles?.[0]?.path || ''
  }

  return props.mediaItem.driveFiles?.[0]?.path || ''
})

const currentFileName = computed(() => {
  if (props.mediaItem.type === 'tv') {
    return currentEpisode.value?.driveFiles?.[0]?.name || ''
  }
  return props.mediaItem.driveFiles?.[0]?.name || ''
})

const backgroundStyle = computed(() => {
  if (props.mediaItem.backdropUrl) {
    return {
      backgroundImage: `url(${props.mediaItem.backdropUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundRepeat: 'no-repeat'
    }
  }
  return {
    background: 'linear-gradient(180deg, #fbfbfc 0%, #f2f3f6 35%, #eef1f4 100%)'
  }
})

// 制作信息（可扩展）
const productionCompanies = computed(() => {
  return [] as { id: number; name: string }[]
})

const productionCountries = computed(() => {
  return (props.mediaItem.productionCountries || []).map((name) => ({
    iso31661: name,
    name
  }))
})

const currentEpisode = computed(() => {
  if (props.mediaItem.type !== 'tv') return null
  const selected = currentSeasonEpisodes.value.find(
    item => item.episodeNumber === selectedEpisode.value
  )
  return selected || currentSeasonEpisodes.value[0] || null
})

const castList = computed(() => {
  const item = props.mediaItem as MediaLibraryItem & {
    credits?: { cast?: CastMember[] }
    cast?: CastMember[]
  }
  const seasonCast = currentSeason.value?.credits?.cast
  const episodeCrew = currentEpisode.value?.crew || []

  let rawCast: Array<CastMember | (CrewMember & { character?: string })> = []
  if (episodeCrew.length > 0) {
    rawCast = episodeCrew.map((crew) => ({
      ...crew,
      character: crew.job || crew.department
    }))
  } else {
    rawCast = seasonCast || item.credits?.cast || item.cast || []
  }

  return rawCast.map((cast) => ({
    ...cast,
    profilePath: cast.profile_path || (cast as unknown as { profile_path?: string }).profile_path
  }))
})

const displayOverview = computed(() => {
  if (props.mediaItem.type === 'tv' && currentEpisode.value?.overview) {
    return currentEpisode.value.overview
  }
  return props.mediaItem.overview || ''
})

const currentEpisodeRecord = computed(() => {
  if (props.mediaItem.type !== 'tv') return null
  const episode = currentEpisode.value
  if (!episode) return null
  const parts = String(props.mediaItem.id).split('_')
  const seriesId = parts.length >= 3 ? parts.slice(0, -2).join('_') : parts[0]
  const episodeId = `${seriesId}_${episode.seasonNumber}_${episode.episodeNumber}`
  return mediaStore.continueWatching.find(item => item.id === episodeId) || null
})

const playProgressPercent = computed(() => {
  if (props.mediaItem.type === 'tv') {
    const episode = currentEpisode.value
    const progress = currentEpisodeRecord.value?.watchProgress ?? 0
    if (progress === undefined || progress === null) return null
    return Math.max(0, Math.min(100, Math.round(progress * 100)))
  }
  const record = continueRecord.value
  if (!record || record.watchProgress === undefined || record.watchProgress === null) return null
  return Math.max(0, Math.min(100, Math.round(record.watchProgress * 100)))
})

const playButtonLabel = computed(() => {
  if (props.mediaItem.type === 'tv') {
    if (playProgressPercent.value !== null) {
      return `已观看 ${playProgressPercent.value}%`
    }

    const current = currentEpisode.value
    if (current) return `播放第 ${current.episodeNumber} 集`
    return '播放第一集'
  }

  if (playProgressPercent.value !== null && playProgressPercent.value > 0) {
    return `已观看 ${playProgressPercent.value}%`
  }
  return '开始播放'
})

const playEpisodeInfo = computed(() => {
  if (props.mediaItem.type !== 'tv') return ''
  const episode = currentEpisode.value
  if (!episode) return ''
  const fileName = currentFileName.value || ''
  const title = `将播放：S${episode.seasonNumber}E${episode.episodeNumber} ${episode.name || ''}`.trim()
  return fileName ? `${title} · ${fileName}` : title
})

const currentPlaylistItemId = computed(() => {
  if (props.mediaItem.type === 'tv') {
    const episode = currentEpisode.value
    if (!episode) return ''
    const baseId = String(props.mediaItem.id).split('_').slice(0, -2).join('_') || props.mediaItem.id
    return `${baseId}_${episode.seasonNumber}_${episode.episodeNumber}`
  }
  return props.mediaItem.id
})

// 方法
const handleBackClick = () => {
  emit('back')
}

const handleTagClick = (tagType: string, tagValue: string) => {
  emit('tagClick', tagType, tagValue)
}

const handleSeasonChange = (seasonNumber: number) => {
  selectedSeason.value = seasonNumber
  selectedEpisode.value = undefined
  hasUserSelectedEpisode.value = true
}

const handleCastClick = (cast: CastMember) => {
  emit('tagClick', 'cast', cast.name)
}

const handleEpisodeSelect = (episode: MediaEpisode) => {
  selectedEpisode.value = episode.episodeNumber
  hasUserSelectedEpisode.value = true
  syncPlayButtonWidth()
}

const handleEpisodePlay = (episode: MediaEpisode) => {
  selectedEpisode.value = episode.episodeNumber
  hasUserSelectedEpisode.value = true
  playEpisode(episode)
  syncPlayButtonWidth()
}

const playMainContent = () => {
  if (props.mediaItem.type === 'tv') {
    // 电视剧播放第一集
    const episode = currentEpisode.value
    if (episode) {
      playEpisode(episode)
    }
  } else {
    // 电影播放主文件
    playMovie()
  }
}

const buildAliFileModel = (driveFile: DriveFileItem): IAliGetFileModel => {
  const ext = driveFile.name.split('.').pop() || ''
  const parentFileId = (driveFile.driveId || '').startsWith('webdav:')
    ? (path.posix.dirname(driveFile.id || '/') || '/')
    : 'root'
  return {
    __v_skip: true,
    drive_id: driveFile.driveId,
    file_id: driveFile.id,
    parent_file_id: parentFileId,
    name: driveFile.name,
    namesearch: driveFile.name.toLowerCase(),
    ext,
    mime_type: '',
    mime_extension: '',
    category: 'video',
    icon: 'iconfile_video',
    size: driveFile.fileSize || 0,
    sizeStr: '',
    time: 0,
    timeStr: '',
    starred: false,
    isDir: false,
    thumbnail: driveFile.thumbnailLink || '',
    description: driveFile.contentHash || '',
    media_width: driveFile.height,
    media_height: driveFile.height,
    media_duration: driveFile.videoDuration,
    media_play_cursor: '',
    media_time: '',
    user_meta: ''
  }
}

const buildPlaylistEntry = (aliFile: IAliGetFileModel, title: string): IPageVideoPlaylistEntry => ({
  user_id: (aliFile as any).user_id || '',
  drive_id: aliFile.drive_id,
  file_id: aliFile.file_id,
  parent_file_id: aliFile.parent_file_id,
  file_name: aliFile.name,
  html: title,
  ext: aliFile.ext,
  description: aliFile.description,
  play_cursor: aliFile.media_play_cursor ? parseInt(aliFile.media_play_cursor, 10) || 0 : 0,
  encType: aliFile.description || ''
})

const resolvePlaylistEpisodeForItem = (item: MediaLibraryItem) => {
  if (item.id === props.mediaItem.id && currentEpisode.value) return currentEpisode.value
  const seasons = item.seasons || []
  for (const season of seasons) {
    const episode = season.episodes?.find((candidate) => candidate.driveFiles?.length)
    if (episode) return episode
  }
  return undefined
}

const resolvePlaylistPlayableEntry = (item: MediaLibraryItem): IPageVideoPlaylistEntry | null => {
  if (item.type === 'tv') {
    const episode = resolvePlaylistEpisodeForItem(item)
    const driveFile = episode?.driveFiles?.[0]
    if (!episode || !driveFile) return null
    const aliFile = buildAliFileModel(driveFile)
    return buildPlaylistEntry(aliFile, `${item.name} · S${episode.seasonNumber}E${episode.episodeNumber} ${episode.name}`.trim())
  }

  const driveFile = item.driveFiles?.[0]
  if (!driveFile) return null
  const aliFile = buildAliFileModel(driveFile)
  return buildPlaylistEntry(aliFile, item.name)
}

const currentPlaylistEntries = computed<IPageVideoPlaylistEntry[]>(() => {
  if (!props.activePlaylistName || !props.playlistItems?.length) return []
  return props.playlistItems
    .map((item) => resolvePlaylistPlayableEntry(item))
    .filter((item): item is IPageVideoPlaylistEntry => !!item)
})

const playEpisode = (episode: MediaEpisode) => {
  if (episode.driveFiles && episode.driveFiles.length > 0) {
    const driveFile = episode.driveFiles[0]
    const aliFile = buildAliFileModel(driveFile)
    menuOpenFile(aliFile, '', {
      customPlaylistLabel: props.activePlaylistName || '',
      customPlaylist: currentPlaylistEntries.value
    })
  }
}

const playMovie = () => {
  if (props.mediaItem.driveFiles && props.mediaItem.driveFiles.length > 0) {
    const driveFile = props.mediaItem.driveFiles[0]
    const aliFile = buildAliFileModel(driveFile)
    menuOpenFile(aliFile, '', {
      customPlaylistLabel: props.activePlaylistName || '',
      customPlaylist: currentPlaylistEntries.value
    })
  }
}

const getFavoriteMode = () => {
  if (props.mediaItem.type !== 'tv') return null
  const episode = currentEpisode.value
  if (!episode) return null
  const seriesId = props.mediaItem.id
  const seasonId = `${props.mediaItem.id}_${episode.seasonNumber}`
  const episodeId = `${props.mediaItem.id}_${episode.seasonNumber}_${episode.episodeNumber}`
  if (mediaStore.isFavorite(seriesId)) return 'series'
  if (mediaStore.isFavorite(seasonId)) return 'season'
  if (mediaStore.isFavorite(episodeId)) return 'episode'
  return null
}

const toggleFavorite = () => {
  if (typeof mediaStore.toggleFavorite !== 'function') return
  mediaStore.toggleFavorite(props.mediaItem.id)
}

const togglePlaylist = () => {
  showPlaylistModal.value = true
}

const handleCreatePlaylist = () => {
  if (!newPlaylistName.value.trim()) return
  mediaStore.addPlaylist(newPlaylistName.value)
  newPlaylistName.value = ''
  showCreatePlaylist.value = false
}

const handleStartRename = (name: string) => {
  renameTarget.value = name
  renameValue.value = name
}

const handleRenamePlaylist = () => {
  if (!renameTarget.value) return
  mediaStore.renamePlaylist(renameTarget.value, renameValue.value)
  renameTarget.value = ''
  renameValue.value = ''
}

const handleTogglePlaylistItem = (playlistName: string) => {
  if (!currentPlaylistItemId.value) return
  mediaStore.togglePlaylistItem(playlistName, currentPlaylistItemId.value)
}

const handleRemovePlaylist = (playlistName: string) => {
  mediaStore.removePlaylist(playlistName)
}

const syncPlayButtonWidth = async () => {
  await nextTick()
  if (actionButtonsRef.value) {
    playButtonWidth.value = actionButtonsRef.value.offsetWidth
  }
}

onMounted(() => {
  syncPlayButtonWidth()
  window.addEventListener('resize', syncPlayButtonWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncPlayButtonWidth)
})

const toggleWatched = () => {
  if (typeof mediaStore.markWatched !== 'function') return
  mediaStore.markWatched(watchedId.value, !isWatched.value)
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder') as HTMLElement
  if (placeholder) {
    placeholder.style.display = 'flex'
  }
}

const getCastAvatarUrl = (path?: string): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `https://tmdb-673444103572.asia-east2.run.app/image/t/p/original/${path}`
}

const getCastInitial = (name?: string): string => {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}
</script>

<template>
  <div class="media-detail">
    <!-- 返回按钮 -->
    <div class="detail-header">
      <button class="detail-back" @click="handleBackClick" :title="mediaItem.name">
        <i class="iconfont iconarrow-left-2-icon"></i>
        <span class="detail-back-title">{{ mediaItem.name }}</span>
      </button>
    </div>

    <!-- 内容滚动区域 -->
    <div class="detail-content">
      <!-- Hero区域 -->
      <div class="hero-section" :style="backgroundStyle">
        <div class="hero-content">
          <div class="hero-poster">
            <img v-if="mediaItem.posterUrl" :src="mediaItem.posterUrl" :alt="mediaItem.name" />
            <div v-else class="poster-placeholder">
              <i class="iconfont iconfile-video"></i>
            </div>
          </div>

          <div class="hero-info">
            <h1 class="hero-title">{{ mediaItem.name }}</h1>

            <div class="hero-meta">
              <span v-if="mediaItem.rating" class="meta-rating">
                ★ {{ mediaItem.rating.toFixed(1) }}
              </span>
              <span v-if="mediaItem.genres.length" class="meta-genres">
                {{ mediaItem.genres.slice(0, 3).join(' · ') }}
              </span>
              <span v-if="mediaItem.type === 'tv' && totalEpisodeCount" class="meta-episodes">
                共 {{ totalEpisodeCount }} 集
              </span>
            </div>

            <div class="hero-meta-secondary">
              <span v-if="mediaItem.year">{{ mediaItem.year }}</span>
              <span>24分钟</span>
              <span>1080P</span>
              <span>SDR</span>
            </div>

            <p v-if="displayOverview" class="hero-overview" :title="displayOverview">
              {{ displayOverview }}
            </p>

            <div class="hero-actions">
              <div class="actions-stack">
                <div v-if="playEpisodeInfo" class="play-episode-info">{{ playEpisodeInfo }}</div>
                <div ref="actionButtonsRef" class="action-buttons">
                  <button
                    type="button"
                    class="action-button"
                    :class="{ active: isWatched }"
                    :title="isWatched ? '标记为未观看' : '标记为已观看'"
                    @click="toggleWatched"
                  >
                    <span class="action-glyph">✓</span>
                  </button>
                  <button
                    type="button"
                    class="action-button"
                    :class="{ active: isFavorited }"
                    :title="isFavorited ? '取消收藏' : '收藏'"
                    @click="toggleFavorite"
                  >
                    <span class="action-glyph">{{ isFavorited ? '♥' : '♡' }}</span>
                  </button>
                  <button
                    type="button"
                    class="action-button"
                    :class="{ active: inPlaylist }"
                    title="添加到播放列表"
                    @click.stop.prevent="togglePlaylist"
                  >
                    <span class="action-glyph">⋯</span>
                  </button>
                </div>
                <button
                  type="button"
                  class="play-button"
                  @click="playMainContent"
                >
                  <span
                    v-if="playProgressPercent !== null"
                    class="play-button-progress"
                    :style="{ width: `${playProgressPercent}%` }"
                  ></span>
                  <span class="play-button-label">
                    <span class="play-glyph">▶</span>
                    {{ playButtonLabel }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 季选择器（仅电视剧显示） -->
      <div v-if="mediaItem.type === 'tv' && availableSeasons.length > 1" class="season-selector">
        <div class="section-header">
          <h3>第 {{ selectedSeason }} 季</h3>
          <span class="more-link">更多</span>
        </div>
        <div class="season-tabs">
          <a-button
            v-for="season in availableSeasons"
            :key="season.seasonNumber"
            :type="selectedSeason === season.seasonNumber ? 'primary' : 'secondary'"
            @click="handleSeasonChange(season.seasonNumber)"
          >
            第 {{ season.seasonNumber }} 季
          </a-button>
        </div>
      </div>

      <!-- 集列表（仅电视剧显示） -->
      <div v-if="mediaItem.type === 'tv' && currentSeasonEpisodes.length > 0" class="episodes-section">
        <div class="section-header">
          <h3>{{ currentSeason?.name || `第 ${selectedSeason} 季` }}</h3>
          <span class="episode-count">{{ currentSeasonEpisodes.length }} 集</span>
        </div>

        <div class="episodes-grid">
          <div
            v-for="episode in currentSeasonEpisodes"
            :key="episode.id"
            class="episode-card"
            :class="{ active: selectedEpisode === episode.episodeNumber }"
          >
            <div class="episode-thumbnail">
              <img
                v-if="episode.stillPath || props.mediaItem.posterUrl"
                :src="episode.stillPath ||  props.mediaItem.posterUrl"
                :alt="`第 ${episode.episodeNumber} 集 ${episode.name}`"
                class="episode-image"
                @error="handleImageError"
                @click="handleEpisodePlay(episode)"
              />
              <div v-else class="thumbnail-placeholder">
                <span class="episode-number">{{ episode.episodeNumber }}</span>
              </div>
              <div v-if="episode.stillPath || props.mediaItem.posterUrl" class="thumbnail-placeholder" style="display: none;">
                <span class="episode-number">{{ episode.episodeNumber }}</span>
              </div>
              <div class="episode-play-overlay">
                <i class="iconfont iconstart"></i>
              </div>
            </div>

            <div class="episode-info" @click="handleEpisodeSelect(episode)">
              <div class="episode-title">
                E{{ episode.episodeNumber }} · {{ episode.name }}
              </div>
              <p class="episode-name">{{ episode.overview || '' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 演员列表 -->
      <div v-if="castList.length" class="cast-section">
        <div class="section-header">
          <h3>演员</h3>
          <span class="cast-count">{{ castList.length }} 位</span>
        </div>

        <div class="cast-list">
          <div v-for="cast in castList" :key="cast.id" class="cast-card" @click="handleCastClick(cast)">
            <div class="cast-avatar">
              <img
                v-if="cast.profile_path"
                :src="getCastAvatarUrl(cast.profile_path)"
                :alt="cast.name"
                class="cast-avatar-image"
              />
              <div v-else class="cast-avatar-placeholder">
                {{ getCastInitial(cast.name) }}
              </div>
            </div>
            <div class="cast-info">
              <div class="cast-name">{{ cast.name }}</div>
              <div v-if="cast.character" class="cast-role">饰 {{ cast.character }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签区域 -->
      <div class="tags-section">
        <!-- 类型标签 -->
        <div v-if="mediaItem.genres && mediaItem.genres.length" class="tag-group">
          <h4 class="tag-group-title">类型</h4>
          <div class="tag-list">
            <span
              v-for="genre in mediaItem.genres"
              :key="genre"
              class="tag-item clickable"
              @click="handleTagClick('genre', genre)"
            >
              {{ genre }}
            </span>
          </div>
        </div>

        <!-- 工作室标签 -->
        <div v-if="productionCompanies.length" class="tag-group">
          <h4 class="tag-group-title">工作室</h4>
          <div class="tag-list">
            <span
              v-for="company in productionCompanies"
              :key="company.id"
              class="tag-item clickable"
              @click="handleTagClick('studio', company.name)"
            >
              {{ company.name }}
            </span>
          </div>
        </div>

        <!-- 制作年份标签 -->
        <div v-if="mediaItem.year" class="tag-group">
          <h4 class="tag-group-title">制作年份</h4>
          <div class="tag-list">
            <span
              class="tag-item clickable"
              @click="handleTagClick('year', mediaItem.year)"
            >
              {{ mediaItem.year }}s
            </span>
          </div>
        </div>

        <!-- 地区标签 -->
        <div v-if="productionCountries.length" class="tag-group">
          <h4 class="tag-group-title">地区</h4>
          <div class="tag-list">
            <span
              v-for="country in productionCountries"
              :key="country.iso31661"
              class="tag-item clickable"
              @click="handleTagClick('country', country.name)"
            >
              {{ country.name }}
            </span>
          </div>
        </div>

        <!-- 详细信息卡片 -->
        <div class="tag-group">
          <h4 class="tag-group-title">详细信息</h4>
          <div class="details-card">
            <div v-if="mediaItem.year" class="detail-row">
              <span class="detail-label">年份</span>
              <span class="detail-value">{{ mediaItem.year }}</span>
            </div>

            <div v-if="mediaItem.rating" class="detail-row">
              <span class="detail-label">评分</span>
              <span class="detail-value">{{ mediaItem.rating.toFixed(1) }}/10</span>
            </div>

            <div v-if="mediaItem.driveFiles?.length" class="detail-row">
              <span class="detail-label">文件</span>
              <span class="detail-value">{{ mediaItem.driveFiles.length }} 个文件</span>
            </div>

            <div v-if="mediaItem.addedAt" class="detail-row">
              <span class="detail-label">添加时间</span>
              <span class="detail-value">{{ new Date(mediaItem.addedAt).toLocaleDateString() }}</span>
            </div>

            <div v-if="currentFilePath" class="detail-row" :title="currentFilePath">
              <span class="detail-label">文件路径</span>
              <span class="detail-value detail-path">{{ currentFilePath }}</span>
            </div>
          </div>
        </div>

        <!-- 国家标签 -->
      </div>
    </div>

    <!-- 播放列表 -->
    <a-modal v-model:visible="showPlaylistModal" title="添加到播放列表" :footer="false" :z-index="3000" class="playlist-modal">
      <div class="playlist-modal-header">
        <div class="playlist-title">选择播放列表</div>
        <div class="playlist-subtitle">勾选后立即添加或移除当前条目</div>
      </div>

      <div class="playlist-create">
        <a-input v-model="newPlaylistName" placeholder="新建播放列表名称" />
        <a-button type="primary" @click="handleCreatePlaylist">创建</a-button>
      </div>

      <div v-if="renameTarget" class="playlist-create">
        <a-input v-model="renameValue" placeholder="新的播放列表名称" />
        <a-button type="primary" @click="handleRenamePlaylist">保存</a-button>
        <a-button @click="renameTarget = ''">取消</a-button>
      </div>

      <div class="playlist-list">
        <div v-for="(itemIds, name) in mediaStore.playlists" :key="name" class="playlist-row">
          <a-checkbox
            class="playlist-checkbox"
            :model-value="mediaStore.isInPlaylist(name, currentPlaylistItemId)"
            @change="() => handleTogglePlaylistItem(name)"
          >
            <span class="playlist-name">{{ name }}</span>
            <span class="playlist-count">{{ itemIds.length }} 项</span>
          </a-checkbox>
          <div class="playlist-actions">
            <a-button type="text" size="mini" @click="handleStartRename(name)">
              重命名
            </a-button>
            <a-button type="text" status="danger" size="mini" @click="handleRemovePlaylist(name)">
              删除
            </a-button>
          </div>
        </div>
        <div v-if="Object.keys(mediaStore.playlists).length === 0" class="playlist-empty">
          暂无播放列表，请先创建一个
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.media-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 0%, rgba(223, 188, 152, 0.34) 0%, rgba(223, 188, 152, 0) 34%),
    radial-gradient(circle at 82% 0%, rgba(164, 191, 222, 0.36) 0%, rgba(164, 191, 222, 0) 36%),
    linear-gradient(180deg, rgba(244, 237, 229, 0.3) 0%, rgba(236, 241, 246, 0.34) 34%, rgba(233, 238, 243, 0.48) 60%, rgba(231, 236, 241, 0.62) 100%);
  backdrop-filter: blur(18px) saturate(128%);
  -webkit-backdrop-filter: blur(18px) saturate(128%);
  color: #1d2433;
}

.detail-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 40px;
}

.detail-back {
  height: 46px;
  padding: 0 18px;
  max-width: min(420px, calc(100vw - 80px));
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.36);
  box-shadow: 0 10px 30px rgba(130, 137, 152, 0.18);
  backdrop-filter: blur(26px) saturate(165%);
  -webkit-backdrop-filter: blur(26px) saturate(165%);
  color: #253045;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.detail-back i {
  font-size: 16px;
  flex-shrink: 0;
}

.detail-back-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-back:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 36px rgba(130, 137, 152, 0.22);
  background: rgba(255, 255, 255, 0.46);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: transparent;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 154, 168, 0.4) transparent;
}

.detail-content::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 520px;
  bottom: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 0%, rgba(223, 188, 152, 0.3) 0%, rgba(223, 188, 152, 0) 30%),
    radial-gradient(circle at 78% 0%, rgba(164, 191, 222, 0.34) 0%, rgba(164, 191, 222, 0) 34%),
    linear-gradient(180deg, rgba(244, 238, 231, 0.12) 0%, rgba(236, 241, 246, 0.22) 24%, rgba(233, 238, 243, 0.34) 54%, rgba(232, 236, 241, 0.48) 100%);
  filter: blur(30px);
  z-index: 0;
}

.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-thumb {
  background: rgba(147, 154, 168, 0.4);
  border-radius: 999px;
}

.hero-section {
  position: relative;
  min-height: 940px;
  padding: 210px 0 34px;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 16, 28, 0.14) 0%, rgba(16, 22, 34, 0.08) 22%, rgba(255, 255, 255, 0.14) 54%, rgba(245, 247, 249, 0.42) 78%, rgba(244, 246, 249, 0.72) 100%),
    radial-gradient(circle at 36% 56%, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 26%),
    radial-gradient(circle at 32% 74%, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0) 34%),
    radial-gradient(circle at 54% 88%, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 34%);
  pointer-events: none;
}

.hero-section::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -60px;
  height: 320px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(243, 245, 248, 0.24) 36%, rgba(238, 242, 246, 0.66) 100%),
    radial-gradient(circle at 24% 18%, rgba(223, 188, 152, 0.34) 0%, rgba(223, 188, 152, 0) 30%),
    radial-gradient(circle at 76% 8%, rgba(164, 191, 222, 0.36) 0%, rgba(164, 191, 222, 0) 36%);
  filter: blur(56px);
  pointer-events: none;
}

.hero-content {
  position: absolute;
  z-index: 1;
  width: min(1880px, calc(100% - 80px));
  left: 50%;
  bottom: 78px;
  transform: translateX(-50%);
  margin: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 30px;
  align-items: end;
}

.hero-poster {
  width: 280px;
  aspect-ratio: 2 / 3;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 26px 64px rgba(34, 43, 58, 0.18);
  background: rgba(18, 24, 36, 0.08);
}

.hero-poster img,
.poster-placeholder {
  width: 100%;
  height: 100%;
}

.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(232, 235, 240, 0.92) 100%);
  color: rgba(77, 87, 104, 0.7);
}

.poster-placeholder .iconfont {
  font-size: 60px;
}

.hero-info {
  min-height: 470px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
  color: #1b2232;
  max-width: 1040px;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hero-title {
  margin: 0;
  font-size: clamp(34px, 4.2vw, 62px);
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: rgba(10, 15, 24, 0.98);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.16);
}

.hero-meta,
.hero-meta-secondary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(18, 24, 35, 0.9);
}

.hero-meta {
  font-size: 16px;
  font-weight: 700;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.12);
}

.meta-rating {
  color: #0f172a;
}

.meta-divider {
  color: rgba(15, 23, 42, 0.35);
}

.hero-meta-secondary {
  font-size: 16px;
  font-weight: 800;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.12);
}

.hero-meta-secondary span + span::before {
  content: '·';
  margin-right: 8px;
  color: rgba(15, 23, 42, 0.35);
}

.hero-overview {
  max-width: 980px;
  margin: 0;
  font-size: 15px;
  line-height: 1.72;
  color: rgba(12, 18, 28, 0.9);
  font-weight: 600;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.14);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-actions {
  margin-top: 8px;
  width: 340px;
  min-width: 340px;
  max-width: 100%;
}

.actions-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.play-episode-info {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(15, 23, 42, 0.72);
  font-weight: 600;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.14);
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.action-button,
.play-button {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(250, 245, 240, 0.52);
  box-shadow: 0 12px 30px rgba(63, 46, 37, 0.1);
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.action-button {
  height: 62px;
  padding: 0;
  border-radius: 18px;
  color: rgba(22, 22, 22, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-button.active {
  background: rgba(240, 235, 230, 0.74);
}

.action-glyph {
  font-size: 22px;
  line-height: 1;
  font-weight: 800;
}

.play-button {
  width: 100%;
  min-width: 0;
  height: 62px;
  padding: 0 28px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.96), rgba(59, 130, 246, 0.88));
  border-color: rgba(96, 165, 250, 0.38);
  box-shadow: 0 22px 42px rgba(24, 70, 166, 0.32);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.play-button:hover {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.98), rgba(96, 165, 250, 0.9));
  border-color: rgba(147, 197, 253, 0.48);
  box-shadow: 0 26px 52px rgba(24, 70, 166, 0.42);
}

.play-button-progress {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(15, 47, 99, 0.96) 0%, rgba(49, 95, 158, 0.9) 100%);
}

.play-button-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.play-glyph {
  font-size: 15px;
  line-height: 1;
}

.season-selector,
.episodes-section,
.cast-section,
.tags-section {
  width: min(1880px, calc(100% - 80px));
  margin: 0 auto;
  padding: 0 0 32px;
  position: relative;
  z-index: 1;
  background: transparent;
}

.season-selector,
.episodes-section,
.cast-section {
  margin-top: 12px;
}

.tags-section {
  margin-top: 12px;
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3,
.tag-group-title {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 800;
  color: rgba(20, 28, 40, 0.96);
  letter-spacing: -0.02em;
}

.section-header h3 {
  margin-bottom: 0;
}

.section-header .more-link,
.episode-count,
.cast-count {
  font-size: 14px;
  color: rgba(94, 103, 119, 0.78);
}

.season-tabs {
  display: none;
}

.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.episode-card {
  border-radius: 28px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 12px 34px rgba(159, 168, 181, 0.16);
  backdrop-filter: blur(24px) saturate(155%);
  -webkit-backdrop-filter: blur(24px) saturate(155%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.episode-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(159, 168, 181, 0.22);
}

.episode-card.active {
  border-color: rgba(35, 46, 63, 0.16);
  box-shadow: 0 20px 48px rgba(123, 132, 145, 0.24);
}

.episode-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(229, 232, 238, 0.9);
}

.episode-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.episode-card:hover .episode-image {
  transform: scale(1.03);
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(250, 250, 251, 0.9) 0%, rgba(233, 236, 241, 0.95) 100%);
}

.episode-number {
  font-size: 20px;
  font-weight: 800;
  color: rgba(88, 98, 116, 0.92);
}

.episode-play-overlay {
  position: absolute;
  inset: auto auto 14px 14px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 26px rgba(89, 96, 110, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.94;
}

.episode-play-overlay .iconfont {
  font-size: 18px;
  color: #162131;
}

.episode-info {
  padding: 14px 8px 6px;
}

.episode-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: rgba(23, 31, 45, 0.96);
}

.episode-name {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(94, 103, 119, 0.88);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cast-list {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.cast-card {
  flex: 0 0 156px;
  padding: 18px 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 12px 34px rgba(159, 168, 181, 0.15);
  backdrop-filter: blur(24px) saturate(155%);
  -webkit-backdrop-filter: blur(24px) saturate(155%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cast-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(159, 168, 181, 0.22);
}

.cast-avatar {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(232, 235, 241, 0.94);
}

.cast-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cast-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(87, 97, 114, 0.9);
  font-size: 30px;
  font-weight: 800;
}

.cast-info {
  width: 100%;
  text-align: center;
}

.cast-name {
  font-size: 15px;
  font-weight: 700;
  color: rgba(23, 31, 45, 0.96);
}

.cast-role {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(102, 111, 127, 0.88);
}

.tag-group {
  margin-bottom: 26px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 18px;
  background: rgba(250, 245, 240, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 30px rgba(63, 46, 37, 0.1);
  color: rgba(17, 24, 39, 0.94);
  font-size: 15px;
  font-weight: 700;
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.tag-item.clickable {
  cursor: pointer;
}

.tag-item.clickable:hover {
  transform: translateY(-1px);
  background: rgba(255, 250, 245, 0.68);
  box-shadow: 0 14px 30px rgba(63, 46, 37, 0.14);
}

.details-card {
  width: min(720px, 100%);
  padding: 20px 22px;
  border-radius: 28px;
  background: rgba(250, 245, 240, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 36px rgba(63, 46, 37, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.detail-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  font-weight: 700;
  color: rgba(40, 40, 40, 0.9);
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: rgba(79, 79, 79, 0.92);
  min-width: 0;
}

.detail-path {
  white-space: normal;
  word-break: break-all;
  font-size: 14px;
  line-height: 1.7;
}

.playlist-modal :deep(.arco-modal) {
  width: 620px;
  max-width: calc(100vw - 40px);
}

.playlist-modal :deep(.arco-modal-content) {
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(30px) saturate(170%);
  -webkit-backdrop-filter: blur(30px) saturate(170%);
}

.playlist-modal-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.playlist-title {
  font-size: 18px;
  font-weight: 800;
  color: rgba(20, 28, 40, 0.96);
}

.playlist-subtitle {
  font-size: 13px;
  color: rgba(94, 103, 119, 0.82);
}

.playlist-create {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-bottom: 16px;
}

.playlist-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.playlist-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(247, 248, 250, 0.92);
}

.playlist-count,
.playlist-empty {
  color: rgba(94, 103, 119, 0.82);
}

[arco-theme='dark'] .media-detail {
  background:
    radial-gradient(circle at 18% 0%, rgba(72, 88, 108, 0.2) 0%, rgba(72, 88, 108, 0) 34%),
    radial-gradient(circle at 82% 0%, rgba(42, 73, 116, 0.18) 0%, rgba(42, 73, 116, 0) 36%),
    linear-gradient(180deg, #0f141c 0%, #0b1017 100%);
  color: rgba(233, 239, 247, 0.92);
}

[arco-theme='dark'] .detail-back {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(233, 239, 247, 0.92);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
}

[arco-theme='dark'] .detail-back:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.34);
}

[arco-theme='dark'] .detail-content {
  scrollbar-color: rgba(128, 144, 166, 0.42) transparent;
}

[arco-theme='dark'] .detail-content::before {
  background:
    radial-gradient(circle at 16% 0%, rgba(72, 88, 108, 0.2) 0%, rgba(72, 88, 108, 0) 32%),
    radial-gradient(circle at 78% 0%, rgba(42, 73, 116, 0.18) 0%, rgba(42, 73, 116, 0) 34%),
    linear-gradient(180deg, rgba(18, 25, 34, 0.08) 0%, rgba(18, 25, 34, 0.18) 42%, rgba(10, 14, 20, 0.76) 100%);
}

[arco-theme='dark'] .detail-content::-webkit-scrollbar-thumb {
  background: rgba(128, 144, 166, 0.42);
}

[arco-theme='dark'] .hero-section::before {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(8, 12, 18, 0.2) 34%, rgba(10, 14, 20, 0.52) 70%, rgba(10, 14, 20, 0.9) 100%),
    radial-gradient(circle at 36% 56%, rgba(90, 112, 142, 0.14) 0%, rgba(90, 112, 142, 0) 26%),
    radial-gradient(circle at 32% 74%, rgba(56, 68, 86, 0.22) 0%, rgba(56, 68, 86, 0) 34%);
}

[arco-theme='dark'] .hero-section::after {
  background:
    linear-gradient(180deg, rgba(10, 14, 20, 0.02) 0%, rgba(10, 14, 20, 0.28) 38%, rgba(10, 14, 20, 0.92) 100%),
    radial-gradient(circle at 24% 18%, rgba(72, 88, 108, 0.28) 0%, rgba(72, 88, 108, 0) 30%),
    radial-gradient(circle at 76% 8%, rgba(42, 73, 116, 0.24) 0%, rgba(42, 73, 116, 0) 36%);
}

[arco-theme='dark'] .hero-poster,
[arco-theme='dark'] .episode-thumbnail,
[arco-theme='dark'] .cast-avatar {
  background: rgba(18, 24, 36, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
}

[arco-theme='dark'] .poster-placeholder,
[arco-theme='dark'] .thumbnail-placeholder {
  background: linear-gradient(180deg, rgba(28, 32, 42, 0.96), rgba(20, 24, 33, 0.94));
  color: rgba(191, 201, 216, 0.68);
}

[arco-theme='dark'] .hero-title,
[arco-theme='dark'] .section-header h3,
[arco-theme='dark'] .tag-group-title,
[arco-theme='dark'] .episode-title,
[arco-theme='dark'] .cast-name,
[arco-theme='dark'] .playlist-title {
  color: rgba(244, 247, 252, 0.96);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.32);
}

[arco-theme='dark'] .hero-meta,
[arco-theme='dark'] .hero-meta-secondary,
[arco-theme='dark'] .meta-rating,
[arco-theme='dark'] .play-episode-info,
[arco-theme='dark'] .section-header .more-link,
[arco-theme='dark'] .episode-count,
[arco-theme='dark'] .cast-count,
[arco-theme='dark'] .episode-name,
[arco-theme='dark'] .cast-role,
[arco-theme='dark'] .playlist-subtitle,
[arco-theme='dark'] .playlist-count,
[arco-theme='dark'] .playlist-empty {
  color: rgba(191, 201, 216, 0.78);
  text-shadow: none;
}

[arco-theme='dark'] .hero-overview {
  color: rgba(230, 236, 244, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
}

[arco-theme='dark'] .hero-meta-secondary span + span::before,
[arco-theme='dark'] .meta-divider {
  color: rgba(191, 201, 216, 0.38);
}

[arco-theme='dark'] .action-button,
[arco-theme='dark'] .episode-card,
[arco-theme='dark'] .cast-card,
[arco-theme='dark'] .tag-item,
[arco-theme='dark'] .details-card {
  background: linear-gradient(180deg, rgba(28, 32, 42, 0.96), rgba(20, 24, 33, 0.94));
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
}

[arco-theme='dark'] .action-button,
[arco-theme='dark'] .tag-item {
  color: rgba(233, 239, 247, 0.92);
}

[arco-theme='dark'] .action-button.active,
[arco-theme='dark'] .episode-card.active {
  border-color: rgba(96, 165, 250, 0.34);
  background: linear-gradient(180deg, rgba(34, 56, 92, 0.95), rgba(28, 45, 76, 0.92));
  box-shadow: 0 22px 42px rgba(24, 70, 166, 0.28);
}

[arco-theme='dark'] .tag-item.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.3);
}

[arco-theme='dark'] .episode-play-overlay {
  background: rgba(18, 22, 30, 0.84);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.32);
}

[arco-theme='dark'] .episode-play-overlay .iconfont,
[arco-theme='dark'] .episode-number,
[arco-theme='dark'] .cast-avatar-placeholder {
  color: rgba(233, 239, 247, 0.9);
}

[arco-theme='dark'] .detail-row {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

[arco-theme='dark'] .detail-label {
  color: rgba(191, 201, 216, 0.78);
}

[arco-theme='dark'] .detail-value,
[arco-theme='dark'] .detail-path {
  color: rgba(233, 239, 247, 0.9);
}

[arco-theme='dark'] .playlist-modal :deep(.arco-modal-content) {
  background: rgba(18, 22, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.4);
}

[arco-theme='dark'] .playlist-row {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(233, 239, 247, 0.92);
}

[arco-theme='dark'] .playlist-modal :deep(.arco-input-wrapper),
[arco-theme='dark'] .playlist-modal :deep(.arco-btn) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(233, 239, 247, 0.92);
}

@media (max-width: 1180px) {
  .hero-section {
    min-height: 700px;
    padding-top: 144px;
  }

  .hero-content {
    margin-top: 56px;
    grid-template-columns: 1fr;
    align-items: start;
  }

  .hero-poster {
    width: 240px;
  }

  .hero-info {
    min-height: auto;
    max-width: none;
  }
}

@media (max-width: 768px) {
  .detail-header {
    padding: 16px 20px;
  }

  .hero-section,
  .season-selector,
  .episodes-section,
  .cast-section,
  .tags-section {
    width: calc(100% - 32px);
  }

  .hero-section {
    min-height: auto;
    padding-top: 120px;
    padding-bottom: 8px;
  }

  .hero-content {
    margin-top: 36px;
    width: 100%;
  }

  .hero-poster {
    width: 200px;
  }

  .hero-title {
    font-size: 34px;
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .episodes-grid {
    grid-template-columns: 1fr;
  }

  .details-card {
    width: 100%;
    min-height: auto;
  }
}
</style>

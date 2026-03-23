<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAppStore, usePanTreeStore } from '../store'
import { useMediaLibraryStore } from '../store/medialibrary'
import type { MediaLibraryItem, MediaSeason, MediaEpisode, CastMember, CrewMember, DriveFileItem } from '../types/media'
import type { IAliGetFileModel } from '../aliapi/alimodels'
import { menuOpenFile } from '../utils/openfile'
import path from 'path'

// Props
const props = defineProps<{
  mediaItem: MediaLibraryItem
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
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.7)), url(${props.mediaItem.backdropUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat'
    }
  }
  return {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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

const playEpisode = (episode: MediaEpisode) => {
  if (episode.driveFiles && episode.driveFiles.length > 0) {
    const driveFile = episode.driveFiles[0]
    const aliFile = buildAliFileModel(driveFile)
    menuOpenFile(aliFile)
  }
}

const playMovie = () => {
  if (props.mediaItem.driveFiles && props.mediaItem.driveFiles.length > 0) {
    const driveFile = props.mediaItem.driveFiles[0]
    const aliFile = buildAliFileModel(driveFile)
    menuOpenFile(aliFile)
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
      <button class="detail-back" @click="handleBackClick" title="返回">
        <i class="iconfont iconarrow-left-2-icon"></i>
        <span>返回</span>
      </button>
      <h2 class="detail-title">{{ mediaItem.name }}</h2>
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
              <span v-if="mediaItem.year" class="meta-year">{{ mediaItem.year }}</span>
              <span v-if="mediaItem.rating" class="meta-rating">
                ⭐ {{ mediaItem.rating.toFixed(1) }}
              </span>
              <span class="meta-type">
                {{ mediaItem.type === 'movie' ? '电影' : mediaItem.type === 'tv' ? '电视剧' : '未匹配' }}
              </span>
            </div>

            <div v-if="mediaItem.genres.length" class="hero-genres">
              <span v-for="genre in mediaItem.genres" :key="genre" class="genre-tag">
                {{ genre }}
              </span>
            </div>

            <p v-if="displayOverview" class="hero-overview" :title="displayOverview">
              {{ displayOverview }}
            </p>

            <div class="hero-actions">
              <div class="actions-stack">
                <div v-if="playEpisodeInfo" class="play-episode-info">{{ playEpisodeInfo }}</div>
                <div ref="actionButtonsRef" class="action-buttons">
                  <a-button
                    type="secondary"
                    class="action-button"
                    :class="{ active: isFavorited }"
                    @click="toggleFavorite"
                  >
                    <span class="favorite-icon">{{ isFavorited ? '★' : '☆' }}</span>
                    <span>收藏</span>
                  </a-button>
                  <a-button
                    type="secondary"
                    class="action-button"
                    :class="{ active: inPlaylist }"
                    @click.stop.prevent="togglePlaylist"
                  >
                    添加到播放列表
                  </a-button>
                  <a-button
                    type="secondary"
                    class="action-button"
                    :class="{ active: isWatched }"
                    @click="toggleWatched"
                  >
                    <i :class="['iconfont', isWatched ? 'iconchakan' : 'iconclose']"></i>
                    {{ isWatched ? '标记为未观看' : '标记为已观看' }}
                  </a-button>
                </div>
                <a-button
                  type="primary"
                  size="large"
                  class="play-button"
                  :style="playButtonWidth ? { width: `${playButtonWidth}px` } : undefined"
                  @click="playMainContent"
                >
                  <span
                    v-if="playProgressPercent !== null"
                    class="play-button-progress"
                    :style="{ width: `${playProgressPercent}%` }"
                  ></span>
                  <span class="play-button-label">{{ playButtonLabel }}</span>
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 季选择器（仅电视剧显示） -->
      <div v-if="mediaItem.type === 'tv' && availableSeasons.length > 1" class="season-selector">
        <div class="section-header">
          <h3>选择季数</h3>
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
              <h4 class="episode-title">
                第 {{ episode.episodeNumber }} 集
              </h4>
              <p class="episode-name">{{ episode.name }}</p>
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
  background: var(--color-bg-1);
}

// 顶部header
.detail-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-neutral-3);
  background: var(--color-bg-1);
  flex-shrink: 0;
  gap: 12px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 0 12px;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-back {
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--color-neutral-3);
  background: var(--color-bg-1);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-1);
  font-weight: 600;
  transition: all 0.2s ease;
}

.detail-back i {
  font-size: 16px;
  color: var(--color-primary-6);
}

.detail-back:hover {
  background: var(--color-neutral-2);
}

// 内容区域
.detail-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--color-neutral-4) transparent;
}

.detail-content::-webkit-scrollbar {
  width: 6px;
}

.detail-content::-webkit-scrollbar-track {
  background: transparent;
}

.detail-content::-webkit-scrollbar-thumb {
  background-color: var(--color-neutral-4);
  border-radius: 3px;
}

.detail-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-neutral-5);
}

// Hero区域样式
.hero-section {
  position: relative;
  min-height: 800px; /* 进一步增加到800px */
  height: 80vh; /* 增加到视口高度的80% */
  display: flex;
  align-items: flex-end;
  padding: 40px;
  color: white;
}

.hero-content {
  display: flex;
  gap: 30px;
  width: 100%;
  max-width: 1200px;
}

.hero-poster {
  flex-shrink: 0;
  width: 180px;
  height: 270px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;

  .iconfont {
    font-size: 48px;
    opacity: 0.6;
  }
}

.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-title {
  font-size: 32px;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
}

.meta-year,
.meta-rating,
.meta-type {
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 12px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.hero-genres {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.genre-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  backdrop-filter: blur(10px);
}

.hero-overview {
  font-size: 16px;
  line-height: 1.6;
  max-width: 900px;
  margin: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.play-episode-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}


.actions-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: max-content;
  max-width: 100%;
}

.play-button {
  height: 52px;
  padding: 0 18px;
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  border-radius: 999px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
  position: relative;
  overflow: hidden;
  background: #ff8f47 !important;
  border: 1px solid #ff8f47 !important;
  color: #fff !important;
}

.play-button:has(.play-button-progress) {
  background: #6b7280 !important;
  border: 1px solid #6b7280 !important;
}

.play-button-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #ff8f47 0%, #ffb366 100%);
  box-shadow: 0 0 12px rgba(255, 143, 71, 0.35);
}

.play-button-progress::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.35);
}

.play-button-label {
  position: relative;
  z-index: 1;
  display: inline-block;
  max-width: 45%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: max-content;
  max-width: 100%;
}

.action-button {
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  font-weight: 500;
  background: rgba(20, 20, 20, 0.55);
  border-color: rgba(255, 255, 255, 0.65);
  color: #fff !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.favorite-icon {
  font-size: 14px;
  line-height: 1;
}

.playlist-modal-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.playlist-title {
  font-size: 16px;
  font-weight: 700;
}

.playlist-subtitle {
  font-size: 12px;
  color: var(--color-text-3);
}

.playlist-modal :deep(.arco-modal) {
  width: 560px;
  max-width: calc(100vw - 48px);
}

.playlist-modal :deep(.arco-modal-body) {
  min-height: 360px;
}

.playlist-create {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
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
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--color-fill-2);
  border: 1px solid var(--color-neutral-3);
}

.playlist-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.playlist-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.playlist-name {
  font-size: 14px;
  color: var(--color-text-1);
}

.playlist-count {
  font-size: 12px;
  color: var(--color-text-3);
}

.playlist-empty {
  text-align: center;
  color: var(--color-text-3);
  padding: 10px 0;
}

.action-button.active {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

// 季选择器样式
.season-selector {
  padding: 24px 40px;
  border-bottom: 1px solid var(--color-neutral-3);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
}

.episode-count {
  color: var(--color-text-3);
  font-size: 14px;
}

.season-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

// 集列表样式
.episodes-section {
  padding: 24px 40px;
}

.cast-section {
  padding: 24px 40px;
  border-top: 1px solid var(--color-neutral-3);
}

.cast-count {
  color: var(--color-text-3);
  font-size: 14px;
}

.cast-list {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--color-neutral-4) transparent;
}

.cast-list::-webkit-scrollbar {
  height: 6px;
}

.cast-list::-webkit-scrollbar-track {
  background: transparent;
}

.cast-list::-webkit-scrollbar-thumb {
  background-color: var(--color-neutral-4);
  border-radius: 3px;
}

.cast-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-neutral-5);
}

.cast-card {
  flex-shrink: 0;
  width: 140px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cast-card:hover {
  border-color: var(--color-primary-6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.cast-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-fill-2);
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: linear-gradient(135deg, var(--color-neutral-2) 0%, var(--color-neutral-3) 100%);
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-2);
}

.cast-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cast-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.cast-role {
  font-size: 12px;
  color: var(--color-text-3);
}

.episodes-grid {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--color-neutral-4) transparent;
}

.episodes-grid::-webkit-scrollbar {
  height: 6px;
}

.episodes-grid::-webkit-scrollbar-track {
  background: transparent;
}

.episodes-grid::-webkit-scrollbar-thumb {
  background-color: var(--color-neutral-4);
  border-radius: 3px;
}

.episodes-grid::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-neutral-5);
}

.episode-card {
  flex-shrink: 0;
  width: 280px; /* 增加宽度从200px到280px */
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .episode-play-overlay {
      opacity: 1;
    }

    .episode-image {
      transform: scale(1.05);
    }
  }

  &.active {
    border-color: var(--color-primary);
    background: var(--color-primary-light-1);
  }
}

.episode-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  background: var(--color-fill-2);
  border-radius: 6px;
  overflow: hidden;
  min-height: 120px; /* 增加最小高度 */
  cursor: pointer;
}

.episode-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-neutral-2) 0%, var(--color-neutral-3) 100%);
  border-radius: 6px;
}

.episode-number {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text-2);
}

.episode-play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;

  .iconfont {
    font-size: 20px;
    color: white;
    margin-left: 2px;
  }
}

.episode-info {
  padding: 12px;
}

.episode-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  line-height: 1.4;
  text-align: center;
}

.episode-name {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 0;
  line-height: 1.3;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 详细信息样式
.details-card {
  width: 100%;
  max-width: 520px;
  background: #f3f3f3;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-label {
  font-weight: 500;
  color: var(--color-text-2);
}

.detail-value {
  font-weight: 600;
  color: var(--color-text-1);
}

.detail-path {
  width: 100%;
  max-width: 520px;
  margin-top: 12px;
  background: #f3f3f3;
  border-radius: 18px;
  padding: 12px 16px;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-neutral-3);
}

.overview-section h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text-1);
}

.overview-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--color-text-2);
  margin: 0;
  max-width: 800px;
}

// 标签区域样式
.tags-section {
  padding: 24px 40px 40px 40px;
  border-top: 1px solid var(--color-neutral-3);
}

.tag-group {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.tag-group-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0 0 12px 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: inline-block;
  padding: 6px 16px;
  background: var(--color-neutral-2);
  color: var(--color-text-2);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &.clickable {
    cursor: pointer;

    &:hover {
      background: var(--color-primary-light-4);
      color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .hero-section {
    padding: 24px;
    min-height: 600px; /* 增加到600px */
    height: 70vh; /* 移动端使用70%视口高度 */
  }

  .hero-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .hero-poster {
    width: 140px;
    height: 210px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 24px;
  }

  .episodes-grid {
    gap: 12px;
  }

  .episode-card {
    width: 220px; /* 移动端也增加宽度从160px到220px */
  }

  .season-selector,
  .episodes-section,
  .cast-section,
  .tags-section {
    padding: 16px 24px;
  }

  .overview-text {
    font-size: 14px;
  }

  .tag-group-title {
    font-size: 16px;
  }

  .tag-item {
    font-size: 13px;
    padding: 5px 12px;
  }
}
</style>

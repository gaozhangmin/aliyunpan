<template>
  <div class="media-library">
    <!-- 顶部导航 - 详情页面时隐藏 -->
    <div v-if="!showingDetail" class="library-header">
      <div class="library-tabs">
        <a-tabs v-model:activeKey="activeTab" type="text" class="hidetabs">
          <a-tab-pane key="continue" tab="继续观看" />
          <a-tab-pane key="recent" tab="最近添加" />
          <a-tab-pane key="movies" tab="电影" />
          <a-tab-pane key="tv" tab="电视剧" />
          <a-tab-pane key="unmatched" tab="未匹配" />
        </a-tabs>
      </div>

      <!-- 筛选器和视图切换 - 只在显示媒体内容时显示，文件夹文件列表时隐藏 -->
      <div v-if="!props.selectedFolder || folderFileList.length === 0" class="library-controls">
        <div class="library-filters-right">
<!--          <a-select v-model:value="selectedGenre" placeholder="按类型筛选" style="width: 120px;">-->
<!--            <a-option value="">全部类型</a-option>-->
<!--            <a-option v-for="genre in mediaStore.genres" :key="genre" :value="genre">-->
<!--              {{ genre }}-->
<!--            </a-option>-->
<!--          </a-select>-->

<!--          <a-select v-model:value="selectedYear" placeholder="按年份筛选" style="width: 120px;">-->
<!--            <a-option value="">全部年份</a-option>-->
<!--            <a-option v-for="year in mediaStore.years" :key="year" :value="year.toString()">-->
<!--              {{ year }}-->
<!--            </a-option>-->
<!--          </a-select>-->

<!--          <a-select v-model:value="selectedRating" placeholder="按评分筛选" style="width: 120px;">-->
<!--            <a-option value="">全部评分</a-option>-->
<!--            <a-option value="9-10">9-10分</a-option>-->
<!--            <a-option value="8-9">8-9分</a-option>-->
<!--            <a-option value="7-8">7-8分</a-option>-->
<!--            <a-option value="6-7">6-7分</a-option>-->
<!--            <a-option value="1-5">1-5分</a-option>-->
<!--          </a-select>-->

          <!-- 视图切换按钮 -->
          <div class="view-toggle">
          <a-button-group>
            <a-button
              :type="viewMode === 'grid' ? 'primary' : 'secondary'"
              @click="viewMode = 'grid'"
              title="网格视图"
            >
              <template #icon>
                <svg viewBox="0 0 1024 1024" width="14" height="14">
                  <path d="M128 128h192v192H128V128zm288 0h192v192H416V128zm288 0h192v192H704V128zM128 416h192v192H128V416zm288 0h192v192H416V416zm288 0h192v192H704V416zM128 704h192v192H128V704zm288 0h192v192H416V704zm288 0h192v192H704V704z" fill="currentColor"/>
                </svg>
              </template>
            </a-button>
            <a-button
              :type="viewMode === 'list' ? 'primary' : 'secondary'"
              @click="viewMode = 'list'"
              title="列表视图"
            >
              <template #icon>
                <svg viewBox="0 0 1024 1024" width="14" height="14">
                  <path d="M128 256h768v85.333H128V256zm0 213.333h768V555H128v-85.667zM128 683h768v85.333H128V683z" fill="currentColor"/>
                </svg>
              </template>
            </a-button>
          </a-button-group>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="library-content">
      <!-- 搜索界面 -->
      <div v-if="isSearchView && !showingDetail" class="search-panel">
        <div class="search-panel-title">搜索媒体库</div>
        <div class="search-panel-input">
          <a-input v-model="localSearchQuery" allow-clear placeholder="输入片名进行搜索" />
        </div>
        <div class="search-panel-hint">支持按名称模糊匹配</div>
      </div>

      <!-- 显示媒体详情 -->
      <MediaDetail
        v-if="showingDetail && currentMediaItem"
        :media-item="currentMediaItem"
        @back="handleDetailBack"
        @tag-click="handleDetailTagClick"
      />

      <!-- 显示媒体库内容 -->
      <template v-else-if="showSearchResults">
      <!-- 加载状态 -->
      <div v-if="mediaStore.isScanning" class="loading-state">
        <a-spin />
        <p>正在扫描媒体文件... {{ mediaStore.scanProgress }}/{{ mediaStore.scanTotal }}</p>
      </div>

      <!-- 文件列表 - 当选择文件夹时显示 PanRight 组件 -->
      <div v-else-if="props.selectedFolder && folderFileList.length >= 0" class="folder-file-list">
        <div class="folder-header">
          <div class="folder-header-content">
            <div class="folder-info">
              <h3>{{ currentFolderInfo?.name || props.selectedFolder.name }}</h3>
              <p>共 {{ folderFileList.length }} 个文件</p>
            </div>
            <div class="folder-actions">
              <a-button v-if="folderNavigationStack.length > 0" type="primary" @click="handleGoBack">
                <template #icon>
                  <i class="iconfont iconback" />
                </template>
                返回上级
              </a-button>
            </div>
          </div>
        </div>
        <div class="pan-right-container">
          <MediaPanRight @enter-folder="handleEnterFolder" />
        </div>
      </div>

      <!-- 空状态 - 当选择文件夹但没有文件时 -->
      <div v-else-if="props.selectedFolder && folderFileList.length === 0" class="folder-file-list">
        <div class="folder-header">
          <div class="folder-header-content">
            <div class="folder-info">
              <h3>{{ currentFolderInfo?.name || props.selectedFolder.name }}</h3>
              <p>文件夹为空</p>
            </div>
            <div class="folder-actions">
              <a-button v-if="folderNavigationStack.length > 0" type="primary" @click="handleGoBack">
                <template #icon>
                  <i class="iconfont iconback" />
                </template>
                返回上级
              </a-button>
            </div>
          </div>
        </div>
        <div class="empty-state">
          <a-empty description="文件夹为空" />
        </div>
      </div>

      <!-- 分类聚合视图 -->
      <div v-else-if="showCategoryView" class="category-view">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="category-grid">
          <CategoryCard
            v-for="item in categoryItems"
            :key="`${item.type}-${item.name}`"
            :name="item.name"
            :count="item.count"
            :type="item.type"
            :gradient="getCategoryGradient(item.type)"
            :cover-image="getRandomCoverImage(item)"
            @click="handleCategoryClick"
          />
        </div>

        <!-- 列表视图 - 横向卡片布局 -->
        <div v-else-if="viewMode === 'list'" class="category-list">
          <div
            v-for="item in categoryItems"
            :key="`${item.type}-${item.name}`"
            class="category-list-card"
            :style="getListCardStyle(item)"
            @click="handleCategoryClick({ name: item.name, type: item.type, count: item.count })"
          >
            <div class="category-list-overlay"></div>
            <div class="category-list-content">
              <h3 class="category-list-title">{{ item.name }}</h3>
            </div>
            <div class="category-list-count">{{ item.count }} items</div>
          </div>
        </div>
      </div>

      <!-- 播放列表视图 -->
      <div v-else-if="showPlaylistView" class="category-view">
        <div v-if="viewMode === 'grid'" class="category-grid">
          <CategoryCard
            v-for="item in playlistItems"
            :key="`playlist-${item.name}`"
            :name="item.name"
            :count="item.count"
            :type="item.type as 'year' | 'rating' | 'genre'"
            :gradient="getCategoryGradient('genre')"
            :cover-image="item.coverImage"
            @click="handleCategoryClick"
          />
        </div>

        <div v-else-if="viewMode === 'list'" class="category-list">
          <div
            v-for="item in playlistItems"
            :key="`playlist-${item.name}`"
            class="category-list-card"
            :style="getPlaylistCardStyle(item)"
            @click="handleCategoryClick({ name: item.name, type: item.type, count: item.count })"
          >
            <div class="category-list-overlay"></div>
            <div class="category-list-content">
              <h3 class="category-list-title">{{ item.name }}</h3>
            </div>
            <div class="category-list-count">{{ item.count }} items</div>
          </div>
        </div>
      </div>

      <!-- 空状态 - 当没有媒体内容时 -->
      <div v-else-if="filteredItems.length === 0" class="empty-state">
        <a-empty description="暂无媒体内容" />
      </div>

      <!-- 媒体内容 -->
      <div v-else :class="['media-container', viewMode]">
        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="media-grid">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="media-item"
            @click="openMedia(item)"
            @contextmenu.prevent="openContextMenu($event, item)"
          >
            <div class="media-poster">
              <img
                v-if="item.posterUrl"
                :src="item.posterUrl"
                :alt="item.name"
                @error="handleImageError"
              />
              <div v-else class="poster-placeholder">
                <i class="iconfont iconfile-video" />
              </div>

              <div v-if="isContinueWatchingView && item.watchProgress !== undefined" class="watch-progress">
                <div
                  class="watch-progress-bar"
                  :style="{ width: `${Math.round((item.watchProgress || 0) * 100)}%` }"
                ></div>
              </div>

              <!-- 评分标签 -->
              <div v-if="item.rating" class="rating-badge">
                {{ item.rating.toFixed(1) }}
              </div>

              <!-- 类型标签 -->
              <div class="type-badge">
                {{ item.type === 'movie' ? '电影' : item.type === 'tv' ? '电视剧' : '未匹配' }}
              </div>
            </div>

            <div class="media-info">
              <h3 class="media-title" :title="item.name">
                {{ item.name }}
                <span v-if="getEpisodeTitleSuffix(item)" class="episode-suffix">
                  {{ getEpisodeTitleSuffix(item) }}
                </span>
              </h3>
              <p v-if="item.year" class="media-year">{{ item.year }}</p>
              <p v-if="item.type === 'unmatched' && getUnmatchedPath(item)" class="media-path" :title="getUnmatchedPath(item)">
                {{ getUnmatchedPath(item) }}
              </p>
              <p v-if="isContinueWatchingView && item.continueEpisodeLabel" class="media-episode">
                {{ item.continueEpisodeLabel }}
              </p>
              <p v-if="item.genres.length" class="media-genres">
                {{ item.genres.slice(0, 3).join(', ') }}
              </p>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else-if="viewMode === 'list'" class="media-list">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="media-list-item"
            @click="openMedia(item)"
            @contextmenu.prevent="openContextMenu($event, item)"
          >
            <div class="list-poster">
              <img
                v-if="item.posterUrl"
                :src="item.posterUrl"
                :alt="item.name"
                @error="handleImageError"
              />
              <div v-else class="poster-placeholder">
                <i class="iconfont iconfile-video" />
              </div>
            </div>

            <div class="list-info">
              <div class="list-main">
                <h3 class="list-title">
                  {{ item.name }}
                  <span v-if="getEpisodeTitleSuffix(item)" class="episode-suffix">
                    {{ getEpisodeTitleSuffix(item) }}
                  </span>
                </h3>
                <p v-if="item.overview" class="list-overview">
                  {{ item.overview.length > 120 ? item.overview.substring(0, 120) + '...' : item.overview }}
                </p>
                <p v-if="item.type === 'unmatched' && getUnmatchedPath(item)" class="list-path" :title="getUnmatchedPath(item)">
                  {{ getUnmatchedPath(item) }}
                </p>
                <p v-if="isContinueWatchingView && item.continueEpisodeLabel" class="list-episode">
                  {{ item.continueEpisodeLabel }}
                </p>
                <p v-if="isContinueWatchingView && item.watchProgress !== undefined" class="list-progress">
                  已观看 {{ Math.round((item.watchProgress || 0) * 100) }}%
                </p>
              </div>

              <div class="list-meta">
                <span class="list-type">{{ item.type === 'movie' ? '电影' : item.type === 'tv' ? '电视剧' : '未匹配' }}</span>
                <span v-if="item.year" class="list-year">{{ item.year }}</span>
                <span v-if="item.rating" class="list-rating">
                  ⭐ {{ item.rating.toFixed(1) }}
                </span>
              </div>

              <div v-if="item.genres.length" class="list-genres">
                <span v-for="genre in item.genres.slice(0, 5)" :key="genre" class="genre-tag">
                  {{ genre }}
                </span>
              </div>

              <!-- 电视剧特有信息 -->
              <div v-if="item.type === 'tv' && item.seasons?.length" class="tv-info">
                <span v-if="item.seasons?.length" class="tv-seasons">
                  {{ item.seasons.length }} 季
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>

    <!-- 添加文件夹对话框 -->
    <a-modal
      v-model:visible="showAddFolderModal"
      title="添加到媒体库"
      @ok="handleAddFolder"
      @cancel="showAddFolderModal = false"
    >
      <a-form :model="folderForm" layout="vertical">
        <a-form-item label="文件夹名称">
          <a-input v-model:value="folderForm.name" placeholder="请输入媒体库名称" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-dropdown
      class="rightmenu"
      :popup-visible="showContextMenu"
      :style="contextMenuStyle"
      @popup-visible-change="handleContextMenuClose"
    >
      <div style="width: 1px; height: 1px; visibility: hidden;" />
      <template #content>
        <a-doption v-if="isContinueWatchingView" @click="removeFromContinueWatchingFromMenu">
          <template #icon><i class="iconfont iconstart" /></template>
          <template #default>从继续观看移除</template>
        </a-doption>
        <template v-else>
          <a-doption @click="toggleFavoriteFromMenu">
            <template #icon><i class="iconfont iconcrown3" /></template>
            <template #default>{{ contextMenuIsFavorite ? '取消收藏' : '收藏' }}</template>
          </a-doption>
          <a-doption @click="toggleWatchedFromMenu">
            <template #icon><i :class="['iconfont', contextMenuIsWatched ? 'iconchakan' : 'iconclose']" /></template>
            <template #default>{{ contextMenuIsWatched ? '标记为未观看' : '标记为已观看' }}</template>
          </a-doption>
          <a-doption v-if="hasPlaylists" @click="togglePlaylistFromMenu">
            <template #icon><i class="iconfont iconlist" /></template>
            <template #default>{{ contextMenuInPlaylist ? '移除播放列表' : '添加到播放列表' }}</template>
          </a-doption>
          <a-doption class="danger" @click="deleteMediaFromMenu">
            <template #icon><i class="iconfont icondelete" /></template>
            <template #default>删除</template>
          </a-doption>
        </template>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import { useAppStore } from '../store'
import MediaPanRight from './MediaPanRight.vue'
import { useMediaPanFileStore, useMediaPanTreeStore } from './stores'
import CategoryCard from './CategoryCard.vue'
import MediaDetail from './MediaDetail.vue'
import type { MediaLibraryItem, MediaFilter } from '../types/media'
import { isCloud123User, isDrive115User, isBaiduUser } from '../aliapi/utils'
import AliDirFileList from '../aliapi/dirfilelist'
import { apiBaiduFileList, mapBaiduFileToAliModel } from '../cloudbaidu/dirfilelist'
import { getWebDavConnection, getWebDavConnectionId, isWebDavDrive, listWebDavDirectory } from '../utils/webdavClient'
import message from '../utils/message'

type MediaListItem = MediaLibraryItem & {
  continueEpisodeLabel?: string
}

const props = defineProps<{
  activeCategory?: string
  selectedFolder?: any
  selectedGenre?: string
  selectedYear?: string
  selectedRating?: string
  searchQuery?: string
}>()

const mediaStore = useMediaLibraryStore()
const appStore = useAppStore()
const mediaPanFileStore = useMediaPanFileStore()
const mediaPanTreeStore = useMediaPanTreeStore()

// 状态
const activeTab = ref('recently-added')
const showAddFolderModal = ref(false)
const folderForm = ref({ name: '' })
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuItem = ref<MediaLibraryItem | null>(null)
const selectedGenre = ref('')
const selectedYear = ref('')
const selectedRating = ref('')
const selectedCast = ref('')
const selectedCountry = ref('')
const selectedPlaylist = ref('')
const localSearchQuery = ref(props.searchQuery || '')
const viewMode = ref<'grid' | 'list'>('grid') // 添加视图模式状态
const showingDetail = ref(false)
const currentMediaItem = ref<MediaLibraryItem>()

// 文件夹文件列表
const folderFileList = ref<any[]>([])
const currentFolderInfo = ref<any>(null)
const folderNavigationStack = ref<any[]>([]) // 文件夹导航堆栈

watch(
  () => [
    props.activeCategory,
    props.selectedFolder,
    props.selectedGenre,
    props.selectedYear,
    props.selectedRating
  ],
  () => {
    if (showingDetail.value) {
      showingDetail.value = false
      currentMediaItem.value = undefined
    }
    selectedCast.value = ''
    selectedCountry.value = ''
    if (props.activeCategory !== 'playlist') {
      selectedPlaylist.value = ''
    }
  }
)

watch(
  () => props.searchQuery,
  (value) => {
    localSearchQuery.value = value || ''
  }
)

// 计算属性
const filteredItems = computed(() => {
  let items: MediaListItem[] = []

  // 根据props或当前标签选择数据源
  const category = props.activeCategory || activeTab.value

  console.log('Filtering items - Category:', category, 'Selected folder:', props.selectedFolder?.name, 'Folder ID:', props.selectedFolder?.id)

  // 如果选择了文件夹，显示该文件夹的文件列表（直接显示，不转换为媒体项目）
  if (props.selectedFolder && folderFileList.value.length > 0) {
    // 这里我们将直接在模板中使用 folderFileList，而不是转换为 MediaLibraryItem
    return []
  }

  switch (category) {
    case 'continue-watching':
      items = [...continueWatchingItems.value]
      break
    case 'recently-added':
      items = [...mediaStore.recentlyAdded]
      break
    case 'movies':
      items = [...mediaStore.movies]
      break
    case 'tv-shows':
      items = [...mediaStore.tvShows]
      break
    case 'favorites':
      items = mediaStore.favorites
        .map(favoriteIdToMediaItem)
        .filter((item): item is MediaLibraryItem => Boolean(item))
      break
    case 'playlist':
      if (selectedPlaylist.value) {
        const ids = mediaStore.playlists[selectedPlaylist.value] || []
        items = ids
          .map(favoriteIdToMediaItem)
          .filter((item): item is MediaLibraryItem => Boolean(item))
      } else {
        items = []
      }
      break
    case 'unmatched':
      items = [...mediaStore.unmatchedItems]
      break
    case 'unwatched':
      items = mediaStore.mediaItems.filter(item => {
        if (mediaStore.watchedItems.includes(item.id)) return false
        return !mediaStore.watchedItems.some(watchedId => String(watchedId).startsWith(`${item.id}_`))
      })
      break
    case 'search':
      items = [...mediaStore.mediaItems]
      break
    case 'genres':
      items = [...mediaStore.mediaItems]
      break
    case 'ratings':
      items = [...mediaStore.topRated]
      break
    case 'years':
      items = [...mediaStore.mediaItems]
      break
    default:
      items = [...mediaStore.mediaItems]
  }

  console.log('Initial items count:', items.length)

  // 应用筛选器
  const filter: MediaFilter = {
    genre: props.selectedGenre || selectedGenre.value || undefined,
    sortBy: 'added',
    sortOrder: 'desc'
  }

  const year = props.selectedYear || selectedYear.value
  if (year) {
    const yearNum = parseInt(year)
    filter.yearRange = [yearNum, yearNum]
  }

  const rating = props.selectedRating || selectedRating.value
  if (rating) {
    const [min, max] = rating.split('-').map(Number)
    filter.ratingRange = [min, max]
  }

  // 根据分类过滤类型
  if (category === 'movies') {
    filter.type = 'movie'
  } else if (category === 'tv-shows') {
    filter.type = 'tv'
  } else if (category === 'unmatched') {
    filter.type = 'unmatched'
  } else if (category === 'documentary') {
    filter.type = 'movie'
    filter.genre = '99'
  } else if (category === 'animation') {
    filter.genre = '16'
  }

  let result = items

  if (!['favorites', 'playlist', 'continue-watching'].includes(category)) {
    result = mediaStore.filterItems(filter).filter(item => items.some(i => i.id === item.id))
  }
  if (selectedCast.value) {
    const keyword = selectedCast.value.toLowerCase()
    result = result.filter(item =>
      item.credits?.cast?.some(c => c.name?.toLowerCase().includes(keyword))
    )
  }
  if (selectedCountry.value) {
    const keyword = selectedCountry.value.toLowerCase()
    result = result.filter(item =>
      (item.productionCountries || []).some(c => c.toLowerCase().includes(keyword))
    )
  }
  const query = (localSearchQuery.value || '').trim().toLowerCase()
  if (query) {
    result = result.filter(item =>
      item.name?.toLowerCase().includes(query)
    )
  }
  return result
})

const isSearchView = computed(() => {
  const category = props.activeCategory || activeTab.value
  return category === 'search'
})

const showSearchResults = computed(() => {
  if (!isSearchView.value) return true
  return localSearchQuery.value.trim().length > 0
})

// 分类聚合视图相关计算属性
const showCategoryView = computed(() => {
  const category = props.activeCategory || activeTab.value
  return ['genres', 'ratings', 'years'].includes(category) && !props.selectedFolder
})

const showPlaylistView = computed(() => {
  const category = props.activeCategory || activeTab.value
  return category === 'playlist' && !props.selectedFolder && !selectedPlaylist.value
})

const isContinueWatchingView = computed(() => {
  const category = props.activeCategory || activeTab.value
  return category === 'continue-watching'
})

const categoryItems = computed(() => {
  const category = props.activeCategory || activeTab.value

  switch (category) {
    case 'genres':
      return mediaStore.genreCategories
    case 'ratings':
      return mediaStore.ratingCategories
    case 'years':
      return mediaStore.yearGroups
    default:
      return []
  }
})

const playlistItems = computed(() => {
  const entries = Object.entries(mediaStore.playlists || {})
  return entries.map(([name, itemIds]) => {
    const firstId = itemIds[0]
    let coverImage: string | undefined

    if (firstId) {
      const direct = mediaStore.mediaItems.find(item => item.id === firstId)
      if (direct?.posterUrl) {
        coverImage = direct.posterUrl
      } else {
        const tvBase = mediaStore.tvShows.find(item => String(firstId).startsWith(`${item.id}_`))
        if (tvBase?.posterUrl) coverImage = tvBase.posterUrl
      }
    }

    return {
      name,
      count: itemIds.length,
      type: 'playlist' as const,
      coverImage
    }
  })
})

const favoriteIdToMediaItem = (favoriteId: string): MediaLibraryItem | null => {
  const favoriteKey = String(favoriteId)
  const direct = mediaStore.mediaItems.find(item => item.id === favoriteKey)
  if (direct) {
    return direct
  }

  const tvBase = mediaStore.tvShows.find(item => favoriteKey.startsWith(`${item.id}_`))
  if (!tvBase) return null

  const suffix = favoriteKey.slice(tvBase.id.length + 1)
  const parts = suffix.split('_').filter(Boolean)
  const seasonNumber = parseInt(parts[0] || '', 10)
  const episodeNumber = parts.length > 1 ? parseInt(parts[1] || '', 10) : undefined

  if (!Number.isFinite(seasonNumber)) return tvBase

  const season = tvBase.seasons?.find(s => s.seasonNumber === seasonNumber)
  if (!episodeNumber) {
    return {
      ...tvBase,
      name: `${tvBase.name} S${seasonNumber}`,
      seasons: season ? [season] : tvBase.seasons
    }
  }

  const episode = season?.episodes?.find(e => e.episodeNumber === episodeNumber)
  const driveFiles = episode?.driveFiles || tvBase.driveFiles

  return {
    ...tvBase,
    name: `${tvBase.name} S${seasonNumber}E${episodeNumber}`,
    seasons: season ? [{
      ...season,
      episodes: episode ? [episode] : season.episodes
    }] : tvBase.seasons,
    driveFiles
  }
}

const parseEpisodeId = (id: string) => {
  const parts = String(id).split('_')
  if (parts.length < 3) return null
  const seasonNumber = parseInt(parts[parts.length - 2] || '', 10)
  const episodeNumber = parseInt(parts[parts.length - 1] || '', 10)
  if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) return null
  const tvId = parts.slice(0, -2).join('_')
  return { seasonNumber, episodeNumber, tvId }
}

const getEpisodeTitleSuffix = (item: MediaLibraryItem) => {
  if (/第\s*\d+\s*季/.test(item.name) || /S\d+E\d+/i.test(item.name)) {
    return ''
  }
  const info = parseEpisodeId(item.id)
  if (!info) return ''
  return `S${info.seasonNumber}E${info.episodeNumber}`
}

const getUnmatchedPath = (item: MediaLibraryItem) => {
  return item.driveFiles?.[0]?.path || ''
}

const parseContinueEpisode = (id: string) => {
  return parseEpisodeId(id)
}

const mapContinueWatchingItem = (cw: MediaLibraryItem): MediaListItem => {
  const result: MediaListItem = {
    ...cw,
    watchProgress: cw.watchProgress,
    lastWatched: cw.lastWatched
  }

  if (cw.type === 'tv') {
    const episodeInfo = parseContinueEpisode(cw.id)
    if (episodeInfo) {
      const tvId = episodeInfo.tvId
      const base = mediaStore.tvShows.find(item => item.id === tvId) || cw
      const season = base.seasons?.find(s => s.seasonNumber === episodeInfo.seasonNumber)
      const episode = season?.episodes?.find(ep => ep.episodeNumber === episodeInfo.episodeNumber)

      result.name = `${base.name} 第${episodeInfo.seasonNumber}季 第${episodeInfo.episodeNumber}集`
      result.continueEpisodeLabel = `第 ${episodeInfo.seasonNumber} 季 · 第 ${episodeInfo.episodeNumber} 集`
      result.posterUrl = base.posterUrl || result.posterUrl
      result.backdropUrl = base.backdropUrl || result.backdropUrl
      result.type = 'tv'
      result.seasons = season && episode ? [{
        ...season,
        episodes: [episode]
      }] : base.seasons
    }
  }

  return result
}

const continueWatchingItems = computed(() => {
  // const list = Array.isArray(mediaStore.continueWatching) ? mediaStore.continueWatching : []
  // return list.map(mapContinueWatchingItem)
  return mediaStore.continueWatching
})

const contextMenuIsFavorite = computed(() => {
  if (!contextMenuItem.value || typeof mediaStore.isFavorite !== 'function') return false
  return mediaStore.isFavorite(contextMenuItem.value.id)
})

const contextMenuIsWatched = computed(() => {
  if (!contextMenuItem.value || typeof mediaStore.isWatched !== 'function') return false
  return mediaStore.isWatched(contextMenuItem.value.id)
})

const contextMenuInPlaylist = computed(() => {
  if (!contextMenuItem.value) return false
  return Object.values(mediaStore.playlists || {}).some(list => list.includes(contextMenuItem.value!.id))
})

const hasPlaylists = computed(() => {
  return Object.keys(mediaStore.playlists || {}).length > 0
})

const contextMenuStyle = computed(() => {
  const position = contextMenuPosition.value || { x: 0, y: 0 }
  return {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 9999,
    opacity: showContextMenu.value ? 1 : 0
  }
})

const contextMenuInContinueWatching = computed(() => {
  if (!contextMenuItem.value) return false
  return mediaStore.continueWatching.some(item => item.id === contextMenuItem.value!.id)
})

// 方法
const openMedia = (item: MediaLibraryItem) => {
  console.log('Opening media:', item.name)

  // 显示详情页面
  currentMediaItem.value = item
  showingDetail.value = true
}

const openContextMenu = (event: MouseEvent, item: MediaLibraryItem) => {
  contextMenuItem.value = item
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

const handleContextMenuClose = () => {
  showContextMenu.value = false
  contextMenuItem.value = null
}

const toggleFavoriteFromMenu = () => {
  if (!contextMenuItem.value || typeof mediaStore.toggleFavorite !== 'function') return
  mediaStore.toggleFavorite(contextMenuItem.value.id)
  handleContextMenuClose()
}

const toggleWatchedFromMenu = () => {
  if (!contextMenuItem.value || typeof mediaStore.markWatched !== 'function') return
  mediaStore.markWatched(contextMenuItem.value.id, !contextMenuIsWatched.value)
  handleContextMenuClose()
}

const togglePlaylistFromMenu = () => {
  if (!contextMenuItem.value) return
  const playlistName = Object.keys(mediaStore.playlists || {})[0]
  if (!playlistName) return
  mediaStore.togglePlaylistItem(playlistName, contextMenuItem.value.id)
  handleContextMenuClose()
}

const removeFromContinueWatchingFromMenu = () => {
  if (!contextMenuItem.value) return
  if (typeof mediaStore.removeFromContinueWatching === 'function') {
    mediaStore.removeFromContinueWatching(contextMenuItem.value.id)
  }
  handleContextMenuClose()
}

const getBaseMediaId = (item: MediaLibraryItem) => {
  const parts = String(item.id).split('_')
  if (parts.length >= 3) return parts.slice(0, -2).join('_')
  return item.id
}

const deleteMediaFromMenu = () => {
  if (!contextMenuItem.value) return
  const baseId = getBaseMediaId(contextMenuItem.value)
  mediaStore.removeMediaItem(baseId)
  if (typeof mediaStore.removeFromContinueWatching === 'function') {
    mediaStore.removeFromContinueWatching(contextMenuItem.value.id)
  }
  if (typeof mediaStore.removeFromFavorites === 'function') {
    mediaStore.removeFromFavorites(contextMenuItem.value.id)
  }
  if (typeof mediaStore.removeFromPlaylists === 'function') {
    mediaStore.removeFromPlaylists(contextMenuItem.value.id)
  }
  if (typeof mediaStore.removeWatchedByPrefix === 'function') {
    mediaStore.removeWatchedByPrefix(baseId)
  }
  handleContextMenuClose()
}

// 返回媒体库列表
const handleDetailBack = () => {
  showingDetail.value = false
  currentMediaItem.value = undefined
}

// 处理详情页标签点击
const handleDetailTagClick = (tagType: string, tagValue: string) => {
  console.log(`Tag clicked: ${tagType} = ${tagValue}`)

  // 返回列表并应用筛选
  showingDetail.value = false
  currentMediaItem.value = undefined

  // 根据标签类型设置筛选条件
  switch (tagType) {
    case 'genre':
      selectedGenre.value = tagValue
      break
    case 'year':
      selectedYear.value = tagValue
      break
    case 'cast':
      selectedCast.value = tagValue
      break
    case 'country':
      selectedCountry.value = tagValue
      break
    // 可以扩展更多标签类型
  }
}

// 获取分类卡片渐变色
const getCategoryGradient = (type: string) => {
  const gradients = {
    genre: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    rating: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    year: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  }
  return gradients[type as keyof typeof gradients] || gradients.genre
}

// 获取随机封面图
const getRandomCoverImage = (categoryItem: any) => {
  if (categoryItem.items && categoryItem.items.length > 0) {
    // 随机选择一个有封面的项目
    const itemsWithCover = categoryItem.items.filter((item: any) => item.posterUrl)
    if (itemsWithCover.length > 0) {
      const randomItem = itemsWithCover[Math.floor(Math.random() * itemsWithCover.length)]
      return randomItem.posterUrl
    }
  }
  return undefined
}

// 获取列表卡片样式
const getListCardStyle = (item: any) => {
  const coverImage = getRandomCoverImage(item)
  if (coverImage) {
    return {
      backgroundImage: `url(${coverImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat'
    }
  } else {
    // 使用分类类型对应的渐变背景
    return {
      background: getCategoryGradient(item.type)
    }
  }
}

const getPlaylistCardStyle = (item: { coverImage?: string }) => {
  if (item.coverImage) {
    return {
      backgroundImage: `url(${item.coverImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat'
    }
  }
  return {
    background: getCategoryGradient('genre')
  }
}

// 处理分类卡片点击事件
const handleCategoryClick = (data: { name: string; type: string; count: number }) => {
  console.log('Category clicked:', data)

  // 根据类型设置相应的筛选条件
  switch (data.type) {
    case 'genre':
      selectedGenre.value = data.name
      break
    case 'rating':
      // 从名称中提取评分范围（如"8分" -> "8-8"）
      if (data.name.includes('-')) {
        selectedRating.value = data.name.replace('分', '').replace('-', '-')
      } else {
        const rating = data.name.replace('分', '')
        selectedRating.value = `${rating}-${rating}`
      }
      break
    case 'year':
      // 年份组处理（如"2020s" -> 设置年份范围）
      const decade = data.name.replace('s', '')
      selectedYear.value = decade
      break
    case 'playlist':
      selectedPlaylist.value = data.name
      break
  }

  if (data.type === 'playlist') {
    return
  }

  // 发射事件通知父组件进行钻取
  emit('categoryDrillDown', {
    categoryType: data.type,
    categoryValue: data.name,
    filter: {
      genre: data.type === 'genre' ? data.name : undefined,
      rating: data.type === 'rating' ? selectedRating.value : undefined,
      year: data.type === 'year' ? selectedYear.value : undefined
    }
  })
}

const openFile = (file: any) => {
  console.log('Opening file:', file.name)
  if (file.isDir) {
    // 如果是文件夹，可以进一步进入
    console.log('Enter directory:', file.name)
  } else {
    // 如果是文件，打开播放器或下载
    console.log('Open file:', file.name)
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const showAddFolder = (folder: any) => {
  folderForm.value.name = folder.name
  showAddFolderModal.value = true
}

const handleAddFolder = async () => {
  console.log('Adding folder to library:', folderForm.value.name)
  showAddFolderModal.value = false
}

// 显示文件夹文件列表
const showFolderFiles = (files: any[], folder: any) => {
  const driveId = folder.driveId || 'default'
  const dirId = folder.fileId || folder.id
  const userId = folder.userId || ''
  const normalizedFiles = files.map((item: any) => ({
    ...item,
    drive_id: item.drive_id || driveId,
    user_id: item.user_id || userId
  }))

  folderFileList.value = normalizedFiles
  currentFolderInfo.value = folder
  console.log(`显示文件夹 ${folder.name} 的 ${normalizedFiles.length} 个文件`)

  // 使用媒体库专用的 store
  mediaPanFileStore.mSaveDirFileLoading(driveId, dirId, folder.name, '')
  if (driveId !== 'local') {
    mediaPanTreeStore.user_id = userId
    mediaPanTreeStore.drive_id = driveId
    mediaPanTreeStore.selectDir = {
      __v_skip: true,
      drive_id: driveId,
      user_id: userId,
      file_id: dirId,
      album_id: '',
      album_type: '',
      parent_file_id: folder.parentFileId || '',
      name: folder.name,
      namesearch: folder.name,
      path: folder.path || dirId,
      size: 0,
      time: Date.now(),
      description: folder.description || ''
    }
    mediaPanTreeStore.selectDirPath = [mediaPanTreeStore.selectDir]
  }

  // 直接设置数据到媒体库专用 store
  mediaPanFileStore.mSaveDirFileLoadingFinish(driveId, dirId, normalizedFiles, normalizedFiles.length)
}

// 处理进入子文件夹
const handleEnterFolder = async (file: any) => {
  try {
    console.log('进入文件夹:', file.name, file)

    // 将当前文件夹信息推入导航堆栈
    if (currentFolderInfo.value) {
      folderNavigationStack.value.push({
        ...currentFolderInfo.value,
        files: [...folderFileList.value]
      })
    }

    const userId = file.user_id || currentFolderInfo.value?.userId || ''
    const driveId = file.drive_id || currentFolderInfo.value?.driveId || ''
    const fileId = file.file_id

    console.log('获取子文件夹内容:', { userId, driveId, fileId })

    // 构建子文件夹信息
    const subFolder = {
      id: fileId,
      fileId: fileId,
      name: file.name,
      driveId: driveId,
      userId: userId,
      path: file.path || fileId,
      parentFileId: currentFolderInfo.value?.fileId || currentFolderInfo.value?.id
    }

    let items: any[] = []

    // 检查是否为 WebDAV 驱动器
    if (isWebDavDrive(driveId)) {
      console.log('使用WebDAV API获取子文件夹文件列表')
      const connectionId = getWebDavConnectionId(driveId)
      const connection = getWebDavConnection(connectionId)

      if (!connection) {
        message.warning('WebDAV 连接不存在，请重新连接')
        return
      }

      const requestPath = fileId === '/' ? '/' : fileId
      const allItems = await listWebDavDirectory(connection, requestPath)
      items = allItems // WebDAV 已经返回了正确格式的数据
    }
    // 根据不同的网盘类型获取文件列表
    else if (isCloud123User(userId) || driveId === 'cloud123') {
      // 123云盘
      const { apiCloud123FileList, mapCloud123FileToAliModel } = await import('../cloud123/dirfilelist')
      const list = await apiCloud123FileList(userId, fileId, 100)
      items = list.map((item) => {
        const mapped = mapCloud123FileToAliModel(item)
        mapped.drive_id = driveId
        ;(mapped as any).user_id = userId
        return mapped
      })
      console.log('使用123云盘API获取子文件夹文件列表')
    } else if (isDrive115User(userId) || driveId === 'drive115') {
      // 115网盘
      const { apiDrive115FileList, mapDrive115FileToAliModel } = await import('../cloud115/dirfilelist')
      const list = await apiDrive115FileList(userId, fileId, 200, 0, true)
      items = list.map((item) => {
        const mapped = mapDrive115FileToAliModel(item, driveId)
        ;(mapped as any).user_id = userId
        return mapped
      })
      console.log('使用115网盘API获取子文件夹文件列表')
    } else if (isBaiduUser(userId) || driveId === 'baidu') {
      // 百度网盘
      const parentPath = file.path || file.file_id || '/'
      const list = await apiBaiduFileList(userId, parentPath, 'name', 0, 1000)
      items = list.map((item: any) => {
        const mapped = mapBaiduFileToAliModel(item, driveId, parentPath)
        ;(mapped as any).user_id = userId
        return mapped
      })
      console.log('使用百度网盘API获取子文件夹文件列表，路径:', parentPath)
    } else {
      // 阿里云盘（默认）
      const result = await AliDirFileList.ApiDirFileList(
        userId,
        driveId,
        fileId,
        file.name,
        'name asc',
        ''
      )
      items = result.items || []
      console.log('使用阿里云盘API获取子文件夹文件列表')
    }

    if (items && items.length >= 0) {
      showFolderFiles(items, subFolder)
    } else {
      console.log(`文件夹 ${file.name} 为空`)
      showFolderFiles([], subFolder)
    }

  } catch (error) {
    console.error('获取文件夹内容失败:', error)
    message.error('获取文件夹内容失败: ' + (error as Error).message)
  }
}

// 暴露方法给父组件
// 返回上级目录
const handleGoBack = () => {
  if (folderNavigationStack.value.length > 0) {
    const parentFolder = folderNavigationStack.value.pop()
    if (parentFolder) {
      currentFolderInfo.value = {
        id: parentFolder.id,
        fileId: parentFolder.fileId,
        name: parentFolder.name,
        driveId: parentFolder.driveId,
        userId: parentFolder.userId,
        path: parentFolder.path,
        parentFileId: parentFolder.parentFileId
      }
      folderFileList.value = parentFolder.files || []

      // 更新 store 状态
      const driveId = parentFolder.driveId || 'default'
      const dirId = parentFolder.fileId || parentFolder.id
      const userId = parentFolder.userId || ''

      mediaPanFileStore.mSaveDirFileLoading(driveId, dirId, parentFolder.name, '')
      mediaPanFileStore.mSaveDirFileLoadingFinish(driveId, dirId, parentFolder.files || [], (parentFolder.files || []).length)

      console.log('返回上级目录:', parentFolder.name)
    }
  }
}

const refreshLibrary = () => {
  // 清除导航堆栈
  folderNavigationStack.value = []
  // 刷新媒体库
}

// 生命周期
onMounted(() => {
  // 初始化媒体库
})

// 定义事件
const emit = defineEmits<{
  categoryDrillDown: [data: {
    categoryType: string
    categoryValue: string
    filter: {
      genre?: string
      rating?: string
      year?: string
    }
  }]
}>()

// 暴露给父组件的方法
defineExpose({
  showAddFolder,
  showFolderFiles,
  refreshLibrary
})
</script>

<style scoped>
.media-library {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-neutral-3);
}

.library-tabs {
  flex: 1;
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 0; /* 移除 padding，让子元素自己管理 */
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 16px;
}

.library-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.library-filters-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.view-toggle {
  margin-left: 8px;
}

.view-toggle .ant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.search-panel {
  padding: 32px 16px 20px;
  border-bottom: 1px solid var(--color-neutral-3);
  background: var(--color-bg-1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.search-panel-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--color-text-1);
}

.search-panel-input {
  width: 100%;
  max-width: 680px;
}

.search-panel-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-text-3);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 16px;
}

.media-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.media-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.media-item:hover {
  transform: translateY(-2px);
}

.media-poster {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-fill-2);
}

.media-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.watch-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 12px;
  background: rgba(0, 0, 0, 0.45);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.35);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 2;
}

.watch-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #f97316);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-3);
  font-size: 48px;
}

.rating-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(var(--primary-6), 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.media-info {
  margin-top: 8px;
}

.media-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.episode-suffix {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  white-space: nowrap;
}

.media-year {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 4px 0 0 0;
}

.media-path {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 6px 0 0 0;
  line-height: 1.45;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-genres {
  font-size: 12px;
  color: var(--color-text-2);
  margin: 4px 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-episode {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 4px 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-file-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.folder-header {
  padding: 16px 16px 12px 16px;
  border-bottom: 1px solid var(--color-neutral-3);
  flex-shrink: 0;
}

.folder-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.folder-info p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}

.folder-actions {
  display: flex;
  gap: 8px;
}

.pan-right-container {
  flex: 1;
  overflow: hidden;
}

/* 列表视图样式 */
.media-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.media-list-item {
  display: flex;
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.media-list-item:hover {
  background: var(--color-bg-3);
  border-color: var(--color-primary-light-4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.list-poster {
  width: 80px;
  height: 120px;
  flex-shrink: 0;
  margin-right: 16px;
}

.list-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.list-poster .poster-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-neutral-2);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-poster .poster-placeholder .iconfont {
  font-size: 32px;
  color: var(--color-text-4);
}

.list-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-main {
  flex: 1;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-1);
  line-height: 1.4;
}

.list-overview {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0;
  line-height: 1.5;
}

.list-path {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 6px 0 0;
  line-height: 1.5;
  word-break: break-all;
}

.list-episode {
  font-size: 13px;
  color: var(--color-text-3);
  margin: 6px 0 0;
  line-height: 1.4;
}

.list-progress {
  margin: 6px 0 0;
  color: var(--color-primary-6);
  font-size: 12px;
  font-weight: 600;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.list-type {
  background: var(--color-primary-light-4);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.list-year {
  color: var(--color-text-3);
}

.list-rating {
  color: var(--color-warning);
  display: flex;
  align-items: center;
  gap: 4px;
}

.list-genres {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.genre-tag {
  background: var(--color-neutral-2);
  color: var(--color-text-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.tv-info {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-3);
}

.tv-seasons,
.tv-episodes {
  background: var(--color-bg-3);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 分类聚合视图样式 */
.category-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;
}

/* 分类列表视图 - 横向卡片样式 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.category-list-card {
  position: relative;
  height: 120px;
  border-radius: 12px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.category-list-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.category-list-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.6) 100%
  );
  transition: opacity 0.3s ease;
}

.category-list-card:hover .category-list-overlay {
  opacity: 0.8;
}

.category-list-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 24px;
  color: white;
  z-index: 2;
}

.category-list-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.category-list-count {
  position: absolute;
  top: 20px;
  right: 24px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 响应式样式 */
@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }

  .category-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .category-list-card {
    height: 100px;
  }

  .category-list-content {
    padding: 16px 20px;
  }

  .category-list-title {
    font-size: 20px;
  }

  .category-list-count {
    top: 16px;
    right: 20px;
    padding: 6px 12px;
    font-size: 13px;
  }

  .library-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .library-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .library-filters {
    width: 100%;
    justify-content: flex-start;
  }

  .view-toggle {
    margin-left: 0;
  }

  /* 移动端列表视图调整 */
  .media-list-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-poster {
    width: 60px;
    height: 90px;
    margin-right: 12px;
    margin-bottom: 8px;
  }

  .list-overview {
    display: none; /* 移动端隐藏简介 */
  }

  .list-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
}

</style>

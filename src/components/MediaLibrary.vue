<template>
  <div class="media-library">
    <!-- 顶部导航 -->
    <div class="library-header">
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
        <div class="library-filters">
          <a-select v-model:value="selectedGenre" placeholder="按类型筛选" style="width: 120px; margin-right: 8px">
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option v-for="genre in mediaStore.genres" :key="genre" :value="genre">
              {{ genre }}
            </a-select-option>
          </a-select>

          <a-select v-model:value="selectedYear" placeholder="按年份筛选" style="width: 120px; margin-right: 8px">
            <a-select-option value="">全部年份</a-select-option>
            <a-select-option v-for="year in mediaStore.years" :key="year" :value="year.toString()">
              {{ year }}
            </a-select-option>
          </a-select>

          <a-select v-model:value="selectedRating" placeholder="按评分筛选" style="width: 120px">
            <a-select-option value="">全部评分</a-select-option>
            <a-select-option value="9-10">9-10分</a-select-option>
            <a-select-option value="8-9">8-9分</a-select-option>
            <a-select-option value="7-8">7-8分</a-select-option>
            <a-select-option value="6-7">6-7分</a-select-option>
            <a-select-option value="1-5">1-5分</a-select-option>
          </a-select>
        </div>

        <!-- 视图切换按钮 -->
        <div class="view-toggle">
          <a-button-group>
            <a-button
              :type="viewMode === 'grid' ? 'primary' : 'default'"
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
              :type="viewMode === 'list' ? 'primary' : 'default'"
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

    <!-- 内容区域 -->
    <div class="library-content">
      <!-- 加载状态 -->
      <div v-if="mediaStore.isScanning" class="loading-state">
        <a-spin />
        <p>正在扫描媒体文件... {{ mediaStore.scanProgress }}/{{ mediaStore.scanTotal }}</p>
      </div>

      <!-- 文件列表 - 当选择文件夹时显示 PanRight 组件 -->
      <div v-else-if="props.selectedFolder && folderFileList.length > 0" class="folder-file-list">
        <div class="folder-header">
          <h3>{{ currentFolderInfo?.name || props.selectedFolder.name }}</h3>
          <p>共 {{ folderFileList.length }} 个文件</p>
        </div>
        <div class="pan-right-container">
          <PanRight />
        </div>
      </div>

      <!-- 空状态 - 当选择文件夹但没有文件时 -->
      <div v-else-if="props.selectedFolder && folderFileList.length === 0" class="empty-state">
        <a-empty description="文件夹为空" />
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
              <h3 class="media-title" :title="item.name">{{ item.name }}</h3>
              <p v-if="item.year" class="media-year">{{ item.year }}</p>
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
                <h3 class="list-title">{{ item.name }}</h3>
                <p v-if="item.overview" class="list-overview">
                  {{ item.overview.length > 120 ? item.overview.substring(0, 120) + '...' : item.overview }}
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
              <div v-if="item.type === 'tv' && (item.seasons?.length || item.episodes?.length)" class="tv-info">
                <span v-if="item.seasons?.length" class="tv-seasons">
                  {{ item.seasons.length }} 季
                </span>
                <span v-if="item.episodes?.length" class="tv-episodes">
                  {{ item.episodes.length }} 集
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import { usePanFileStore } from '../store'
import PanRight from '../pan/PanRight.vue'
import type { MediaLibraryItem, MediaFilter } from '../types/media'

const props = defineProps<{
  activeCategory?: string
  selectedFolder?: any
  selectedGenre?: string
  selectedYear?: string
  selectedRating?: string
}>()

const mediaStore = useMediaLibraryStore()
const panFileStore = usePanFileStore()

// 状态
const activeTab = ref('recently-added')
const showAddFolderModal = ref(false)
const folderForm = ref({ name: '' })
const selectedGenre = ref('')
const selectedYear = ref('')
const selectedRating = ref('')
const viewMode = ref<'grid' | 'list'>('grid') // 添加视图模式状态

// 文件夹文件列表
const folderFileList = ref<any[]>([])
const currentFolderInfo = ref<any>(null)

// 计算属性
const filteredItems = computed(() => {
  let items: MediaLibraryItem[] = []

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
      items = [...mediaStore.continueWatching]
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
    case 'unmatched':
      items = [...mediaStore.unmatchedItems]
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
  }

  return mediaStore.filterItems(filter).filter(item => items.some(i => i.id === item.id))
})

// 方法
const openMedia = (item: MediaLibraryItem) => {
  console.log('Opening media:', item.name)
  // 这里可以集成播放器
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
  folderFileList.value = files
  currentFolderInfo.value = folder
  console.log(`显示文件夹 ${folder.name} 的 ${files.length} 个文件`)

  // 先设置当前目录信息
  panFileStore.mSaveDirFileLoading(
    folder.driveId || 'default',
    folder.fileId || folder.id,
    folder.name,
    ''
  )

  // 手动设置 ListDataRaw，因为 mSaveDirFileLoadingFinish 可能不会正确设置
  panFileStore.ListDataRaw = files

  // 再将文件数据同步到 panFileStore 以供 PanRight 组件使用
  panFileStore.mSaveDirFileLoadingFinish(
    folder.driveId || 'default',
    folder.fileId || folder.id,
    files,
    files.length
  )
}

// 暴露方法给父组件
const refreshLibrary = () => {
  // 刷新媒体库
}

// 生命周期
onMounted(() => {
  // 初始化媒体库
})

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
  justify-content: space-between;
  align-items: center;
}

.library-filters {
  display: flex;
  gap: 8px;
}

.view-toggle {
  margin-left: 16px;
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

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
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

.media-year {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 4px 0 0 0;
}

.media-genres {
  font-size: 12px;
  color: var(--color-text-2);
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

.folder-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.folder-header p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
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

/* 响应式样式 */
@media (max-width: 768px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
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
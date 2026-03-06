<template>
  <div class="media-library-view">
    <div class="library-layout">
      <!-- 左侧导航 -->
      <div class="library-sidebar">
        <MediaLibraryNav 
          ref="mediaNav"
          @folderSelected="handleFolderSelected"
          @categorySelected="handleCategorySelected"
          @genreSelected="handleGenreSelected"
          @yearSelected="handleYearSelected"
          @ratingSelected="handleRatingSelected"
          @refresh="handleRefresh"
        />
      </div>
      
      <!-- 右侧内容 -->
      <div class="library-content">
        <MediaLibrary
          ref="mediaLibrary"
          :activeCategory="activeCategory"
          :selectedFolder="selectedFolder"
          :selectedGenre="selectedGenre"
          :selectedYear="selectedYear"
          :selectedRating="selectedRating"
        />
      </div>
    </div>
    
    <!-- 扫描进度对话框 -->
    <a-modal
      v-model:visible="showScanProgress"
      title="扫描媒体文件"
      :closable="false"
      :mask-closable="false"
    >
      <template #footer>
        <!-- 无底部按钮 -->
      </template>
      <div class="scan-progress">
        <a-progress
          :percent="scanPercent"
          :show-info="true"
        />
        <p class="scan-info">
          正在扫描: {{ scanCurrent }}/{{ scanTotal }} 个文件
        </p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MediaLibraryNav from '../components/MediaLibraryNav.vue'
import MediaLibrary from '../components/MediaLibrary.vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import { usePanTreeStore } from '../store'
import { MediaScanner } from '../utils/mediaScanner'
import message from '../utils/message'
import type { MediaLibraryFolder } from '../types/media'

const mediaStore = useMediaLibraryStore()
const panTreeStore = usePanTreeStore()
const mediaScanner = MediaScanner.getInstance()

const mediaNav = ref()
const mediaLibrary = ref()

// 状态
const showScanProgress = ref(false)
const activeCategory = ref('recently-added')
const selectedFolder = ref<MediaLibraryFolder>()
const selectedGenre = ref('')
const selectedYear = ref('')
const selectedRating = ref('')
const scanPercent = computed(() => {
  if (mediaStore.scanTotal === 0) return 0
  return Math.round((mediaStore.scanProgress / mediaStore.scanTotal) * 100)
})
const scanCurrent = computed(() => mediaStore.scanProgress)
const scanTotal = computed(() => mediaStore.scanTotal)

// 方法
const handleFolderSelected = async (folder: MediaLibraryFolder) => {
  selectedFolder.value = folder
  activeCategory.value = ''
  selectedGenre.value = ''
  selectedYear.value = ''
  selectedRating.value = ''
  console.log('Selected folder:', folder)

  // 直接加载文件夹内容并显示
  await loadFolderContent(folder)
}

// 加载文件夹内容 - 直接显示文件列表
const loadFolderContent = async (folder: MediaLibraryFolder) => {
  try {
    console.log('Loading folder file list:', folder.name, 'ID:', folder.id)

    // 使用 fileId 字段，如果不存在则从复合ID中提取
    const fileId = folder.fileId || (folder.id.includes('_') ? folder.id.split('_')[1] : folder.id)

    console.log('Using file_id:', fileId)

    // 使用 AliDirFileList.ApiDirFileList 获取文件夹内容
    const AliDirFileList = (await import('../aliapi/dirfilelist')).default

    const result = await AliDirFileList.ApiDirFileList(
      panTreeStore.user_id,
      folder.driveId,
      fileId, // 使用正确的file_id
      folder.name,
      'name asc', // 排序
      '', // type - 空字符串表示所有类型
      undefined, // albumID
      false // refresh
    )

    if (result && result.items) {
      console.log(`文件夹 ${folder.name} 包含 ${result.items.length} 个项目`)

      // 直接将文件列表传递给 MediaLibrary 组件显示
      mediaLibrary.value?.showFolderFiles(result.items, folder)

    } else {
      message.info('文件夹为空或加载失败')
    }
  } catch (error) {
    console.error('加载文件夹内容失败:', error)
    message.error('加载文件夹内容失败')
  }
}

// 检查是否为视频文件
const isVideoFile = (filename: string): boolean => {
  const VIDEO_EXTENSIONS = new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
    '.mpg', '.mpeg', '.3gp', '.rmvb', '.asf', '.divx', '.xvid', '.ts',
    '.m2ts', '.mts', '.vob', '.ogv', '.dv'
  ])
  const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '')
  return VIDEO_EXTENSIONS.has(ext)
}

// 处理从API获取的视频文件
const processVideoFileFromApi = async (apiFile: any, folder: MediaLibraryFolder) => {
  try {
    // 转换API文件格式为DriveFileItem
    const driveFile = {
      id: apiFile.file_id,
      name: apiFile.name,
      path: `/${apiFile.name}`, // 构造路径
      driveId: apiFile.drive_id,
      driveServerId: folder.driveServerId,
      fileSize: apiFile.size || 0,
      contentHash: apiFile.description || '', // 使用 description 替代 sha1
      thumbnailLink: apiFile.thumbnail || undefined,
      videoDuration: apiFile.media_duration,
      height: apiFile.media_height,
      cloudType: undefined
    }

    // 创建媒体项目（暂时作为未匹配项目）
    const mediaItem = {
      id: `${folder.driveServerId}_${apiFile.file_id}`,
      parentId: folder.name,
      folderId: folder.id,
      folderPath: folder.path,
      type: 'unmatched' as const,
      name: apiFile.name.replace(/\.[^/.]+$/, ''), // 移除扩展名
      posterUrl: apiFile.thumbnail || undefined,
      backdropUrl: apiFile.thumbnail || undefined,
      genres: [] as string[],
      driveFiles: [driveFile],
      addedAt: new Date()
    }

    mediaStore.addMediaItem(mediaItem)
    console.log(`✅ 已添加: ${apiFile.name}`)
  } catch (error) {
    console.error(`处理视频文件失败: ${apiFile.name}`, error)
  }
}

const handleCategorySelected = (category: string) => {
  activeCategory.value = category
  selectedFolder.value = undefined
  selectedGenre.value = ''
  selectedYear.value = ''
  selectedRating.value = ''
  console.log('Selected category:', category)
}

const handleGenreSelected = (genre: string) => {
  selectedGenre.value = genre
  console.log('Selected genre:', genre)
}

const handleYearSelected = (year: string) => {
  selectedYear.value = year
  console.log('Selected year:', year)
}

const handleRatingSelected = (rating: string) => {
  selectedRating.value = rating
  console.log('Selected rating:', rating)
}

const handleRefresh = async () => {
  console.log('Refreshing media library...')
  message.info('刷新功能待实现')
}

const addFolderToLibrary = async (folder: any, folderName: string) => {
  console.log('Adding folder to library:', folderName)
  message.info('添加到媒体库功能待实现')
}

// 生命周期
onMounted(() => {
  // 初始化媒体库
  console.log('Media library initialized')
})

// 暴露方法给父组件
defineExpose({
  addFolderToLibrary
})
</script>

<style scoped>
.media-library-view {
  height: 100%;
  width: 100%;
}

.library-layout {
  display: flex;
  height: 100%;
}

.library-sidebar {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-neutral-3);
}

.library-content {
  flex: 1;
  overflow: hidden;
}

.scan-progress {
  text-align: center;
}

.scan-info {
  margin-top: 12px;
  color: var(--color-text-2);
}

@media (max-width: 768px) {
  .library-sidebar {
    width: 240px;
  }
}
</style>
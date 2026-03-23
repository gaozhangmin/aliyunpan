<template>
  <div class="media-library-view">
    <MySplit :visible="props.navVisible ?? true">
      <template #first>
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
            @categoryDrillDown="handleCategoryDrillDown"
          />
        </div>
      </template>

      <template #second>
        <!-- 右侧内容 -->
        <div class="library-content">
          <MediaLibrary
            ref="mediaLibrary"
            :activeCategory="activeCategory"
            :selectedFolder="selectedFolder"
            :selectedGenre="selectedGenre"
            :selectedYear="selectedYear"
            :selectedRating="selectedRating"
            @categoryDrillDown="handleCategoryDrillDown"
          />
        </div>
      </template>
    </MySplit>
    
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MediaLibraryNav from '../components/MediaLibraryNav.vue'
import MediaLibrary from '../components/MediaLibrary.vue'
import MySplit from '../layout/MySplit.vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import { usePanTreeStore } from '../store'
import { MediaScanner } from '../utils/mediaScanner'
import UserDAL from '../user/userdal'
import message from '../utils/message'
import type { MediaLibraryFolder } from '../types/media'
import { isAliyunUser, isBaiduUser, isCloud123User, isDrive115User } from '../aliapi/utils'
import AliDirFileList from '../aliapi/dirfilelist'
import { apiBaiduFileList, mapBaiduFileToAliModel } from '../cloudbaidu/dirfilelist'
import { getWebDavConnection, getWebDavConnectionId, isWebDavDrive, listWebDavDirectory } from '../utils/webdavClient'

const mediaStore = useMediaLibraryStore()
const panTreeStore = usePanTreeStore()
const mediaScanner = MediaScanner.getInstance()

const mediaNav = ref()
const mediaLibrary = ref()

// Props
const props = defineProps<{
  navVisible?: boolean
}>()

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

const resolveFolderUserId = async (folder: MediaLibraryFolder): Promise<string> => {
  if (folder.userId) return folder.userId
  const userList = await UserDAL.GetUserListFromDB()
  const matched = userList.find((token) => {
    if (folder.driveId === 'cloud123' || folder.driveServerId === 'cloud123') return isCloud123User(token)
    if (folder.driveId === 'drive115' || folder.driveServerId === 'drive115') return isDrive115User(token)
    if (folder.driveId === 'baidu' || folder.driveServerId === 'baidu') return isBaiduUser(token)
    return isAliyunUser(token)
  })
  return matched?.user_id || panTreeStore.user_id
}

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
    if (folder.driveId === 'local') {
      await loadLocalFolderContent(folder)
      return
    }
    if (isWebDavDrive(folder.driveId, folder.driveServerId)) {
      const connectionId = folder.userId || getWebDavConnectionId(folder.driveId)
      const connection = getWebDavConnection(connectionId || '')
      if (!connection) {
        message.error('WebDAV 连接信息不存在，请重新连接')
        return
      }
      const items = await listWebDavDirectory(connection, folder.path || folder.fileId || '/')
      items.forEach((item: any) => { item.user_id = folder.userId || connection.id })
      if (items.length > 0) {
        mediaLibrary.value?.showFolderFiles(items, folder)
      } else {
        console.log(`WebDAV 文件夹 ${folder.name} 为空或加载失败`)
        message.info('文件夹为空或加载失败')
      }
      return
    }
    console.log('Loading folder file list:', folder.name, 'ID:', folder.id, 'Drive:', folder.driveId, 'Server:', folder.driveServerId)

    // 使用 fileId 字段，如果不存在则从复合ID中提取
    const fileId = folder.fileId || (folder.id.includes('_') ? folder.id.split('_')[1] : folder.id)
    const userId = await resolveFolderUserId(folder)
    const driveId = folder.driveId

    console.log('Using file_id:', fileId, 'userId:', userId, 'driveId:', driveId)

    let items: any[] = []

    if (isCloud123User(userId) || driveId === 'cloud123') {
      // 123云盘
      const { apiCloud123FileList, mapCloud123FileToAliModel } = await import('../cloud123/dirfilelist')
      const list = await apiCloud123FileList(userId, fileId, 100)
      items = list.map((item) => {
        const mapped = mapCloud123FileToAliModel(item)
        mapped.drive_id = driveId
        ;(mapped as any).user_id = userId
        return mapped
      })
      console.log('使用123云盘API获取文件列表')
    } else if (isDrive115User(userId) || driveId === 'drive115') {
      // 115网盘
      const { apiDrive115FileList, mapDrive115FileToAliModel } = await import('../cloud115/dirfilelist')
      const list = await apiDrive115FileList(userId, fileId, 200, 0, true)
      items = list.map((item) => { const mapped = mapDrive115FileToAliModel(item, driveId); (mapped as any).user_id = userId; return mapped })
      console.log('使用115网盘API获取文件列表')
    } else if (isBaiduUser(userId) || driveId === 'baidu') {
      // 百度网盘 - 需要使用路径而不是fileId
      const parentPath = folder.path || folder.fileId || '/'
      const list = await apiBaiduFileList(userId, parentPath, 'name', 0, 1000)
      items = list.map((item) => { const mapped = mapBaiduFileToAliModel(item, driveId, parentPath); (mapped as any).user_id = userId; return mapped })
      console.log('使用百度网盘API获取文件列表，路径:', parentPath)
    } else {
      // 阿里云盘（默认）
      const result = await AliDirFileList.ApiDirFileList(
        userId,
        driveId,
        fileId,
        folder.name,
        'name asc',
        '',
        undefined,
        false
      )
      items = (result?.items || []).map((item: any) => ({ ...item, user_id: userId }))
      console.log('使用阿里云盘API获取文件列表')
    }

    if (items && items.length > 0) {
      console.log(`文件夹 ${folder.name} 包含 ${items.length} 个项目`)
      // 直接将文件列表传递给 MediaLibrary 组件显示
      mediaLibrary.value?.showFolderFiles(items, folder)
    } else {
      console.log(`文件夹 ${folder.name} 为空或加载失败`)
      message.info('文件夹为空或加载失败')
    }
  } catch (error) {
    console.error('加载文件夹内容失败:', error)
    message.error('加载文件夹内容失败')
  }
}

const loadLocalFolderContent = async (folder: MediaLibraryFolder) => {
  try {
    const fs = window.require?.('fs')
    const path = window.require?.('path')
    if (!fs || !path) {
      message.error('当前环境不支持浏览本地文件夹')
      return
    }

    const folderPath = folder.path || folder.fileId
    if (!folderPath) {
      message.error('本地文件夹路径为空')
      return
    }

    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
    const items = []
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name)
      const stat = await fs.promises.stat(fullPath)
      items.push({
        name: entry.name,
        file_id: fullPath,
        isDir: entry.isDirectory(),
        ext: entry.isDirectory() ? '' : path.extname(entry.name).replace('.', ''),
        size: stat.size || 0,
        category: entry.isDirectory() ? 'folder' : 'video',
        description: '',
        drive_id: 'local',
        parent_file_id: folderPath
      })
    }

    mediaLibrary.value?.showFolderFiles(items, folder)
  } catch (error) {
    console.error('加载本地文件夹失败:', error)
    message.error('加载本地文件夹失败')
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
      userId: apiFile.user_id || folder.userId,
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

// 处理分类内钻取
const handleCategoryDrillDown = (data: {
  categoryType: string
  categoryValue: string
  filter: {
    genre?: string
    rating?: string
    year?: string
  }
}) => {
  console.log('Category drill down:', data)

  // 根据钻取数据更新筛选条件
  if (data.filter.genre) {
    selectedGenre.value = data.filter.genre
  }
  if (data.filter.rating) {
    selectedRating.value = data.filter.rating
  }
  if (data.filter.year) {
    selectedYear.value = data.filter.year
  }

  // 切换到对应的媒体内容视图
  switch (data.categoryType) {
    case 'genre':
      activeCategory.value = 'search' // 切换到搜索视图以显示筛选结果
      break
    case 'rating':
      activeCategory.value = 'search'
      break
    case 'year':
      activeCategory.value = 'search'
      break
    default:
      activeCategory.value = 'search'
  }

  // 清除选中的文件夹
  selectedFolder.value = undefined
}

const handleRefresh = async () => {
  console.log('Refreshing media library...')
  message.info('刷新功能待实现')
}


const addFolderToLibrary = async (folder: any, folderName: string) => {
  console.log('Adding folder to library:', folderName)
  message.info('添加到媒体库功能待实现')
}

let syncTimer: number | undefined
let lastContinueWatchingRaw = ''

const syncContinueWatchingFromStorage = () => {
  try {
    const raw = localStorage.getItem('MediaLibrary_ContinueWatching')
    if (!raw) return
    if (raw === lastContinueWatchingRaw) return
    lastContinueWatchingRaw = raw
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const normalized = parsed.map((item: any) => {
        if (item.addedAt && typeof item.addedAt === 'string') item.addedAt = new Date(item.addedAt)
        if (item.lastWatched && typeof item.lastWatched === 'string') item.lastWatched = new Date(item.lastWatched)
        if (item.watchProgress !== undefined && item.watchProgress !== null) {
          item.watchProgress = typeof item.watchProgress === 'string' ? parseFloat(item.watchProgress) : Number(item.watchProgress)
        }
        return item
      })
      mediaStore.continueWatching = normalized

      // 同步到 mediaItems，确保进度条/文本及时更新
      normalized.forEach((cw: any) => {
        const index = mediaStore.mediaItems.findIndex(item => item.id === cw.id)
        if (index >= 0) {
          mediaStore.mediaItems[index] = {
            ...mediaStore.mediaItems[index],
            watchProgress: cw.watchProgress,
            lastWatched: cw.lastWatched
          }
        }
      })
    }
  } catch (error) {
    console.error('同步继续观看失败:', error)
  }
}

const handleStorageSync = (event: StorageEvent) => {
  if (event.key !== 'MediaLibrary_ContinueWatching') return
  syncContinueWatchingFromStorage()
}

// 生命周期
onMounted(() => {
  // 初始化媒体库
  console.log('Media library initialized')
  window.addEventListener('storage', handleStorageSync)
  syncContinueWatchingFromStorage()
  syncTimer = window.setInterval(syncContinueWatchingFromStorage, 500)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageSync)
  if (syncTimer) window.clearInterval(syncTimer)
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

.library-sidebar {
  height: 100%;
  border-right: 1px solid var(--color-neutral-3);
}

.library-content {
  flex: 1;
  overflow: hidden;
  height: 100%;
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
    border-right: 1px solid var(--color-neutral-3);
  }
}
</style>

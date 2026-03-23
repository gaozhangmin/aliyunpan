<template>
  <div class="media-library-nav">
    <!-- 扫描进度 -->
    <div v-if="mediaStore.isScanning" class="scan-progress-section">
      <div class="scan-header">
        <i class="iconfont iconreload-1-icon spin"></i>
        <span>正在扫描...</span>
      </div>
      <a-progress
        :percent="scanPercent"
        :show-info="false"
        :stroke-width="4"
        size="small"
      />
      <div class="scan-info">
        {{ mediaStore.scanProgress }}/{{ mediaStore.scanTotal }} 个文件
      </div>
    </div>

    <!-- 媒体库标题 -->
    <div class="media-library-title">
      <h2>媒体库</h2>
    </div>

    <!-- 媒体库主菜单 -->
    <div class="nav-section">
      <div class="nav-items">
        <!-- 搜索 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'search' }"
          @click="handleCategoryClick('search')"
        >
          <i class="iconfont iconsearch"></i>
          <span>搜索</span>
        </div>

        <!-- 继续观看 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'continue-watching' }"
          @click="handleCategoryClick('continue-watching')"
        >
          <i class="iconfont iconstart"></i>
          <span>继续观看</span>
          <span v-if="mediaStore.continueWatching.length > 0" class="count">
            {{ mediaStore.continueWatching.length }}
          </span>
        </div>

        <!-- 最近添加 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'recently-added' }"
          @click="handleCategoryClick('recently-added')"
        >
          <i class="iconfont iconplus"></i>
          <span>最近添加</span>
          <span v-if="mediaStore.recentlyAdded.length > 0" class="count">
            {{ mediaStore.recentlyAdded.length }}
          </span>
        </div>

        <!-- 电影 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'movies' }"
          @click="handleCategoryClick('movies')"
        >
          <i class="iconfont iconfile_video"></i>
          <span>电影</span>
          <span v-if="mediaStore.movies.length > 0" class="count">
            {{ mediaStore.movies.length }}
          </span>
        </div>

        <!-- 电视剧 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'tv-shows' }"
          @click="handleCategoryClick('tv-shows')"
        >
          <i class="iconfont iconshipin"></i>
          <span>电视剧</span>
          <span v-if="mediaStore.tvShows.length > 0" class="count">
            {{ mediaStore.tvShows.length }}
          </span>
        </div>

        <!-- 纪录片 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'documentary' }"
          @click="handleCategoryClick('documentary')"
        >
          <i class="iconfont iconluxiang"></i>
          <span>纪录片</span>
        </div>

        <!-- 动画 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'animation' }"
          @click="handleCategoryClick('animation')"
        >
          <i class="iconfont iconbiaozhang"></i>
          <span>动画</span>
        </div>

        <!-- 未匹配 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'unmatched' }"
          @click="handleCategoryClick('unmatched')"
        >
          <i class="iconfont iconinfo_circle"></i>
          <span>未匹配</span>
          <span v-if="mediaStore.unmatchedItems.length > 0" class="count">
            {{ mediaStore.unmatchedItems.length }}
          </span>
        </div>

        <!-- 未观看 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'unwatched' }"
          @click="handleCategoryClick('unwatched')"
        >
          <i class="iconfont iconclose"></i>
          <span>未观看</span>
        </div>

        <!-- 收藏 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'favorites' }"
          @click="handleCategoryClick('favorites')"
        >
          <i class="iconfont iconcrown3"></i>
          <span>收藏</span>
        </div>

        <!-- 播放列表 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'playlist' }"
          @click="handleCategoryClick('playlist')"
        >
          <i class="iconfont iconlist"></i>
          <span>播放列表</span>
        </div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="nav-section">
      <div class="nav-header">
        <span>分类</span>
      </div>

      <div class="nav-items">
        <!-- 类型 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'genres' }"
          @click="handleCategoryClick('genres')"
        >
          <i class="iconfont iconwbiaoqian"></i>
          <span>类型</span>
          <span v-if="mediaStore.genres.length > 0" class="count">
            {{ mediaStore.genres.length }}
          </span>
        </div>

        <!-- 评分 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'ratings' }"
          @click="handleCategoryClick('ratings')"
        >
          <i class="iconfont iconcrown2"></i>
          <span>评分</span>
          <span v-if="mediaStore.ratingCategories.length > 0" class="count">
            {{ mediaStore.ratingCategories.length }}
          </span>
        </div>

        <!-- 年份 -->
        <div
          class="nav-item"
          :class="{ active: activeCategory === 'years' }"
          @click="handleCategoryClick('years')"
        >
          <i class="iconfont iconcalendar"></i>
          <span>年份</span>
          <span v-if="mediaStore.years.length > 0" class="count">
            {{ mediaStore.years.length }}
          </span>
        </div>
      </div>
    </div>

    <!-- 媒体库文件夹列表 -->
    <div class="nav-section" v-if="mediaStore.folders.length > 0">
      <div class="nav-header">
        <i class="iconfont iconfolder"></i>
        <span>文件源</span>
      </div>

      <div class="nav-items">
        <div
          v-for="folder in mediaStore.folders"
          :key="folder.id"
          class="nav-item folder-item"
          :class="{ active: selectedFolder?.id === folder.id }"
          @click="handleFolderClick(folder)"
          @contextmenu="handleFolderRightClick($event, folder)"
        >
          <i class="iconfont iconfolder"></i>
          <div class="folder-main">
            <span class="folder-name">{{ folder.name }}</span>
            <span class="folder-source" :class="getFolderSourceClass(folder)">
              {{ getFolderSourceLabel(folder) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="nav-actions">
      <a-button
        type="text"
        size="small"
        @click="handleImportLocalFolder"
        :loading="mediaStore.isScanning"
      >
        <i class="iconfont iconfolder"></i>
        导入本地文件夹
      </a-button>
      <a-button
        type="text"
        size="small"
        @click="showWebDavModal = true"
        :loading="webDavLoading"
      >
        <i class="iconfont iconlink"></i>
        连接到 WebDAV
      </a-button>
    </div>

    <!-- 文件夹右键菜单 -->
    <a-dropdown
      id='medialibrarymenu'
      class='rightmenu'
      :popup-visible='showFolderMenu'
      :style="{
        position: 'fixed',
        left: menuPosition.x + 'px',
        top: menuPosition.y + 'px',
        zIndex: 9999,
        opacity: showFolderMenu ? 1 : 0
      }"
      @popup-visible-change="handleMenuClose"
    >
      <div style="width: 1px; height: 1px; visibility: hidden;" />
      <template #content>
        <a-doption @click="handleDeleteFolder" class="danger">
          <template #icon><i class='iconfont icondelete' /></template>
          <template #default>从媒体库删除</template>
        </a-doption>
      </template>
    </a-dropdown>

    <a-modal
      v-model:visible="showWebDavModal"
      title="连接到 WebDAV"
      :ok-loading="webDavLoading"
      @ok="handleConnectWebDav"
    >
      <a-form :model="webDavForm" layout="vertical">
        <a-form-item field="name" label="名称">
          <a-input v-model="webDavForm.name" placeholder="例如：NAS 影视库" allow-clear />
        </a-form-item>
        <a-form-item field="url" label="服务器地址">
          <a-input v-model="webDavForm.url" placeholder="例如：http://127.0.0.1:5244/dav" allow-clear />
        </a-form-item>
        <a-form-item field="username" label="用户名">
          <a-input v-model="webDavForm.username" allow-clear />
        </a-form-item>
        <a-form-item field="password" label="密码">
          <a-input-password v-model="webDavForm.password" allow-clear />
        </a-form-item>
        <a-form-item field="rootPath" label="挂载路径">
          <a-input v-model="webDavForm.rootPath" placeholder="默认：/" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import type { MediaLibraryFolder } from '../types/media'
import { Modal } from '@arco-design/web-vue'
import { MediaScanner } from '../utils/mediaScanner'
import message from '../utils/message'
import { createWebDavConnection, getWebDavConnections, saveWebDavConnection, testWebDavConnection } from '../utils/webdavClient'

const mediaStore = useMediaLibraryStore()
const mediaScanner = MediaScanner.getInstance()

// 状态
const activeCategory = ref('recently-added')
const selectedFolder = ref<MediaLibraryFolder | null>(null)
const selectedGenre = ref('')
const selectedYear = ref('')
const selectedRating = ref('')
const showAddFolderModal = ref(false)
const showWebDavModal = ref(false)
const webDavLoading = ref(false)
const addFolderForm = ref({
  folderId: '',
  name: ''
})
const webDavForm = ref({
  name: '',
  url: '',
  username: '',
  password: '',
  rootPath: '/'
})

// 右键菜单状态
const showFolderMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const contextMenuFolder = ref<MediaLibraryFolder | null>(null)

// 计算属性
const folderTreeData = computed(() => {
  // 这里应该从实际的文件夹结构生成
  return [
    {
      title: '备份盘',
      value: 'backup',
      children: [
        { title: '电影', value: 'backup_movies' },
        { title: '电视剧', value: 'backup_tv' }
      ]
    },
    {
      title: '资源盘',
      value: 'resource',
      children: [
        { title: '电影', value: 'resource_movies' },
        { title: '电视剧', value: 'resource_tv' }
      ]
    }
  ]
})

// 方法
const selectFolder = (folder: MediaLibraryFolder) => {
  selectedFolder.value = folder
  selectedGenre.value = ''
  selectedYear.value = ''
  selectedRating.value = ''
  activeCategory.value = ''
  
  // 触发父组件更新
  emit('folderSelected', folder)
}

// 计算属性
const scanPercent = computed(() => {
  if (mediaStore.scanTotal === 0) return 0
  const raw = Math.round((mediaStore.scanProgress / mediaStore.scanTotal) * 100)
  return Math.min(100, Math.max(0, raw))
})

// 方法
const handleCategoryClick = (category: string) => {
  // 判断是否为分类聚合类型
  const aggregationCategories = ['genres', 'ratings', 'years']

  if (aggregationCategories.includes(category)) {
    // 分类聚合模式：显示分类卡片网格
    activeCategory.value = category
    selectedFolder.value = null
    selectedGenre.value = ''
    selectedYear.value = ''
    selectedRating.value = ''
    emit('categorySelected', category)
  } else {
    // 直接筛选模式：显示具体媒体内容
    activeCategory.value = category
    selectedFolder.value = null
    selectedGenre.value = ''
    selectedYear.value = ''
    selectedRating.value = ''
    emit('categorySelected', category)
    if (category === 'documentary') emit('genreSelected', '99')
    if (category === 'animation') emit('genreSelected', '16')
  }
}

const handleFolderClick = (folder: MediaLibraryFolder) => {
  selectedFolder.value = folder
  activeCategory.value = ''
  console.log('Folder clicked:', folder.name, 'ID:', folder.id)
  emit('folderSelected', folder)
}

const isWebDavFolderSource = (folder: MediaLibraryFolder) => {
  const connectionIds = new Set(getWebDavConnections().map(item => item.id))
  return folder.driveServerId === 'webdav'
    || (folder.driveId || '').startsWith('webdav:')
    || (!!folder.userId && connectionIds.has(folder.userId))
    || folder.id.startsWith('webdav_')
}

const getFolderSourceLabel = (folder: MediaLibraryFolder) => {
  if (isWebDavFolderSource(folder)) return 'WebDAV'
  if (folder.driveId === 'local' || folder.driveServerId === 'local') return '本地'
  if (folder.driveId === 'cloud123' || folder.driveServerId === 'cloud123') return '123'
  if (folder.driveId === 'drive115' || folder.driveServerId === 'drive115') return '115'
  if (folder.driveId === 'baidu' || folder.driveServerId === 'baidu') return '百度'
  return '阿里'
}

const getFolderSourceClass = (folder: MediaLibraryFolder) => {
  if (isWebDavFolderSource(folder)) return 'source-webdav'
  if (folder.driveId === 'local' || folder.driveServerId === 'local') return 'source-local'
  if (folder.driveId === 'cloud123' || folder.driveServerId === 'cloud123') return 'source-123'
  if (folder.driveId === 'drive115' || folder.driveServerId === 'drive115') return 'source-115'
  if (folder.driveId === 'baidu' || folder.driveServerId === 'baidu') return 'source-baidu'
  return 'source-aliyun'
}

// 处理文件夹右键菜单
const handleFolderRightClick = (event: MouseEvent, folder: MediaLibraryFolder) => {
  event.preventDefault()
  contextMenuFolder.value = folder
  menuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  showFolderMenu.value = true
}

// 关闭右键菜单
const handleMenuClose = () => {
  showFolderMenu.value = false
  contextMenuFolder.value = null
}

// 删除文件夹
const handleDeleteFolder = () => {
  if (!contextMenuFolder.value) return

  const folder = contextMenuFolder.value
  Modal.confirm({
    title: '删除文件夹',
    content: `确定要从媒体库删除"${folder.name}"文件夹吗？这将删除该文件夹及其所有已刮削的媒体信息。`,
    okText: '删除',
    okButtonProps: { status: 'danger' },
    cancelText: '取消',
    onOk: () => {
      // 从媒体库删除文件夹和相关媒体
      mediaStore.removeFolder(folder.id)
      console.log(`已删除文件夹: ${folder.name}`)

      // 如果当前选中的是被删除的文件夹，清除选择
      if (selectedFolder.value?.id === folder.id) {
        selectedFolder.value = null
        activeCategory.value = 'recently-added'
        emit('categorySelected', 'recently-added')
      }

      handleMenuClose()
    }
  })
}

const selectGenre = (genre: string) => {
  selectedGenre.value = selectedGenre.value === genre ? '' : genre
  emit('genreSelected', selectedGenre.value)
}

const selectYear = (year: number) => {
  selectedYear.value = selectedYear.value === year.toString() ? '' : year.toString()
  emit('yearSelected', selectedYear.value)
}

const selectRating = (rating: string) => {
  selectedRating.value = selectedRating.value === rating ? '' : rating
  emit('ratingSelected', selectedRating.value)
}

const handleImportLocalFolder = () => {
  if (mediaStore.isScanning) return
  if (window.WebShowOpenDialogSync) {
    window.WebShowOpenDialogSync(
      {
        title: '选择本地媒体文件夹',
        buttonLabel: '导入',
        properties: ['openDirectory', 'createDirectory']
      },
      async (result: string[] | undefined) => {
        if (!result || !result[0]) return
        const folderPath = result[0]
        try {
          await mediaScanner.scanLocalFolder(folderPath)
        } catch (error) {
          console.error('导入本地文件夹失败:', error)
          message.error('导入失败，请稍后重试')
        }
      }
    )
  } else {
    message.error('当前环境不支持选择本地文件夹')
  }
}

const handleConnectWebDav = async () => {
  const form = webDavForm.value
  if (!form.url.trim() || !form.username.trim() || !form.password.trim()) {
    message.error('请填写完整的 WebDAV 连接信息')
    return
  }

  webDavLoading.value = true
  try {
    const connection = createWebDavConnection(form)
    await testWebDavConnection(connection)
    saveWebDavConnection(connection)
    mediaStore.addFolder({
      id: `webdav_webdav:${connection.id}_/`,
      fileId: '/',
      name: connection.name,
      path: '/',
      userId: connection.id,
      driveId: `webdav:${connection.id}`,
      driveServerId: 'webdav',
      scanDate: new Date(),
      itemCount: 0
    })
    await mediaScanner.scanWebDavConnection(connection)
    message.success('WebDAV 连接成功，已开始扫描视频元数据')
    showWebDavModal.value = false
    webDavForm.value = {
      name: '',
      url: '',
      username: '',
      password: '',
      rootPath: '/'
    }
  } catch (error: any) {
    console.error('连接 WebDAV 服务器失败:', error)
    message.error(`连接 WebDAV 服务器失败: ${error?.message || '未知错误'}`)
  } finally {
    webDavLoading.value = false
  }
}


const handleAddFolder = () => {
  // 这里需要调用扫描服务
  console.log('Adding folder:', addFolderForm.value)
  showAddFolderModal.value = false
  addFolderForm.value = { folderId: '', name: '' }
}

// 暴露方法
const showAddFolderDialog = () => {
  showAddFolderModal.value = true
}

// 事件
const emit = defineEmits([
  'folderSelected',
  'categorySelected',
  'genreSelected',
  'yearSelected',
  'ratingSelected',
  'refresh',
  'categoryDrillDown'
])

// 暴露给父组件的方法
defineExpose({
  showAddFolderDialog
})

// 添加全局点击监听器来关闭右键菜单
const handleGlobalClick = (event: MouseEvent) => {
  // 检查点击是否在菜单外部
  const target = event.target as HTMLElement
  if (!target.closest('.media-library-menu')) {
    showFolderMenu.value = false
  }
}

onMounted(() => {
  const savedConnections = getWebDavConnections()
  for (const connection of savedConnections) {
    const folderId = `webdav_webdav:${connection.id}_/`
    const exists = mediaStore.folders.some(folder => folder.id === folderId)
    if (!exists) {
      mediaStore.addFolder({
        id: folderId,
        fileId: '/',
        name: connection.name,
        path: '/',
        userId: connection.id,
        driveId: `webdav:${connection.id}`,
        driveServerId: 'webdav',
        scanDate: new Date(connection.createdAt),
        itemCount: 0
      })
    }
  }
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.media-library-nav {
  height: 100%;
  background-color: var(--color-bg-1);
  border-right: 1px solid var(--color-neutral-3);
  overflow-y: auto;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.media-library-title {
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid var(--color-neutral-3);
  background: linear-gradient(135deg, var(--color-bg-1), var(--color-bg-2));
}

.media-library-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-1);
  line-height: 1.2;
  letter-spacing: -0.5px;
}


.scan-progress-section {
  padding: 16px;
  margin: 16px 16px 0 16px;
  background: linear-gradient(135deg, var(--color-primary-light-3), var(--color-primary-light-2));
  border-radius: 12px;
  border: 1px solid var(--color-primary-light-1);
  box-shadow: 0 4px 12px rgba(var(--primary-6), 0.15);
}

.scan-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-6);
}

.scan-info {
  font-size: 12px;
  color: var(--color-text-2);
  text-align: center;
  margin-top: 8px;
  font-weight: 500;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.nav-section {
  margin-bottom: 28px;
}

.nav-section:first-child {
  margin-top: 20px;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.nav-header i {
  font-size: 16px;
  width: 16px;
  text-align: center;
  color: var(--color-primary-6);
}

.nav-items {
  padding: 0 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  margin-bottom: 6px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  background: transparent;
  min-width: 0;
  white-space: nowrap;
}

.nav-item:hover {
  background: linear-gradient(135deg, var(--color-neutral-2), var(--color-fill-2));
  color: var(--color-text-1);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--color-primary-light-2), var(--color-primary-light-3));
  color: var(--color-primary-6);
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(var(--primary-6), 0.2);
  transform: translateX(4px);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 28px;
  background: linear-gradient(to bottom, var(--color-primary-6), var(--color-primary-5));
  border-radius: 0 2px 2px 0;
  box-shadow: 0 2px 4px rgba(var(--primary-6), 0.3);
}

.nav-item i {
  width: 22px;
  height: 22px;
  font-size: 20px;
  text-align: center;
  line-height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: transform 0.2s ease;
}

.nav-item:hover i,
.nav-item.active i {
  transform: scale(1.1);
}

.nav-item span:first-of-type {
  flex: 1;
  line-height: 1.4;
  font-weight: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-item .count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-neutral-4);
  color: var(--color-text-2);
  padding: 4px 10px;
  border-radius: 20px;
  min-width: 24px;
  text-align: center;
  line-height: 1.2;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.nav-item.active .count {
  background: var(--color-primary-6);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--primary-6), 0.4);
}

.nav-item .count.error {
  background: linear-gradient(135deg, var(--color-danger-6), var(--color-danger-5));
  color: white;
  box-shadow: 0 2px 8px rgba(var(--danger-6), 0.4);
}

.folder-item .folder-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.folder-item .folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.folder-source {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.2px;
  border: 1px solid transparent;
}

.folder-source.source-aliyun {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.1);
  border-color: rgba(22, 119, 255, 0.18);
}

.folder-source.source-123 {
  color: #f08c00;
  background: rgba(240, 140, 0, 0.12);
  border-color: rgba(240, 140, 0, 0.18);
}

.folder-source.source-115 {
  color: #2b8a3e;
  background: rgba(43, 138, 62, 0.12);
  border-color: rgba(43, 138, 62, 0.18);
}

.folder-source.source-baidu {
  color: #5f3dc4;
  background: rgba(95, 61, 196, 0.12);
  border-color: rgba(95, 61, 196, 0.18);
}

.folder-source.source-local {
  color: #495057;
  background: rgba(73, 80, 87, 0.1);
  border-color: rgba(73, 80, 87, 0.16);
}

.folder-source.source-webdav {
  color: #0b7285;
  background: rgba(11, 114, 133, 0.12);
  border-color: rgba(11, 114, 133, 0.18);
}

.nav-actions {
  padding: 24px;
  border-top: 1px solid var(--color-neutral-3);
  margin-top: auto;
  background: var(--color-bg-2);
}

.nav-actions .arco-btn {
  width: 100%;
  height: 44px;
  justify-content: flex-start;
  gap: 14px;
  font-weight: 600;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid var(--color-neutral-3);
  background: var(--color-bg-1);
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.nav-actions .arco-btn + .arco-btn {
  margin-top: 10px;
}

.nav-actions .arco-btn:hover {
  background: linear-gradient(135deg, var(--color-primary-light-1), var(--color-primary-light-2));
  border-color: var(--color-primary-6);
  color: var(--color-primary-6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--primary-6), 0.2);
}

.nav-actions .arco-btn i {
  font-size: 18px;
  transition: transform 0.2s ease;
}

.nav-actions .arco-btn:hover i {
  transform: scale(1.1);
}

/* 深色模式适配 */
[arco-theme='dark'] .media-library-nav {
  background-color: var(--color-bg-2);
  border-right-color: var(--color-neutral-4);
}

[arco-theme='dark'] .media-library-title {
  background: linear-gradient(135deg, var(--color-bg-2), var(--color-bg-3));
  border-bottom-color: var(--color-neutral-4);
}

[arco-theme='dark'] .media-library-title h2 {
  color: var(--color-text-1);
}

[arco-theme='dark'] .scan-progress-section {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.15), rgba(var(--primary-6), 0.1));
  border-color: rgba(var(--primary-6), 0.3);
}

[arco-theme='dark'] .nav-item:hover {
  background: linear-gradient(135deg, var(--color-neutral-3), var(--color-fill-3));
}

[arco-theme='dark'] .nav-item.active {
  background: linear-gradient(135deg, rgba(var(--primary-6), 0.2), rgba(var(--primary-6), 0.15));
}

[arco-theme='dark'] .nav-actions {
  background: var(--color-bg-3);
  border-top-color: var(--color-neutral-4);
}

[arco-theme='dark'] .nav-actions .arco-btn {
  background: var(--color-bg-2);
  border-color: var(--color-neutral-4);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .media-library-title {
    padding: 16px 20px 12px 20px;
  }

  .media-library-title h2 {
    font-size: 18px;
  }

  .nav-section {
    margin-bottom: 20px;
  }

  .nav-header {
    padding: 0 20px;
    font-size: 13px;
    gap: 10px;
  }

  .nav-item {
    padding: 12px 16px;
    gap: 14px;
    font-size: 14px;
  }

  .nav-items {
    padding: 0 12px;
  }

  .nav-actions {
    padding: 20px;
  }

  .nav-actions .arco-btn {
    height: 40px;
    font-size: 13px;
  }
}

/* 滚动条美化 */
.media-library-nav::-webkit-scrollbar {
  width: 6px;
}

.media-library-nav::-webkit-scrollbar-track {
  background: var(--color-bg-2);
}

.media-library-nav::-webkit-scrollbar-thumb {
  background: var(--color-neutral-4);
  border-radius: 3px;
}

.media-library-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-5);
}

/* 动画增强 */
.nav-item {
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 焦点状态优化 */
.nav-item:focus-visible {
  outline: 2px solid var(--color-primary-6);
  outline-offset: 2px;
}

/* 右键菜单样式 */
.rightmenu .arco-dropdown-option.danger {
  color: var(--color-danger-6);
}

.rightmenu .arco-dropdown-option.danger:hover {
  background-color: var(--color-danger-light-1);
  color: var(--color-danger-6);
}
</style>

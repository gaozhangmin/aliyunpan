<template>
  <div class="media-library-integration">
    <!-- 媒体库主界面 -->
    <div v-if="showMediaLibrary" class="media-library-main">
      <div class="library-header">
        <h2>媒体库</h2>
        <div class="header-actions">
          <a-button 
            type="primary" 
            @click="showAddFolderModal = true"
            :loading="mediaStore.isScanning"
          >
            <template #icon>
              <i class="iconfont iconadd" />
            </template>
            添加文件夹
          </a-button>
          
          <a-button 
            type="text" 
            @click="refreshLibrary"
            :loading="mediaStore.isScanning"
          >
            <template #icon>
              <i class="iconfont iconreload-1-icon" />
            </template>
          </a-button>
        </div>
      </div>
      
      <div class="library-content">
        <!-- 继续观看 -->
        <div class="content-section" v-if="mediaStore.continueWatching.length > 0">
          <h3>继续观看</h3>
          <div class="media-row">
            <div 
              v-for="item in mediaStore.continueWatching.slice(0, 6)" 
              :key="item.id"
              class="media-card"
              @click="playMedia(item)"
            >
              <div class="poster">
                <img v-if="item.posterUrl" :src="item.posterUrl" :alt="item.name" />
                <div v-else class="poster-placeholder">
                  <i class="iconfont iconfile-video" />
                </div>
                <div class="progress-bar" v-if="item.watchProgress">
                  <div class="progress-fill" :style="{ width: item.watchProgress + '%' }"></div>
                </div>
              </div>
              <div class="info">
                <h4>{{ item.name }}</h4>
                <p v-if="item.year">{{ item.year }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 最近添加 -->
        <div class="content-section" v-if="mediaStore.recentlyAdded.length > 0">
          <h3>最近添加</h3>
          <div class="media-row">
            <div 
              v-for="item in mediaStore.recentlyAdded.slice(0, 12)" 
              :key="item.id"
              class="media-card"
              @click="playMedia(item)"
            >
              <div class="poster">
                <img v-if="item.posterUrl" :src="item.posterUrl" :alt="item.name" />
                <div v-else class="poster-placeholder">
                  <i class="iconfont iconfile-video" />
                </div>
                <div class="type-badge">{{ item.type === 'movie' ? '电影' : '电视剧' }}</div>
                <div class="rating" v-if="item.rating">{{ item.rating.toFixed(1) }}</div>
              </div>
              <div class="info">
                <h4>{{ item.name }}</h4>
                <p>{{ item.year }} · {{ item.genres.slice(0, 2).join(', ') }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分类展示 -->
        <div class="content-section">
          <a-tabs v-model:activeKey="activeTab" type="card">
            <a-tab-pane key="movies" tab="电影">
              <MediaGrid :items="mediaStore.movies" />
            </a-tab-pane>
            <a-tab-pane key="tv" tab="电视剧">
              <MediaGrid :items="mediaStore.tvShows" />
            </a-tab-pane>
            <a-tab-pane key="unmatched" tab="未匹配">
              <MediaGrid :items="mediaStore.unmatchedItems" />
            </a-tab-pane>
          </a-tabs>
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
      <a-form :model="addFolderForm" layout="vertical">
        <a-form-item label="选择文件夹">
          <a-tree-select
            v-model:value="addFolderForm.folderId"
            :tree-data="folderTreeData"
            placeholder="请选择要添加的文件夹"
            tree-default-expand-all
          />
        </a-form-item>
        <a-form-item label="媒体库名称">
          <a-input v-model:value="addFolderForm.name" placeholder="请输入媒体库显示名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMediaLibraryStore } from '../store/medialibrary'
import { MediaScanner } from '../utils/mediaScanner'
import type { MediaLibraryItem } from '../types/media'
import MediaGrid from './MediaGrid.vue'

const mediaStore = useMediaLibraryStore()
const mediaScanner = MediaScanner.getInstance()

// 状态
const showMediaLibrary = ref(true)
const showAddFolderModal = ref(false)
const activeTab = ref('movies')
const addFolderForm = ref({
  folderId: '',
  name: ''
})

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
const playMedia = (item: MediaLibraryItem) => {
  console.log('Playing media:', item.name)
  // 这里可以集成播放器
}

const refreshLibrary = () => {
  console.log('Refreshing media library...')
}

const handleAddFolder = async () => {
  if (!addFolderForm.value.folderId || !addFolderForm.value.name) {
    return
  }
  
  try {
    // 这里需要调用实际的文件夹扫描
    console.log('Adding folder:', addFolderForm.value)
    showAddFolderModal.value = false
    addFolderForm.value = { folderId: '', name: '' }
  } catch (error) {
    console.error('Error adding folder:', error)
  }
}

// 生命周期
onMounted(() => {
  console.log('Media library integration mounted')
})

// 暴露方法
defineExpose({
  showAddFolderModal
})
</script>

<style scoped>
.media-library-integration {
  height: 100%;
  width: 100%;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-neutral-3);
}

.library-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.library-content {
  padding: 24px;
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.content-section {
  margin-bottom: 32px;
}

.content-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 500;
}

.media-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.media-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.media-card:hover {
  transform: translateY(-2px);
}

.poster {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-fill-2);
}

.poster img {
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

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.progress-fill {
  height: 100%;
  background: rgb(var(--primary-6));
  transition: width 0.3s;
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

.rating {
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

.info {
  margin-top: 8px;
}

.info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .library-content {
    padding: 16px;
  }
  
  .media-row {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
}
</style>
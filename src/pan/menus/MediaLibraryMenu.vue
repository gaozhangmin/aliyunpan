<template>
  <a-dropdown
    id='medialibrarymenu'
    class='rightmenu'
    :popup-visible='true'
    style='z-index: 9999;'
  >
    <div style="position: fixed; pointer-events: none; width: 1px; height: 1px;" />
    <template #content>
      <a-doption @click="handleAddToLibrary" v-if="!isInLibrary && !isMediaLibraryFolder">
        <template #icon><i class='iconfont iconstar' /></template>
        <template #default>添加到媒体库</template>
      </a-doption>

      <a-doption @click="handleScanFolder" v-if="selectedItem?.isdir && !isMediaLibraryFolder">
        <template #icon><i class='iconfont iconreload-1-icon' /></template>
        <template #default>扫描媒体文件</template>
      </a-doption>

      <a-doption @click="handleViewInLibrary" v-if="isInLibrary && !isMediaLibraryFolder">
        <template #icon><i class='iconfont iconmovie' /></template>
        <template #default>在媒体库中查看</template>
      </a-doption>

      <!-- 媒体库文件夹删除选项 -->
      <a-doption @click="handleRemoveFromLibrary" v-if="isInLibrary || isMediaLibraryFolder" class="danger">
        <template #icon><i class='iconfont icondelete' /></template>
        <template #default>从媒体库删除</template>
      </a-doption>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue'
import { useAppStore } from '../../store'
import { useMediaLibraryStore } from '../../store/medialibrary'
import { MediaScanner } from '../../utils/mediaScanner'
import { Modal } from '@arco-design/web-vue'
import message from '../../utils/message'
import type { MediaLibraryFolder } from '../../types/media'

const props = defineProps<{
  selectedItem?: any
  mediaLibraryFolder?: MediaLibraryFolder | null
  x: number
  y: number
}>()

const emit = defineEmits(['close'])

const appStore = useAppStore()
const mediaStore = useMediaLibraryStore()
const mediaScanner = MediaScanner.getInstance()

// 计算属性
const isInLibrary = computed(() => {
  if (!props.selectedItem) return false
  const folderId = `${props.selectedItem.drive_id}_${props.selectedItem.file_id}`
  return mediaStore.folders.some(f => f.id === folderId)
})

// 是否是媒体库文件夹（从媒体库导航传来的）
const isMediaLibraryFolder = computed(() => {
  return !!props.mediaLibraryFolder
})

// 设置菜单位置
onMounted(() => {
  nextTick(() => {
    const menuEl = document.getElementById('medialibrarymenu')
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect()
      menuEl.style.left = props.x + 'px'
      menuEl.style.top = props.y + 'px'
      menuEl.style.position = 'fixed'
    }
  })
})

// 方法
const handleAddToLibrary = async () => {
  if (!props.selectedItem || !props.selectedItem.isdir) {
    message.error('只能选择文件夹添加到媒体库')
    emit('close')
    return
  }

  try {
    const folderName = await new Promise<string>((resolve) => {
      const name = prompt('请输入媒体库名称:', props.selectedItem.name)
      resolve(name || props.selectedItem.name)
    })

    if (!folderName) {
      emit('close')
      return
    }

    // 开始扫描
    await mediaScanner.scanFolder(props.selectedItem, props.selectedItem.drive_id)

    message.success(`已将 "${folderName}" 添加到媒体库`)

    // 切换到媒体库标签页
    const appStore = useAppStore()
    appStore.toggleTab('media')

  } catch (error) {
    console.error('Error adding to media library:', error)
    message.error('添加到媒体库失败')
  } finally {
    emit('close')
  }
}

const handleScanFolder = async () => {
  if (!props.selectedItem || !props.selectedItem.isdir) {
    message.error('只能选择文件夹进行扫描')
    emit('close')
    return
  }

  try {
    await mediaScanner.scanFolder(props.selectedItem, props.selectedItem.drive_id)
    message.success('扫描完成')
  } catch (error) {
    console.error('Error scanning folder:', error)
    message.error('扫描失败')
  } finally {
    emit('close')
  }
}

const handleViewInLibrary = () => {
  // 切换到媒体库并显示该文件夹的内容
  console.log('View in library:', props.selectedItem.name)
  emit('close')
}

const handleRemoveFromLibrary = () => {
  const targetFolder = props.mediaLibraryFolder || props.selectedItem
  if (!targetFolder) return

  const folderName = props.mediaLibraryFolder ? targetFolder.name : props.selectedItem.name
  const folderId = props.mediaLibraryFolder ? targetFolder.id : `${props.selectedItem.drive_id}_${props.selectedItem.file_id}`

  Modal.confirm({
    title: '删除文件夹',
    content: `确定要从媒体库删除"${folderName}"文件夹吗？这将删除该文件夹及其所有已刮削的媒体信息。`,
    okText: '删除',
    okButtonProps: { status: 'danger' },
    cancelText: '取消',
    onOk: () => {
      // 删除文件夹和相关媒体
      mediaStore.removeFolder(folderId)
      message.success(`已从媒体库删除文件夹: ${folderName}`)
      emit('close')
    }
  })
}
</script>

<style>
/* 使用与FileRightMenu.vue相同的样式 */
.rightmenu .arco-dropdown-option.danger {
  color: var(--color-danger-6);
}

.rightmenu .arco-dropdown-option.danger:hover {
  background-color: var(--color-danger-light-1);
  color: var(--color-danger-6);
}
</style>

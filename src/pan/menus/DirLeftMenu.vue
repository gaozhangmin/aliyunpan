<script setup lang="ts">
import { menuCopySelectedFile, menuCreatShare, menuDownload, menuTrashSelectFile } from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'
import PanDAL from '../pandal'
import { usePanTreeStore, useAppStore } from '../../store'
import TreeStore from '../../store/treestore'
import { MediaScanner } from '../../utils/mediaScanner'
import message from '../../utils/message'
import { computed } from 'vue'
import { isAliyunUser as isAliyunAccountUser, isCloud123User } from '../../aliapi/utils'

const istree = true
const pantreeStore = usePanTreeStore()
const appStore = useAppStore()
const mediaScanner = MediaScanner.getInstance()
const isCloudUser = computed(() => isCloud123User(pantreeStore.user_id || '') || pantreeStore.drive_id === 'cloud123')
const isAliyunAccount = computed(() => isAliyunAccountUser(pantreeStore.user_id || ''))

const props = defineProps({
  inputselectType: {
    type: String,
    required: true
  }
})

const handleRefresh = () => PanDAL.aReLoadOneDirToShow('', 'refresh', false)
const handleExpandAll = (isExpand: boolean) => {
  const drive_id = pantreeStore.drive_id
  const file_id = pantreeStore.selectDir.file_id
  const diridList = (() => {
    const result: string[] = []
    const visited = new Set<string>()
    const stack = [file_id]
    while (stack.length > 0) {
      const current = stack.pop() as string
      const children = TreeStore.GetDirChildDirID(drive_id, current)
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (visited.has(child)) continue
        visited.add(child)
        result.push(child)
        stack.push(child)
      }
    }
    return result
  })()
  pantreeStore.mTreeExpandAll(diridList, isExpand)
}

// 扫描媒体库方法
const handleScanMediaLibrary = async () => {
  const selectDir = pantreeStore.selectDir
  if (!selectDir || !selectDir.file_id) {
    message.warning('请先选择要扫描的文件夹')
    return
  }

  try {
    // 构建符合 IAliGetFileModel 接口的文件夹对象
    const folder = {
      __v_skip: true,
      drive_id: pantreeStore.drive_id,
      file_id: selectDir.file_id,
      parent_file_id: selectDir.parent_file_id || '',
      name: selectDir.name,
      namesearch: selectDir.name.toLowerCase(),
      ext: '',
      mime_type: '',
      mime_extension: '',
      category: 'folder',
      icon: 'iconfolder',
      file_count: 0,
      size: 0,
      sizeStr: '',
      time: Date.now(),
      timeStr: new Date().toLocaleString(),
      starred: false,
      isDir: true,
      thumbnail: ''
    } as any // 临时使用 any 类型避免完整实现所有字段

    await mediaScanner.scanFolder(folder, pantreeStore.drive_id)
    message.success(`开始扫描文件夹 "${selectDir.name}" 的媒体库`)

    // 切换到媒体库标签页
    appStore.toggleTab('media')
  } catch (error) {
    console.error('媒体库扫描失败:', error)
    message.error('媒体库扫描失败，请稍后重试')
  }
}

// 检查是否选中了有效的文件夹
const isSelectedFolder = computed(() => {
  return pantreeStore.selectDir && pantreeStore.selectDir.file_id && pantreeStore.selectDir.file_id !== ''
})

</script>

<template>
  <a-dropdown id="leftpanmenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
    <template #content>
      <a-dsubmenu id="leftpansubzhankai" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="iconfont iconfenzhi1"></i></span>目录
          </div>
        </template>
        <template #content>
          <a-doption @click="handleRefresh">
            <template #icon> <i class="iconfont iconreload-1-icon" /> </template>
            <template #default>刷新</template>
          </a-doption>
          <a-doption @click="() => handleExpandAll(true)">
            <template #icon> <i class="iconfont iconArrow-Down2" /> </template>
            <template #default>展开全部</template>
          </a-doption>
          <a-doption @click="() => handleExpandAll(false)">
            <template #icon> <i class="iconfont iconArrow-Right2" /> </template>
            <template #default>折叠全部</template>
          </a-doption>
        </template>
      </a-dsubmenu>
      <a-doption @click="() => menuDownload(istree)">
        <template #icon> <i class="iconfont icondownload" /> </template>
        <template #default>下载</template>
      </a-doption>
      <a-doption v-show="inputselectType.includes('resource')"
                 @click="() => menuCreatShare(istree, 'pan', 'resource_root')">
        <template #icon><i class='iconfont iconfenxiang' /></template>
        <template #default>分享</template>
      </a-doption>
      <a-doption v-if="isAliyunAccount" @click="() => menuCreatShare(istree, 'pan', 'backup_root')">
        <template #icon><i class='iconfont iconrss' /></template>
        <template #default>快传</template>
      </a-doption>

      <!-- 扫描媒体库 -->
      <a-doption @click="handleScanMediaLibrary">
        <template #icon><i class='iconfont iconshipin' /></template>
        <template #default>扫描媒体库</template>
      </a-doption>

      <a-dsubmenu id="leftpansubmove" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="iconfont iconmoveto" style="opacity: 0.8"></i></span>移动
          </div>
        </template>
        <template #content>
          <a-doption @click="() => menuCopySelectedFile(istree, 'cut')">
            <template #icon> <i class="iconfont iconscissor" /> </template>
            <template #default>移动到...</template>
          </a-doption>
          <a-doption @click="() => menuCopySelectedFile(istree, 'copy')">
            <template #icon> <i class="iconfont iconcopy" /> </template>
            <template #default>复制到...</template>
          </a-doption>
          <a-doption class="danger" @click="() => menuTrashSelectFile(istree, false)">
            <template #icon> <i class="iconfont icondelete" /> </template>
            <template #default>回收站</template>
          </a-doption>
        </template>
      </a-dsubmenu>

      <a-doption @click='() => modalRename(istree, false, false)'>
        <template #icon><i class='iconfont iconedit-square' /></template>
        <template #default>重命名</template>
      </a-doption>

      <a-doption @click='() => modalShuXing(istree)'>
        <template #icon><i class='iconfont iconshuxing' /></template>
        <template #default>属性</template>
      </a-doption>
    </template>
  </a-dropdown>
</template>
<style></style>

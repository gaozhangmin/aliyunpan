<script lang="ts">
import { defineComponent } from 'vue'
import { menuTrashSelectFile, menuCopySelectedFile, menuCreatShare, menuDownload } from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'
import PanDAL from '../pandal'
import { usePanTreeStore } from '../../store'
import TreeStore from '../../store/treestore'
export default defineComponent({
  setup() {
    const handleRefresh = () => PanDAL.aReLoadOneDirToShow('', 'refresh', false)
    const handleExpandAll = (isExpand: boolean) => {
      const pantreeStore = usePanTreeStore()
      const drive_id = pantreeStore.drive_id
      const file_id = pantreeStore.selectDir.file_id
      const diridList = TreeStore.GetDirChildDirID(drive_id, file_id)
      pantreeStore.mTreeExpandAll(diridList, isExpand)
    }
    const istree = true
    return { istree, handleRefresh, handleExpandAll, menuCreatShare, menuTrashSelectFile, menuCopySelectedFile, modalRename, modalShuXing, menuDownload }
  }
})
</script>

<template>
  <a-dropdown id="leftpanmenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
    <template #content>
      <a-dsubmenu id="leftpansubzhankai" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-folder-open"></i></span>目录
          </div>
        </template>
        <template #content>
          <a-doption @click="handleRefresh">
            <template #icon> <i class="fa-solid fa-refresh" /> </template>
            <template #default>刷新</template>
          </a-doption>
          <a-doption @click="() => handleExpandAll(true)">
            <template #icon> <i class="fa-solid fa-plus" /> </template>
            <template #default>展开全部</template>
          </a-doption>
          <a-doption @click="() => handleExpandAll(false)">
            <template #icon> <i class="fa-solid fa-minus" /> </template>
            <template #default>折叠全部</template>
          </a-doption>
        </template>
      </a-dsubmenu>
      <a-doption @click="() => menuDownload(istree)">
        <template #icon> <i class="fa-solid fa-download" /> </template>
        <template #default>下载</template>
      </a-doption>
      <a-doption @click="() => menuCreatShare(istree, 'pan')">
        <template #icon> <i class="fa-solid fa-share-square" /> </template>
        <template #default>分享</template>
      </a-doption>

      <a-dsubmenu id="leftpansubmove" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-file-export" style="opacity: 0.8"></i></span>移动
          </div>
        </template>
        <template #content>
          <a-doption @click="() => menuCopySelectedFile(istree, 'cut')">
            <template #icon> <i class="fa-solid fa-file-import" /> </template>
            <template #default>移动到</template>
          </a-doption>
          <a-doption @click="() => menuCopySelectedFile(istree, 'copy')">
            <template #icon> <i class="fa-solid fa-copy" /> </template>
            <template #default>复制到</template>
          </a-doption>
          <a-doption class="danger" @click="() => menuTrashSelectFile(istree, false)">
            <template #icon> <i class="fa-solid fa-trash" /> </template>
            <template #default>回收站</template>
          </a-doption>
        </template>
      </a-dsubmenu>

      <a-doption @click="() => modalRename(istree, false)">
        <template #icon> <i class="fa-solid fa-book" /> </template>
        <template #default>重命名</template>
      </a-doption>

      <a-doption @click="() => modalShuXing(istree, false)">
        <template #icon> <i class="fa-solid fa-tags" /> </template>
        <template #default>属性</template>
      </a-doption>
    </template>
  </a-dropdown>
</template>
<style></style>

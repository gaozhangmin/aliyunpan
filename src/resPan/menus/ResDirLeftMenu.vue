<script lang="ts">
import { defineComponent } from 'vue'
import { menuTrashSelectFile, menuCopySelectedFile, menuCreatShare, menuDownload } from '../topbtns/ResTopbtn'
import { modalRename, modalShuXing } from '../../utils/modal'
import PanDAL from '../pandal'
import { useResPanTreeStore } from '../../store'
import TreeStore from '../../store/treestore'
export default defineComponent({
  setup() {
    const handleRefresh = () => PanDAL.aReLoadOneDirToShow('', 'refresh', false)
    const handleExpandAll = (isExpand: boolean) => {
      const pantreeStore = useResPanTreeStore()
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
  <a-dropdown id="leftrespanmenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
    <template #content>
      <a-dsubmenu id="leftrespansubzhankai" class="rightmenu" trigger="hover">
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
      <a-doption @click="() => menuCreatShare(istree, 'share')">
        <template #icon> <i class="iconfont iconfenxiang" /> </template>
        <template #default>分享</template>
      </a-doption>
      <a-doption @click="() => menuCreatShare(istree, 'rapid')">
        <template #icon> <i class="iconfont iconrss" /> </template>
        <template #default>快传</template>
      </a-doption>

      <a-dsubmenu id="leftrespansubmove" class="rightmenu" trigger="hover">
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
            <a-doption @click="() => menuCopySelectedFile(istree, 'cut', true)">
                <template #icon> <i class="iconfont iconscissor" /> </template>
                <template #default>移动到备份盘</template>
            </a-doption>
            <a-doption @click="() => menuCopySelectedFile(istree, 'copy', true)">
                <template #icon> <i class="iconfont iconcopy" /> </template>
                <template #default>复制到备份盘</template>
            </a-doption>
          <a-doption class="danger" @click="() => menuTrashSelectFile(istree, false)">
            <template #icon> <i class="iconfont icondelete" /> </template>
            <template #default>回收站</template>
          </a-doption>
        </template>
      </a-dsubmenu>

      <a-doption @click="() => modalRename('resourcePan',istree, false)">
        <template #icon> <i class="iconfont iconedit-square" /> </template>
        <template #default>重命名</template>
      </a-doption>

      <a-doption @click="() => modalShuXing('resourcePan', istree, false)">
        <template #icon> <i class="iconfont iconshuxing" /> </template>
        <template #default>属性</template>
      </a-doption>
    </template>
  </a-dropdown>
</template>
<style></style>

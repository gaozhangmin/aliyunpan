<script lang="ts">
import { defineComponent } from 'vue'

import { menuDownload, menuFavSelectFile, menuTrashSelectFile, menuCopySelectedFile, menuJumpToDir, menuCreatShare, menuVideoXBT, menuDLNA, menuM3U8Download, menuCopyFileName, menuCopyFileTree } from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'

export default defineComponent({
  props: {
    dirtype: {
      type: String,
      required: true
    },
    isvideo: {
      type: Boolean,
      required: true
    },
    isselected: {
      type: Boolean,
      required: true
    },
    isselectedmulti: {
      type: Boolean,
      required: true
    },
    isallfavored: {
      type: Boolean,
      required: true
    }
  },
  setup() {
    const istree = false
    return { istree, menuDownload, menuCreatShare, menuFavSelectFile, menuTrashSelectFile, modalRename, menuCopySelectedFile, modalShuXing, menuJumpToDir, menuVideoXBT, menuDLNA, menuM3U8Download, menuCopyFileName, menuCopyFileTree }
  }
})
</script>

<template>
  <div v-show="isselected && dirtype !== 'trash' && dirtype !== 'recover'" class="toppanbtn">
    <a-button type="text" size="small" tabindex="-1" title="Ctrl+D" @click="() => menuDownload(istree)"><i class="fa-solid fa-download" />下载</a-button>
    <a-button v-show="dirtype == 'pan'" type="text" size="small" tabindex="-1" title="Ctrl+S" @click="() =>
    menuCreatShare(istree, 'pan')"><i class="fa-solid fa-share-square" />分享</a-button>
    <a-button v-show="!isallfavored" type="text" size="small" tabindex="-1" title="Ctrl+G" @click="() => menuFavSelectFile(istree, true)"><i class="fa-solid fa-heart" />收藏</a-button>
    <a-button v-show="isallfavored" type="text" size="small" tabindex="-1" title="Ctrl+G" @click="() => menuFavSelectFile(istree, false)"><i class="fa-solid fa-heart-circle-xmark" />取消收藏</a-button>

    <a-dropdown trigger="hover" class="rightmenu" position="bl">
      <a-button type="text" size="small" tabindex="-1" class="danger"><i class="fa-solid fa-trash" />删除</a-button>
      <template #content>
        <a-doption title="Ctrl+Delete" class="danger" @click="() => menuTrashSelectFile(istree, false)">
          <template #icon> <i class="fa-solid fa-trash" /> </template>
          <template #default>放回收站</template>
        </a-doption>
        <a-dsubmenu class="rightmenu" trigger="hover">
          <template #default>
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-trash-can-arrow-up"></i></span>彻底删除
          </template>
          <template #content>
            <a-doption title="Ctrl+Shift+Delete" class="danger" @click="() => menuTrashSelectFile(istree, true)">
              <template #default>删除后无法还原</template>
            </a-doption>
          </template>
        </a-dsubmenu>
      </template>
    </a-dropdown>

    <a-dropdown trigger="hover" class="rightmenu" position="bl">
      <a-button type="text" size="small" tabindex="-1"><i class="fa-solid fa-caret-down" />更多</a-button>
      <template #content>
        <a-doption title="F2 / Ctrl+E" @click="() => modalRename(istree, isselectedmulti)">
          <template #icon> <i class="fa-solid fa-pencil" /> </template>
          <template #default>重命名</template>
        </a-doption>
        <a-doption title="Ctrl+X" @click="() => menuCopySelectedFile(istree, 'cut')">
          <template #icon> <i class="fa-solid fa-file-import" /> </template>
          <template #default>移动到...</template>
        </a-doption>
        <a-doption title="Ctrl+C" @click="() => menuCopySelectedFile(istree, 'copy')">
          <template #icon> <i class="fa-solid fa-copy" /> </template>
          <template #default>复制到...</template>
        </a-doption>
        <a-doption title="Ctrl+P" @click="() => modalShuXing(istree, isselectedmulti)">
          <template #icon> <i class="fa-solid fa-tags" /> </template>
          <template #default>属性</template>
        </a-doption>
        <a-doption v-show="isselected && !isselectedmulti && (dirtype == 'favorite' || dirtype == 'search' || dirtype == 'color' || dirtype == 'video')" @click="() => menuJumpToDir()">
          <template #icon> <i class="fa-solid fa-folder" /> </template>
          <template #default>打开位置</template>
        </a-doption>
        <a-doption v-show="isvideo" @click="() => menuVideoXBT()">
          <template #icon> <i class="fa-solid fa-images" /> </template>
          <template #default>雪碧图</template>
        </a-doption>
        <a-doption v-show="false && isvideo" @click="() => menuDLNA()">
          <template #icon> <i class="fa-solid fa-tv" /> </template>
          <template #default>DLNA</template>
        </a-doption>
        <a-doption v-show="isvideo" @click="() => menuM3U8Download()">
          <template #icon> <i class="fa-solid fa-video-camera" /> </template>
          <template #default>m3u8</template>
        </a-doption>
        <a-doption v-show="isselected" @click="() => menuCopyFileName()">
          <template #icon> <i class="fa-solid fa-table-list" /> </template>
          <template #default>复制文件名</template>
        </a-doption>
        <a-doption v-show="isselected && !isselectedmulti" @click="() => menuCopyFileTree()">
          <template #icon> <i class="fa-solid fa-folder-tree" /> </template>
          <template #default>复制目录树</template>
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>
<style></style>

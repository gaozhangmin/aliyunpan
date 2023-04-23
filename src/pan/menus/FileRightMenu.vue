<script lang="ts">
import { defineComponent } from 'vue'

import { menuFavSelectFile, menuTrashSelectFile, menuCopySelectedFile, menuFileColorChange, menuCreatShare, menuJumpToDir, menuVideoXBT, menuDLNA, menuM3U8Download, menuCopyFileName, menuCopyFileTree, menuDownload } from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'
import { useSettingStore } from '../../store'

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
    const settingStore = useSettingStore()
    const istree = false
    return { istree, settingStore, menuCreatShare, menuFavSelectFile, menuTrashSelectFile, menuCopySelectedFile, menuFileColorChange, modalRename, modalShuXing, menuJumpToDir, menuVideoXBT, menuDLNA, menuM3U8Download, menuCopyFileName, menuCopyFileTree, menuDownload }
  }
})
</script>

<template>
  <a-dropdown id="rightpanmenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
    <template #content>
      <a-doption @click="() => menuDownload(istree)">
        <template #icon> <i class="fa-solid fa-download" /> </template>
        <template #default>下载</template>
      </a-doption>
      <a-doption @click="() => menuCreatShare(istree, 'pan')">
        <template #icon> <i class="fa-solid fa-share-square" /> </template>
        <template #default>分享</template>
      </a-doption>

      <a-doption v-show="!isallfavored" @click="() => menuFavSelectFile(istree, true)">
        <template #icon> <i class="fa-solid fa-heart" /> </template>
        <template #default>收藏</template>
      </a-doption>
      <a-doption v-show="isallfavored" @click="() => menuFavSelectFile(istree, false)">
        <template #icon> <i class="fa-solid fa-heart-circle-xmark" /> </template>
        <template #default>取消收藏</template>
      </a-doption>
      <a-dsubmenu id="rightpansubbiaoji" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-tags" style="opacity: 0.8"></i></span>标记
          </div>
        </template>
        <template #content>
          <a-doption v-for="item in settingStore.uiFileColorArray" :key="item.key" @click="() => menuFileColorChange(istree, item.key)">
            <template #icon> <i class="fa-solid fa-square" :style="{ color: item.key }" /> </template>
            <template #default>{{ item.title || item.key }}</template>
          </a-doption>

          <a-doption @click="() => menuFileColorChange(istree, '#5b89b8')">
            <template #icon> <i class="fa-solid fa-square" style="color: #5b89b8" /> </template>
            <template #default>视频灰</template>
          </a-doption>
          <a-doption @click="() => menuFileColorChange(istree, '')">
            <template #icon> <i class="fa-solid fa-xmark-square" /> </template>
            <template #default>清除标记</template>
          </a-doption>
        </template>
      </a-dsubmenu>
      <a-dsubmenu id="rightpansubmove" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-file-export" style="opacity: 0.8"></i></span>移动
          </div>
        </template>
        <template #content>
          <a-doption @click="() => menuCopySelectedFile(istree, 'cut')">
            <template #icon> <i class="fa-solid fa-file-export" /> </template>
            <template #default>移动到...</template>
          </a-doption>
          <a-doption @click="() => menuCopySelectedFile(istree, 'copy')">
            <template #icon> <i class="fa-solid fa-copy" /> </template>
            <template #default>复制到...</template>
          </a-doption>
          <a-doption class="danger" @click="() => menuTrashSelectFile(istree, false)">
            <template #icon> <i class="fa-solid fa-trash" /> </template>
            <template #default>回收站</template>
          </a-doption>
        </template>
      </a-dsubmenu>

      <a-doption v-show="dirtype != 'video'" @click="() => modalRename(istree, isselectedmulti)">
        <template #icon> <i class="fa-solid fa-pencil" /> </template>
        <template #default>重命名</template>
      </a-doption>

      <a-dsubmenu id="rightpansubmore" class="rightmenu" trigger="hover">
        <template #default>
          <div @click.stop="() => {}">
            <span class="arco-dropdown-option-icon"><i class="fa-solid fa-angles-right" style="opacity: 0.8"></i></span>更多
          </div>
        </template>
        <template #content>
          <a-doption @click="() => modalShuXing(istree, isselectedmulti)">
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
      </a-dsubmenu>
    </template>
  </a-dropdown>
</template>
<style></style>

<script setup lang='ts'>
import { computed } from 'vue'
import { usePanTreeStore } from '../../store'
import { isAliyunUser as isAliyunAccountUser, isCloud123User } from '../../aliapi/utils'
import { isWebDavDrive } from '../../utils/webdavClient'

import {
  menuAddAlbumSelectFile,
  menuCopyFileName,
  menuCopyFileTree,
  menuCopySelectedFile,
  menuCreatShare,
  menuDLNA,
  menuDownload,
  menuFavSelectFile,
  menuFileClearHistory,
  menuFileColorChange,
  menuFileEncTypeChange,
  menuJumpToDir,
  menuM3U8Download,
  menuTrashSelectFile,
  menuVideoXBT
} from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'

const props = defineProps({
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
  },
  isallcolored: {
    type: Boolean,
    required: true
  },
  inputselectType: {
    type: String,
    required: true
  },
  inputpicType: {
    type: String,
    required: true
  }
})

const istree = false
const panTreeStore = usePanTreeStore()
const isCloudUser = computed(() => isCloud123User(panTreeStore.user_id || '') || panTreeStore.drive_id === 'cloud123')
const isAliyunAccount = computed(() => isAliyunAccountUser(panTreeStore.user_id || ''))
const isWebDav = computed(() => isWebDavDrive(panTreeStore.drive_id || panTreeStore.selectDir.drive_id))
const isShowBtn = computed(() => {
  return (props.dirtype === 'pic' && props.inputpicType != 'mypic')
    || props.dirtype === 'mypic' || ['search', 'color', 'pan'].includes(props.dirtype)
})
const isPic = computed(() => {
  return (props.dirtype === 'pic' && props.inputpicType == 'mypic')
})
</script>

<template>
  <div v-show="isselected && dirtype !== 'trash' && dirtype !== 'recover'" class='toppanbtn'>
    <a-button v-if='!isPic && dirtype != "video"' type='text' size='small' tabindex='-1' title='Ctrl+D'
              @click='() => menuDownload(istree)'>
      <i class='iconfont icondownload' />下载
    </a-button>
    <a-button v-if="!isPic && dirtype != 'video' && dirtype !== 'search' && inputselectType.includes('resource')" type='text' size='small' tabindex='-1'
              title='Ctrl+S'
              @click="() => menuCreatShare(istree, 'pan', 'resource_root')">
      <i class='iconfont iconfenxiang' />分享
    </a-button>
    <a-button v-if='!isPic && dirtype != "video" && dirtype !== "search" && isAliyunAccount' type='text' size='small' tabindex='-1' title='Ctrl+T'
              @click="() => menuCreatShare(istree, 'pan', 'backup_root')">
      <i class='iconfont iconrss' />快传
    </a-button>
    <a-button v-if='!isPic && !isallfavored && isAliyunAccount' type='text' size='small' tabindex='-1' title='Ctrl+G'
              @click='() => menuFavSelectFile(istree, true)'>
      <i class='iconfont iconcrown' />收藏
    </a-button>
    <a-button v-if='!isPic && isallfavored && isAliyunAccount' type='text' size='small' tabindex='-1' title='Ctrl+G'
              @click='() => menuFavSelectFile(istree, false)'>
      <i class='iconfont iconcrown2' />取消收藏
    </a-button>
    <a-button v-if='isShowBtn' title='F2 / Ctrl+E' type='text' size='small' tabindex='-1'
              @click='() => modalRename(istree, isselectedmulti, isPic)'>
      <i class='iconfont iconedit-square' />重命名
    </a-button>
    <a-button v-if="isselected && !isselectedmulti && (dirtype == 'favorite' || dirtype == 'search' || dirtype == 'color' || dirtype == 'trash' || dirtype == 'video')"
              type='text' size='small' tabindex='-1' title='Ctrl+R'
              @click='() => menuJumpToDir()'>
      <i class='iconfont icondakaiwenjianjia1' />打开位置
    </a-button>
    <a-dropdown v-if="dirtype !== 'video' && dirtype !== 'mypic'" trigger='hover' class='rightmenu' position='bl'>
      <a-button type='text' size='small' tabindex='-1' class='danger'>
        <i class='iconfont icondelete' />删除<i class='iconfont icondown' />
      </a-button>
      <template #content>
        <a-doption v-show='(isShowBtn || dirtype === "search") && !isWebDav' title='Ctrl+Delete' class='danger'
                   @click='() => menuTrashSelectFile(istree, false, isPic)'>
          <template #icon><i class='iconfont icondelete' /></template>
          <template #default>放回收站</template>
        </a-doption>
        <a-dsubmenu v-if='isAliyunAccount || isWebDav' class='rightmenu' trigger='hover'>
          <template #default>
            <span class='arco-dropdown-option-icon'><i class='iconfont iconrest'></i></span>彻底删除
          </template>
          <template #content>
            <a-doption title='Ctrl+Shift+Delete' class='danger' @click='() => menuTrashSelectFile(istree, true, isPic)'>
              <template #default>删除后无法还原</template>
            </a-doption>
          </template>
        </a-dsubmenu>
      </template>
    </a-dropdown>

    <a-dropdown trigger='hover' class='rightmenu' position='bl'>
      <a-button type='text' size='small' tabindex='-1'>更多<i class='iconfont icondown' /></a-button>
      <template #content>
        <a-doption v-show='inputpicType !== "mypic" && dirtype === "pic"'
                   title='Ctrl+X' @click="() => menuAddAlbumSelectFile()">
          <template #icon><i class='iconfont iconscissor' /></template>
          <template #default>移入相册</template>
        </a-doption>
        <a-doption v-show='dirtype === "mypic"' title='Ctrl+X'
                   @click="() => menuTrashSelectFile(istree, false, true)">
          <template #icon><i class='iconfont iconscissor' /></template>
          <template #default>移出相册</template>
        </a-doption>
        <a-doption v-show='isShowBtn' title='Ctrl+X' @click="() => menuCopySelectedFile(istree, 'cut')">
          <template #icon><i class='iconfont iconscissor' /></template>
          <template #default>移动到...</template>
        </a-doption>
        <a-doption v-show='isShowBtn' title='Ctrl+C' @click="() => menuCopySelectedFile(istree, 'copy')">
          <template #icon><i class='iconfont iconcopy' /></template>
          <template #default>复制到...</template>
        </a-doption>
        <a-doption v-show='!isPic' title='Ctrl+P' @click='() => modalShuXing(istree, dirtype.includes("pic"))'>
          <template #icon><i class='iconfont iconshuxing' /></template>
          <template #default>属性</template>
        </a-doption>
        <a-doption v-show='isvideo' @click='() => menuVideoXBT()'>
          <template #icon><i class='iconfont iconjietu' /></template>
          <template #default>雪碧图</template>
        </a-doption>
        <a-doption v-show='isShowBtn && isAliyunAccount' type='text' size='small' tabindex='-1' title='Ctrl+M'
                   @click="() => menuFileEncTypeChange(istree)">
          <template #icon><i class='iconfont iconsafebox' /></template>
          <template #default>标记加密</template>
        </a-doption>
        <a-doption v-show='isShowBtn && isallcolored && isAliyunAccount' type='text' size='small' tabindex='-1' title='Ctrl+M'
                   @click="() => menuFileClearHistory(istree)">
          <template #icon><i class='iconfont iconshipin' /></template>
          <template #default>清除历史</template>
        </a-doption>
        <a-doption v-show='isShowBtn && isallcolored && !isWebDav' type='text' size='small' tabindex='-1' title='Ctrl+M'
                   @click="() => menuFileColorChange(istree, '')">
          <template #icon><i class='iconfont iconfangkuang' /></template>
          <template #default>清除标记</template>
        </a-doption>
        <a-doption v-show="isvideo" @click="() => menuDLNA()">
          <template #icon><i class="iconfont icontouping2" /></template>
          <template #default>DLNA投屏</template>
        </a-doption>
        <a-doption v-show='isvideo' @click='() => menuM3U8Download()'>
          <template #icon><i class='iconfont iconluxiang' /></template>
          <template #default>M3U8下载</template>
        </a-doption>
        <a-doption v-show='isselected' @click='() => menuCopyFileName()'>
          <template #icon><i class='iconfont iconlist' /></template>
          <template #default>复制文件名</template>
        </a-doption>
        <a-doption v-show='!dirtype.includes("pic") && isselected && !isselectedmulti && isAliyunAccount'
                   @click='() => menuCopyFileTree()'>
          <template #icon><i class='iconfont iconnode-tree1' /></template>
          <template #default>复制目录树</template>
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>
<style></style>

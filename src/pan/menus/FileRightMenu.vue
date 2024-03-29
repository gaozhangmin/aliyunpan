<script setup lang='ts'>
import {
  menuAddAlbumSelectFile,
  menuCopyFileName,
  menuCopyFileTree,
  menuCopySelectedFile,
  menuCreatShare,
  menuDLNA,
  menuDownload,
  menuFileClearHistory,
  menuFileColorChange,
  menuFileEncTypeChange,
  menuJumpToDir,
  menuM3U8Download,
  menuTrashSelectFile,
  menuVideoXBT
} from '../topbtns/topbtn'
import { modalRename, modalShuXing } from '../../utils/modal'
import { useSettingStore } from '../../store'
import { computed } from 'vue'

let istree = false
const settingStore = useSettingStore()

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
  inputselectType: {
    type: String,
    required: true
  },
  inputpicType: {
    type: String,
    required: true
  }
})

const isShowBtn = computed(() => {
  return (props.dirtype === 'pic' && props.inputpicType != 'mypic')
    || props.dirtype === 'mypic' || props.dirtype === 'pan'
})
const isPic = computed(() => {
  return (props.dirtype === 'pic' && props.inputpicType == 'mypic')
})
</script>

<template>
  <a-dropdown id='rightpanmenu' class='rightmenu' :popup-visible='true' style='z-index: -1; left: -200px; opacity: 0'>
    <template #content>
      <a-doption @click='() => menuDownload(istree)'>
        <template #icon><i class='iconfont icondownload' /></template>
        <template #default>下载</template>
      </a-doption>
      <a-doption v-show='inputselectType && inputselectType.includes("resource")'
                 @click="() => menuCreatShare(istree, 'pan', 'resource_root')">
        <template #icon><i class='iconfont iconfenxiang' /></template>
        <template #default>分享</template>
      </a-doption>
      <a-doption @click="() => menuCreatShare(istree, 'pan', 'backup_root')">
        <template #icon><i class='iconfont iconrss' /></template>
        <template #default>快传</template>
      </a-doption>
      <a-dsubmenu v-if="dirtype !== 'pic'" id='rightpansubbiaoji' class='rightmenu' trigger='hover'>
        <template #default>
          <div @click.stop='() => {}'>
            <span class='arco-dropdown-option-icon'>
              <i class='iconfont iconwbiaoqian' style='opacity: 0.8'></i>
            </span>标记
          </div>
        </template>
        <template #content>
          <a-doption v-for='item in settingStore.uiFileColorArray' :key='item.key'
                     @click='() => menuFileColorChange(istree, item.key)'>
            <template #icon><i class='iconfont iconcheckbox-full' :style='{ color: item.key }' /></template>
            <template #default>{{ item.title || item.key }}</template>
          </a-doption>

          <a-doption @click="() => menuFileColorChange(istree, '#e74c3c')">
            <template #icon><i class='iconfont iconcheckbox-full' style='color: #e74c3c' /></template>
            <template #default>视频红</template>
          </a-doption>
          <a-doption @click="() => menuFileColorChange(istree, '')">
            <template #icon><i class='iconfont iconfangkuang' /></template>
            <template #default>清除标记</template>
          </a-doption>
        </template>
      </a-dsubmenu>
      <a-dsubmenu v-if="dirtype != 'video'" id='rightpansubmove' class='rightmenu' trigger='hover'>
        <template #default>
          <div @click.stop='() => {}'>
            <span class='arco-dropdown-option-icon'>
              <i class='iconfont iconmoveto' style='opacity: 0.8'></i>
            </span>
            操作
          </div>
        </template>
        <template #content>
          <a-doption v-show='isShowBtn && inputpicType !== "mypic" && dirtype !== "pan"'
                     @click='() => menuAddAlbumSelectFile()'>
            <template #icon><i class='iconfont iconmoveto' /></template>
            <template #default>移入相册</template>
          </a-doption>
          <a-doption v-show='dirtype === "mypic"'
                     @click='() => menuTrashSelectFile(istree, false, true)'>
            <template #icon><i class='iconfont iconqingkong' /></template>
            <template #default>移出相册</template>
          </a-doption>
          <a-doption v-show='isShowBtn' @click="() => menuCopySelectedFile(istree, 'cut')">
            <template #icon><i class='iconfont iconscissor' /></template>
            <template #default>移动到...</template>
          </a-doption>
          <a-doption v-show='isShowBtn' @click="() => menuCopySelectedFile(istree, 'copy')">
            <template #icon><i class='iconfont iconcopy' /></template>
            <template #default>复制到...</template>
          </a-doption>
          <a-doption v-show='isShowBtn' type='text' size='small' tabindex='-1' title='Ctrl+M'
                     @click="() => menuFileEncTypeChange(istree)">
            <template #icon><i class='iconfont iconsafebox' /></template>
            <template #default>标记加密</template>
          </a-doption>
          <a-doption v-show='isShowBtn && dirtype !== "mypic"  || dirtype === "search"' class='danger' @click='() => menuTrashSelectFile(istree, false, isPic)'>
            <template #icon><i class='iconfont icondelete' /></template>
            <template #default>放回收站</template>
          </a-doption>
          <a-dsubmenu v-if='dirtype !== "mypic"' class='rightmenu' trigger='hover'>
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
      </a-dsubmenu>

      <a-doption v-show="dirtype != 'video'"
                 @click='() => modalRename(istree, isselectedmulti, dirtype.includes("pic"))'>
        <template #icon><i class='iconfont iconedit-square' /></template>
        <template #default>重命名</template>
      </a-doption>

      <a-doption v-show="!isPic" @click='() => modalShuXing(istree, dirtype.includes("pic"))'>
        <template #icon><i class='iconfont iconshuxing' /></template>
        <template #default>属性</template>
      </a-doption>
      <a-dsubmenu v-if='!dirtype.includes("pic")'
                  id='rightpansubmore' class='rightmenu' trigger='hover'>
        <template #default>
          <div @click.stop='() => {}'>
            <span class='arco-dropdown-option-icon'>
              <i class='iconfont icongengduo1' style='opacity: 0.8'></i>
            </span>
            更多
          </div>
        </template>
        <template #content>
          <a-doption
            v-show="isselected && !isselectedmulti && (dirtype == 'favorite' || dirtype == 'search' || dirtype == 'color' || dirtype == 'video')"
            @click='() => menuJumpToDir()'>
            <template #icon><i class='iconfont icondakaiwenjianjia1' /></template>
            <template #default>打开位置</template>
          </a-doption>
          <a-doption v-show='isvideo' @click='() => menuVideoXBT()'>
            <template #icon><i class='iconfont iconjietu' /></template>
            <template #default>雪碧图</template>
          </a-doption>
          <a-doption v-show='isShowBtn' type='text' size='small' tabindex='-1' title='Ctrl+M'
                     @click="() => menuFileEncTypeChange(istree)">
            <template #icon><i class='iconfont iconsafebox' /></template>
            <template #default>标记加密</template>
          </a-doption>
          <a-doption v-show='isShowBtn' type='text' size='small' tabindex='-1' title='Ctrl+M'
                     @click="() => menuFileClearHistory(istree)">
            <template #icon><i class='iconfont iconshipin' /></template>
            <template #default>清除历史</template>
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
          <a-doption v-show='isselected && !isselectedmulti'
                     @click='() => menuCopyFileTree()'>
            <template #icon><i class='iconfont iconnode-tree1' /></template>
            <template #default>复制目录树</template>
          </a-doption>
        </template>
      </a-dsubmenu>
    </template>
  </a-dropdown>
</template>
<style></style>

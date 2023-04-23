<script lang="ts">
import { defineComponent } from 'vue'

import { handleUpload } from '../topbtns/topbtn'

import { modalCreatNewFile, modalCreatNewDir, modalDaoRuShareLink } from '../../utils/modal'
import {useAppStore} from "../../store";

export default defineComponent({
  methods: {useAppStore},
  props: {
    dirtype: {
      type: String,
      required: true
    },
    isselected: {
      type: Boolean,
      required: true
    }
  },
  setup() {
    return { modalCreatNewFile, modalCreatNewDir, handleUpload, modalDaoRuShareLink }
  }
})
</script>
<template>
    <div v-show="useAppStore().appTab === 'pan'">
    <a-dropdown  trigger="click" class="toppanbtn-plus">
        <a-button class="plus-button" tabindex="-1"><i class="fa-solid fa-circle-plus iconsize-plus"></i></a-button>
        <template #content>
            <a-menu>
                <a-menu-item-group title="新建">
                    <a-menu-item key="newfile" @click="modalCreatNewFile">
                        <i class="fa-solid fa-file-circle-plus iconsize" slot="icon"></i>
                        文件
                    </a-menu-item>
                    <a-menu-item key="newfolder" @click="() => modalCreatNewDir('folder')">
                        <i class="fa-solid fa-folder-plus iconsize" slot="icon"></i>
                        文件夹
                    </a-menu-item>
                    <a-menu-item key="newdatefolder" @click="() => modalCreatNewDir('datefolder')">
                        <i class="fa-solid fa-folder-plus iconsize" slot="icon"></i>
                        日期+序号
                    </a-menu-item>
                </a-menu-item-group>
                <a-menu-item-group title="上传">
                <a-menu-item key="uploadfile" @click="() => handleUpload('file')">
                    <i class="fa-solid fa-file-upload iconsize" slot="icon"></i>
                    文件
                </a-menu-item>
                <a-menu-item key="uploaddir" @click="() => handleUpload('folder')">
                    <i class="fa-solid fa-folder-open iconsize" slot="icon"></i>
                    文件夹
                </a-menu-item>
                </a-menu-item-group>
                <a-menu-item-group title="分享">
                <a-menu-item key="importshare" @click="modalDaoRuShareLink">
                    <i class="fa-solid fa-external-link iconsize" slot="icon"></i>
                    导入分享
                </a-menu-item>
                </a-menu-item-group>
            </a-menu>
        </template>
    </a-dropdown>
    </div>
</template>
<style>
.toppanbtn-plus {
  position: relative !important;
  max-width: 220px !important;
}
.plus-button {
  background-color: transparent !important;
  border: none !important;
  position: absolute !important;
  right: 0 !important;
}

.iconsize {
  font-size: 1.5em !important;
}

.iconsize-plus {
  font-size: 2.5em !important;
}

</style>

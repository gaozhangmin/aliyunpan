<script setup lang="ts">
import { modalCloseAll } from '../../utils/modal'
import { PropType, ref } from 'vue'
import MySwitch from '../../layout/MySwitch.vue'
import useSettingStore from '../../setting/settingstore'
import { IAliGetFileModel } from '../../aliapi/alimodels'
import { humanSize } from '../../utils/format'
import { IRawUrl } from '../../utils/proxyhelper'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  fileInfo: {
    type: Object as PropType<IAliGetFileModel>,
    required: true
  },
  qualityData: {
    type: Object as PropType<IRawUrl>,
    required: true
  },
  callback: {
    type: Function as PropType<(quality: string) => void>
  }
})

const settingStore = useSettingStore()
const okLoading = ref(false)
const qualitySelect = ref('')
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const handleOpen = () => {
  qualitySelect.value = settingStore.uiVideoQuality
  if (!props.qualityData?.qualities.some(q => q.quality === qualitySelect.value)) {
    qualitySelect.value = props.qualityData?.qualities.find(v => v.width)?.quality || ''
  }
}
const handleHide = () => {
  modalCloseAll()
}
const handleClose = () => {
  qualitySelect.value = ''
  if (okLoading.value) {
    okLoading.value = false
  }
  modalCloseAll()
}
const handleOK = () => {
  okLoading.value = true
  if (settingStore.uiVideoQualityLastSelect) {
    cb({ uiVideoQuality: qualitySelect.value })
  }
  if (props.callback) {
    props.callback(qualitySelect.value)
  }
  okLoading.value = false
  modalCloseAll()
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass videoqualitymodal'
           :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @close='handleClose' @before-open='handleOpen'>
    <template #title>
      <span class='modaltitle'>选择播放清晰度</span>
    </template>
    <div class="modalbody" style="width: 460px;">
      <a-typography-title :heading="3" style="margin-top: -25px">
        {{ fileInfo.name }}
      </a-typography-title>
      <a-space align="start" size="mini">
        <a-typography>
          <a-typography-paragraph style="min-width: fit-content">
            <a-space direction="vertical" :size="18" style="min-height: 145px">
              <a-typography-text>
                <span>大小：{{ humanSize(fileInfo.size) }}</span>
              </a-typography-text>
              <a-typography-text>
                <span>
                  分辨率：{{ fileInfo.media_width ? fileInfo.media_width + 'x' + fileInfo.media_height : '未知' }}
                </span>
              </a-typography-text>
              <a-typography-text v-if="fileInfo.media_duration">
                <span>总时长：{{ fileInfo.media_duration }}</span>
              </a-typography-text>
              <a-typography-text v-if="fileInfo.media_play_cursor">
                <span>已看时长：{{ fileInfo.media_play_cursor }}</span>
              </a-typography-text>
            </a-space>
          </a-typography-paragraph>
        </a-typography>
        <a-image
          style="margin-left: 60px"
          width="260px"
          height="145px"
          show-loader
          :src="fileInfo.thumbnail"
        />
      </a-space>
      <div class='settinghead'>:清晰度快捷设置</div>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiVideoQualityTips'
                  @update:value='cb({ uiVideoQualityTips: $event })'>
          观看视频前 提示选择清晰度
        </MySwitch>
      </div>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiVideoQualityLastSelect'
                  @update:value='cb({ uiVideoQualityLastSelect: $event })'>
          记忆上次选择的清晰度
        </MySwitch>
      </div>
      <div class='settingspace'></div>
      <div class='settinghead'>:选择播放清晰度</div>
      <div class='settingrow'>
        <a-space>
          <a-radio-group v-model:model-value="qualitySelect">
            <template v-for="(item, index) in qualityData.qualities" :key="index">
              <a-radio :value="item.quality" style="margin-right: 2px">
                <template #radio="{ checked }">
                  <a-tag size="large" bordered color="orangered" :checked="checked" checkable>
                    <template v-if="checked" #icon>
                      <i class="iconfont iconcheck"></i>
                    </template>
                    {{ item.label }}
                  </a-tag>
                </template>
              </a-radio>
            </template>
          </a-radio-group>
        </a-space>
      </div>
    </div>
    <template #footer>
      <div class='modalfoot'>
        <div style='flex-grow: 1'></div>
        <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
        <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>播放</a-button>
      </div>
    </template>
  </a-modal>
</template>

<style scoped>
.videoqualitymodal .arco-modal-header {
  border-bottom: none;
}

.videoqualitymodal .arco-modal-body {
  margin-left: 16px;
  overflow: hidden;
  padding: 0 16px 16px 16px !important;
}
</style>
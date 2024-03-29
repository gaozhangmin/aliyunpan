<script setup lang='ts'>
import { modalCloseAll } from '../../utils/modal'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  msg: {
    type: String,
    required: true
  },
  msgid: {
    type: String,
    required: true
  }
})
const handleHide = () => {
  localStorage.setItem('postmodal', props.msgid)
  modalCloseAll()
}
const handleOK = () => {
  localStorage.setItem('postmodal', props.msgid)
  modalCloseAll()
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass postmodal' :mask='false' :footer='false' :unmount-on-close='true'
           :mask-closable='false' @cancel='handleHide'>
    <template #title>
      <span class='modaltitle' style="max-width: 540px">公告</span>
    </template>
    <div class='modalbody' style='max-height: calc(80vh - 100px); overflow-y: scroll'>
      <a-typography>
        <a-typography-title :heading='5' class='posttitle'>公告</a-typography-title>
        <a-typography-paragraph class='postdesc'>
          {{ msg }}
        </a-typography-paragraph>
      </a-typography>

      <br />
      <br />
    </div>
    <div class='modalfoot'>
      <div style='flex-grow: 1'></div>
      <a-button type='outline' size='small' @click='handleOK'>我知道了</a-button>
    </div>
  </a-modal>
</template>

<style>
.postmodal {
  background: -webkit-linear-gradient(-70deg, #2188ff 0%, #804eda 100%);
  border-radius: 8px !important;
}

.postmodal .arco-modal-header {
  border: none !important;
}

.postmodal .modaltitle {
  color: #ffffff !important;
}

.postmodal .posttitle {
  background: -webkit-linear-gradient(-70deg, #ff7170 0%, #ffe57f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  box-decoration-break: clone;
  font-weight: bold;
}

.postdesc {
  font-size: 14px;
  line-height: 22px;
  color: #fff !important;
  opacity: 0.9;
}

.postmodal .arco-modal-close-btn .arco-icon-hover {
  background-color: #ffffff !important;
}

.postmodal .arco-btn-outline {
  color: #ffffff !important;
  border: 1px solid #ffffff99 !important;
}

.postmodal .arco-modal-body {
  padding: 0 16px 16px 16px !important;
}
</style>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup(props) {
    const visible = ref(false)
    return { visible }
  },
  methods: {
    handleHide() {
      this.visible = false
      localStorage.setItem('alphamodal', 'click')
    },
    handleOK() {
      this.visible = false
      localStorage.setItem('alphamodal', 'click')
    }
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass alphamodal" :mask="false" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide">
    <template #title>
      <span class="modaltitle">提示</span>
    </template>
    <div class="modalbody" style="width: 320px">
      <a-typography>
        <a-typography-title :heading="5" class="alphatitle">这是Beta测试版本</a-typography-title>
        <a-typography-paragraph class="alphadesc">
          <br/><p>这个版已经拥有了上传下载功能，但可能并不是很稳定，还有很多功能正在开发完善中，不太适合日常使用。</p>
          <p>如有问题请打开【帮助文档】到GitHub查阅反馈！</p>
        </a-typography-paragraph>
      </a-typography>

      <br />
      <br />
    </div>
    <div class="modalfoot">
      <div style="flex-grow: 1"></div>
      <a-button type="outline" size="small" @click="handleOK">我知道了</a-button>
    </div>
  </a-modal>
</template>

<style>
.alphamodal {
  background: -webkit-linear-gradient(-70deg, #2188ff 0%, #804eda 100%);
  border-radius: 8px !important;
}

.alphamodal .arco-modal-header {
  border: none !important;
}
.alphamodal .modaltitle {
  color: #ffffff !important;
}
.alphamodal .alphatitle {
  background: -webkit-linear-gradient(-70deg, #ff7170 0%, #ffe57f 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  box-decoration-break: clone;
  font-weight: bold;
}
.alphadesc {
  font-size: 14px;
  line-height: 22px;
  color: #fff !important;
  opacity: 0.9;
}

.alphamodal .arco-modal-close-btn .arco-icon-hover {
  background-color: #ffffff !important;
}

.alphamodal .arco-btn-outline {
  color: #ffffff !important;
  border: 1px solid #ffffff99 !important;
}

.alphamodal .arco-modal-body {
  padding: 0 16px 16px 16px !important;
}
</style>

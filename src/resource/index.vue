<template>
  <div>
    <iframe class='custom-webview' src="https://4kysxz.top/" ref="iframe"></iframe>
  </div>
</template>

<script lang="ts">

import {modalDaoRuShareLink} from "../utils/modal";

export default {
  mounted() {
    const iframe = this.$refs.iframe

    // 监听 iframe 页面的 load 事件
    iframe.addEventListener('load', () => {
      // // 获取 iframe 内部的 document 对象
      const iframeDocument = iframe.contentDocument || iframe.contentWindow.document
      setTimeout(() => {
        const element = iframeDocument.querySelector('.swal2-close')
        if (element) {
          element.click()
        }
      }, 50)

      iframeDocument.addEventListener('click', (event:any) => {
        // 获取点击的目标元素
        const target = event.target

        // 获取点击的 URL
        const url = target.href || ''
        if (url.startsWith('magnet') || url.includes('aliyundrive')) {
          event.preventDefault()
        }
        if (url.includes('aliyundrive')) {
          modalDaoRuShareLink(url)
        } else if (url.startsWith('magnet')) {
          console.log('磁力链接:', url)
        }
      })
    })
  }
}
</script>

<style scoped>
.custom-webview {
  width: 100%;
  height: 900px;
}
</style>

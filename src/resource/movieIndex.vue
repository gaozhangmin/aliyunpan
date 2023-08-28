<template>
  <div class="fullscroll" style="padding-left: 12px; padding-right: 16px; overflow-x: hidden">
    <iframe class="custom-webview" src="https://4kysxz.top/" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { modalDaoRuShareLink } from '../utils/modal';
import { IAliGetFileModel } from '../aliapi/alimodels'
import { useSettingStore, useUserStore } from '../store'
import path from 'path'
import { humanSize } from '../utils/format'
import UserDAL from '../user/userdal'
import DownDAL from '../down/DownDAL'


export default {
  setup: function() {
    const iframeRef = ref(null)
    onMounted(() => {
      const iframe = iframeRef.value

      if (iframe) {
        // @ts-ignore
        iframe.addEventListener('load', () => {
          // @ts-ignore
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document

          const element = iframeDocument.querySelector('.swal2-close')
          if (element) {
            element.click()
          }
          const iframeElements = iframeDocument.querySelectorAll('iframe[src^="https://player.bilibili.com/"]')
          // @ts-ignore
          iframeElements.forEach((iframeElement) => {
            if (iframeElement) {
              iframeElement.remove()
            }
          })

          iframeDocument.addEventListener('click', (event: any) => {
            const target = event.target
            const url = target.href || ''

            if (url.includes('aliyundrive')) {
              event.preventDefault()
              modalDaoRuShareLink(url)
            }
          })
        })
      }
    })

    return {
      iframeRef
    }
  }
}
</script>

<style scoped>
.custom-webview {
  width: 100%;
  height: 1000px;
}
.fullscroll {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>

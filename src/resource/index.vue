<template>
  <div>
    <iframe class="custom-webview" src="https://4kysxz.top/" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { modalDaoRuShareLink } from '../utils/modal';

export default {
  setup() {
    const iframeRef = ref(null)

    onMounted(() => {
      const iframe = iframeRef.value

      if (iframe) {
        iframe.addEventListener('load', () => {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

          setInterval(() => {
            const element = iframeDocument.querySelector('.swal2-close')
            if (element) {
              element.click()
            }
            const iframeElements = iframeDocument.querySelectorAll('iframe[src^="https://player.bilibili.com/"]');

            iframeElements.forEach((iframeElement) => {
              if (iframeElement) {
                iframeElement.remove();
              }
            });

          }, 50);

          iframeDocument.addEventListener('click', (event: any) => {
            const target = event.target
            const url = target.href || ''

            if (url.includes('aliyundrive')) {
              event.preventDefault()
              modalDaoRuShareLink(url)
            } else if (url.startsWith('magnet')) {
              event.preventDefault()
              // todo downloa magnet
              console.log('磁力链接:', url)
            }
          });
        });
      }
    });

    return {
      iframeRef
    }
  }
}
</script>

<style scoped>
.custom-webview {
  width: 100%;
  height: 900px;
}
</style>

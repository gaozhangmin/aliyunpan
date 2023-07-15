<template>
  <div>
    <iframe class="custom-webview" src="https://www.pansearch.me" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { modalDaoRuShareLink } from '../utils/modal';

export default {
  setup() {
    const iframeRef = ref(null);

    onMounted(() => {
      const iframe = iframeRef.value;

      if (iframe) {
        iframe.addEventListener('load', () => {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

          const intervalId = setInterval(() => {
            const element = iframeDocument.querySelector('._ntlgt3m ')
            if (element) {
              element.click()
              clearInterval(intervalId)
            }

          }, 100);
          const intervalId2 = setInterval(() => {
            // 查找所有的 tab 元素
            const tabs = iframeDocument.querySelectorAll('.tab')

            // 自动点击元素
            const targetTab = document.querySelector('.tab:nth-child(2)')
            if (targetTab) {
              targetTab.click()
            }

            // 删除其他 tab 元素
            tabs.forEach(tab => {
              if (tab !== targetTab) {
                tab.remove()
              }
            })
            const footElement = iframeDocument.querySelector('.flex.flex-wrap.gap-2')
            if (footElement) {
              footElement.remove()
            }
            const header = iframeDocument.querySelector('.navbar.bg-neutral.text-neutral-content')
            if (header) {
              header.remove()
            }
            const divider = iframeDocument.querySelector('.divider')
            if (divider) divider.remove()
            const warn = iframeDocument.querySelector('.alert.alert-warning.shadow-lg')
            if (warn) warn.remove()
          }, 100)

          iframeDocument.addEventListener('click', (event: any) => {
            const target = event.target;
            const url = target.href || '';

            if (url.includes('aliyundrive')) {
              event.preventDefault();
              modalDaoRuShareLink(url);
            } else {
              if (!url.includes('pansearch.me')) {
                event.preventDefault();
              }
            }
          })
        })
      }
    })
    return {
      iframeRef
    };
  }
};
</script>

<style scoped>
.custom-webview {
  width: 100%;
  height: 800px;
}
</style>

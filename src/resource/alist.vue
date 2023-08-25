<template>
  <div class="fullscroll" style="padding-left: 12px; padding-right: 16px; overflow-x: hidden">
    <iframe class="custom-webview" :src="iframeSrc" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import useSettingStore from '../setting/settingstore'

export default {
  setup() {
    const iframeRef = ref(null);
    const iframeSrc = ref(''); // 初始的 iframe URL

    onMounted(() => {
      // setTimeout(() => {
      //   iframeSrc.value = 'http://127.0.0.1:5244/'d
      // }, 3000)
      const iframe = iframeRef.value

      if (iframe) {
        const intervalId = setInterval(() => {
          iframeSrc.value = ''
          iframeSrc.value = 'http://127.0.0.1:5244/'
          // @ts-ignore
          iframe.addEventListener('load', () => {
            // @ts-ignore
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document

            const usernameInput = iframeDocument.querySelector('input[name="username"]');
            const passwordInput = iframeDocument.querySelector('input[name="password"]');
            const loginButton = iframeDocument.querySelector('.login-button');

            if (usernameInput && passwordInput && loginButton && useSettingStore().alistPwd != '') {
              // @ts-ignore
              usernameInput.value = 'admin';
              // @ts-ignore
              passwordInput.value = useSettingStore().alistPwd
              // @ts-ignore
              loginButton.click();
              clearInterval(intervalId)
            }
          });
        }, 1000)

      }
    })

    return {
      iframeRef,
      iframeSrc
    };
  }
};
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

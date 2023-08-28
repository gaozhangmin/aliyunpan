<template>
  <div class="fullscroll" style="padding-left: 12px; padding-right: 16px; overflow-x: hidden">
    <iframe class="custom-webview" :src="iframeSrc" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const iframeRef = ref(null);
    const iframeSrc = ref(''); // 初始的 iframe URL

    onMounted(() => {
      setTimeout(() => {
        iframeSrc.value = 'http://127.0.0.1:5244/'
        iframeSrc.value = ''
        iframeSrc.value = 'http://127.0.0.1:5244/'
        console.log("reset url")
      }, 10000)
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

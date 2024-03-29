<script lang="ts">
import {defineComponent} from "vue";
import { shell } from 'electron'
import { useServerStore } from '../store'

export default defineComponent({
  name: 'vipInfo',
  setup() {
    const openExternalLink = (targetUrl: string) => {
      shell.openExternal(targetUrl); // 使用外部浏览器打开链接
    }
    return {
      openExternalLink,
      useServerStore
    }
  }
})


</script>

<template>
  <div class="ml-80 mt-52">
    <img :src="useServerStore().salesUrl"  alt="公众号">
  </div>
</template>
<style>

</style>

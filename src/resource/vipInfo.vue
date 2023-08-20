<script lang="ts">
import {defineComponent} from "vue";
import { shell } from 'electron'

export default defineComponent({
  name: 'vipInfo',
  setup() {
    const openExternalLink = (targetUrl: string) => {
      shell.openExternal(targetUrl); // 使用外部浏览器打开链接
    }
    return {
      openExternalLink
    }
  }
})


</script>

<template>
  <div class="container1">
      <div class="content-text3">
        <div class="image-container2">
<!--          <a id='imageLink' @click="openExternalLink('https://kdocs.cn/l/cvpwcQWAA22Q')">-->
<!--            <img src="/images/ads.jpg" alt="公众号" width='1025' height='200' style='margin-bottom: 10px'>-->
<!--          </a>-->
          <img src="/images/sales.png"  alt="公众号">
        </div>
      </div>
  </div>
</template>
<style>
.image-viptext2 {
  text-indent: 200px;
  color: red;
  margin-top: 20px;
  font-size: medium;
  font-weight: bold;
}
.image-container2 {
  margin-top: 50px;
  text-align: center;
}

</style>

<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
    name: 'SponsorInfo',
    setup() {
        return {}
    }
})
</script>

<template>
  <a-popover position="br" trigger="hover">
    <a-avatar  :size="28" style="margin-right: 12px"><img src="/thumbup.svg"  alt="图标"/></a-avatar>

      <template #content>
          <div class="container">
              <div class="content">
                  <div class="content-text">
                      <div class="image-container">
                          <img src="/images/qrcode_258.jpg" alt="公众号">
                          <img src="/images/wechat_award.jpeg" alt="赞赏码">
                      </div>
                      <p class="image-text"> 关注小白羊公众号，获取最新版本</p>
                  </div>
              </div>
          </div>
      </template>
  </a-popover>
</template>
<style>

</style>

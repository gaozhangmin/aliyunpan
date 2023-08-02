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
          <div class="container1">
              <div class="content2">
                  <div class="content-text3">
                      <div class="image-container">
                          <img src="/images/qrcode_258.jpg" alt="公众号">
                          <img src="/images/wechat_award.jpeg" alt="赞赏码">
                      </div>
                      <p class="image-text2">软件免费，开发不易，请关注小白羊公众号获取最新版本。</p>
                  </div>
              </div>
          </div>
      </template>
  </a-popover>
</template>
<style>
.image-text2 {
    text-indent: 70px;
    color: red;
    font-weight: bold;
}
.image-container {
    text-align: center;
}
</style>

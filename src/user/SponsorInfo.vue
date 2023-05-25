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
                      <div class="image-container1">
                          <img src="/images/qrcode_258.jpg" alt="公众号">
                          <img src="/images/wechat_award.jpeg" alt="赞赏码">
                      </div>
                      <p class="image-text2">关注小白羊公众号，获取最新版本。
                        软件免费，您的关注是我继续更新的动力。</p>
                  </div>
              </div>
          </div>
      </template>
  </a-popover>
</template>
<style>
.image-text2 {
    text-indent: 30px;
    color: red;
    font-weight: bold;
}
</style>

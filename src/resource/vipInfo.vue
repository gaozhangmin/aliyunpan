<script lang="ts">
import {defineComponent} from "vue";

export default defineComponent({
  name: 'vipInfo',
  setup() {
    return {}
  }
})
</script>

<template>
  <div class="container1">
      <div class="content-text3">
        <p class="image-viptext2">会员开放功能，购买任意类型会员后可解锁。请支持小白羊继续维护下去</p>
        <div class="image-container2">
          <img src="/images/WechatIMG89.png" alt="公众号">
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

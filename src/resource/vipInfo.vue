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
        <div class="image-container3">
          <img src="/images/3AyY.gif" alt="GIF">
        </div>

        <div class="image-container2">
          <img src="/images/20tb.jpeg" alt="公众号">
        </div>
        <p class="image-viptext2">限制会员功能，购买任意类型会员后可解锁。请支持小白羊继续维护下去。</p>
      </div>
  </div>
</template>
<style>
.image-viptext2 {
  text-indent: 500px;
  color: red;
  font-size: medium;
  font-weight: bold;
}
.image-container2 {
  margin-top: 0px;
  text-align: center;
}
.image-container3 {
  text-align: center;
}

</style>

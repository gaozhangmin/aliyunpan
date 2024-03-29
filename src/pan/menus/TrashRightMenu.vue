<script setup lang="ts">
import { menuTrashSelectFile, topRecoverSelectedFile, topRestoreSelectedFile } from '../topbtns/topbtn'

const props = defineProps({
  dirtype: {
    type: String,
    required: true
  }
})

</script>

<template>
  <a-dropdown id="rightpantrashmenu" class="rightmenu" :popup-visible="true"
              style="z-index: -1; left: -200px; opacity: 0">
    <template #content>
      <a-doption v-show="dirtype == 'recover'" @click="topRecoverSelectedFile">
        <template #icon><i class="iconfont iconrecover" /></template>
        <template #default>恢复选中</template>
      </a-doption>
      <a-doption v-show="dirtype == 'trash'" @click="topRestoreSelectedFile">
        <template #icon><i class="iconfont iconrecover" /></template>
        <template #default>还原选中</template>
      </a-doption>

      <a-doption v-show="dirtype == 'trash'" @click="() => menuTrashSelectFile(false, true)">
        <template #icon><i class="iconfont iconrest" /></template>
        <template #default>彻底删除</template>
      </a-doption>
    </template>
  </a-dropdown>
</template>
<style></style>

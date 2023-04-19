<script lang="ts">
import { defineComponent } from 'vue'
import { topTrashDeleteAll, topRestoreSelectedFile, menuTrashSelectFile, topRecoverSelectedFile } from '../topbtns/topbtn'
export default defineComponent({
  props: {
    dirtype: {
      type: String,
      required: true
    },
    isselected: {
      type: Boolean,
      required: true
    }
  },
  setup() {
    return { topTrashDeleteAll, topRestoreSelectedFile, menuTrashSelectFile, topRecoverSelectedFile }
  }
})
</script>

<template>
  <div class="toppanbtns" style="height: 30px" tabindex="-1">
    <div v-show="dirtype == 'trash'" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" class="danger" @click="topTrashDeleteAll"><i class=" fa-solid fa-trash-alt" />清空回收站</a-button>
    </div>
    <div v-show="dirtype == 'trash' && isselected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" @click="topRestoreSelectedFile"><i class="fa-solid fa-trash-restore" />还原选中</a-button>
      <a-button type="text" size="small" tabindex="-1" class="danger" @click="() => menuTrashSelectFile(false, true)"><i class="fa-solid fa-trash" />彻底删除</a-button>
    </div>

    <div v-show="dirtype == 'recover' && isselected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" @click="topRecoverSelectedFile"><i class="fa-solid fa-trash-restore" />恢复选中</a-button>
    </div>
  </div>
</template>
<style>
</style>

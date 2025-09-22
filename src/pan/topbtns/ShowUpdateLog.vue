<script setup lang='ts'>
import { modalCloseAll } from '../../utils/modal'
import { nextTick, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import AliHttp from '../../aliapi/alihttp'
import { b64decode } from '../../utils/format'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

interface IUpdateRespData {
  id: number
  name: string
  tag_name: string
  url: string
  html_url: string
  body: string
  assets: {
    name: string
    browser_download_url: string
    download_count: string
    created_at: string
    updated_at: string
  }[]
}

const updateUrl = b64decode('aHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9nYW96aGFuZ21pbi9hbGl5dW5wYW4vcmVsZWFzZXM=')
const okLoading = ref(true)
const hasEmpty = ref(false)

const handleOpen = async () => {
  const resp = await AliHttp.Get(updateUrl, '')
  const updateData = resp.body as IUpdateRespData[]
  const updateLog = updateData && updateData.map(up => `## ${up.name} \r\n${up.body}`).join('\r\n')
  setTimeout(() => { okLoading.value = false }, 200)
  await nextTick(() => {
    if (updateLog) {
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true
      }).disable(['link'])
      document.getElementById('markdown-content')!!.innerHTML = md.render(updateLog)
    } else {
      hasEmpty.value = true
    }
  })
}
const handleClose = () => {
  if (okLoading.value) {
    okLoading.value = false
  }
  if (hasEmpty.value) {
    hasEmpty.value = false
  }
}
const handleHide = () => {
  modalCloseAll()
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass'
           :footer='false' :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @close='handleClose' @before-open='handleOpen'>
    <template #title>
      <span class='modaltitle'>更新日志</span>
    </template>
    <div style='width: 120vw; max-width: 620px; height: calc(70vh)'>
      <div class='modalbody'>
        <a-skeleton v-show='okLoading' :loading='okLoading' :animation='true'>
          <a-skeleton-line :rows='5' :line-height='50' :line-spacing='50' />
        </a-skeleton>
        <a-empty v-show='!okLoading && hasEmpty' description='空文件夹' />
        <div class='list-container' v-show='!okLoading'>
          <div id='markdown-content' />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang='less'>
.list-container {
  overflow-y: auto;
  height: 100%;
  position: relative;
  scroll-behavior: smooth;
}
</style>
<script setup lang="ts">
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { onMounted, ref } from 'vue'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import { VueReader } from 'vue-reader'

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
})

const onKeyDown = (event: KeyboardEvent) => {
  const ele = (event.srcElement || event.target) as any
  const nodeName = ele && ele.nodeName
  if (document.body.getElementsByClassName('arco-modal-container').length) return
  if (event.key == 'Control' || event.key == 'Shift' || event.key == 'Alt' || event.key == 'Meta') return
  const isInput = nodeName == 'INPUT' || nodeName == 'TEXTAREA' || false
  if (!isInput) {
    keyboardStore.KeyDown(event)
  }
}

const appStore = useAppStore()
const book = appStore.pageBook!
const bookUrl = ref(book.download_url)


onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = book?.file_name || '阅读器'
  console.log(book.download_url)
  setTimeout(() => {
    document.title = name
  }, 1000)
  loadCode()
})

const handleHideClick = (_e: any) => {
  window.close()
}
const handleMinClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'minsize' })
}
const handleMaxClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'maxsize' })
}

const loadCode = () => {
  const pageBook = appStore.pageBook!
  bookUrl.value = pageBook.download_url
}
</script>

<template>
  <a-layout style="height: 100vh" draggable="false">
    <a-layout-header  id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile-txt"></i>
        </a-button>
        <div class="title">{{ appStore.pageBook?.file_name || '文档在线预览' }}</div>
        <div class="flexauto"></div>
        <a-button type='text' tabindex='-1' title='最小化 Alt+M' @click='handleMinClick'>
          <i class='iconfont iconzuixiaohua'></i>
        </a-button>
        <a-button type='text' tabindex='-1' title='最大化 Alt+Enter' @click='handleMaxClick'>
          <i class='iconfont iconfullscreen'></i>
        </a-button>
        <a-button type='text' tabindex='-1' title='关闭 Alt+F4' @click='handleHideClick'>
          <i class='iconfont iconclose'></i>
        </a-button>
      </div>
    </a-layout-header>
    <a-layout-content style="height: calc(100vh - 42px); padding: 12px 16px 12px 16px">
      <div style='height: 100vh'>
        <VueReader :url=bookUrl />
      </div>
    </a-layout-content>
  </a-layout>

</template>

<style>

</style>

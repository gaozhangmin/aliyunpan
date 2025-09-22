<script setup lang="ts">
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { onMounted } from 'vue'
import { TestAlt, TestKey } from '../utils/keyboardhelper'

declare namespace aliyun {
  class Config {
    setToken(token: { token: string }): any
  }

  // eslint-disable-next-line no-unused-vars
  function config({ mount, url }: { mount: Element; url: string }): Config
}

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

const handleHideClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'close' })
}
const handleMinClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'minsize' })
}
const handleMaxClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'maxsize' })
}
const appStore = useAppStore()

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const docOptions = aliyun.config({
    mount: document.querySelector('#doc-preview')!,
    url: appStore.pageOffice?.preview_url || ''
  })
  docOptions.setToken({ token: appStore.pageOffice?.access_token || '' })
  const doc = document.getElementById('iframe-preview')
  if (doc) doc.setAttribute('src', appStore.pageOffice?.preview_url || '')
  const name = appStore.pageOffice?.file_name || '文档在线预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  setTimeout(() => {
    document.title = name
  }, 10000)
})
</script>

<template>
  <a-layout style="height: 100vh; background: #f2f4f7" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile-wps"></i>
        </a-button>
        <div class="title">{{ appStore.pageOffice?.file_name || '文档在线预览' }}</div>
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
    <a-layout-content style="height: calc(100vh - 42px); padding-top: 8px; background: #f2f4f7">
      <div id="doc-preview" class="doc-preview" style="width: 100%; height: 100%"></div>
    </a-layout-content>
  </a-layout>
</template>

<style></style>

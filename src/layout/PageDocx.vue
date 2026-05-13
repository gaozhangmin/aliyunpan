<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { renderAsync } from 'docx-preview'
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import message from '../utils/message'

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
})

const appStore = useAppStore()
const viewerRef = ref<HTMLDivElement>()
const loading = ref(true)
const errorText = ref('')

const onKeyDown = (event: KeyboardEvent) => {
  const ele = (event.srcElement || event.target) as any
  const nodeName = ele && ele.nodeName
  if (document.body.getElementsByClassName('arco-modal-container').length) return
  if (event.key == 'Control' || event.key == 'Shift' || event.key == 'Alt' || event.key == 'Meta') return
  const isInput = nodeName == 'INPUT' || nodeName == 'TEXTAREA' || false
  if (!isInput) keyboardStore.KeyDown(event)
}

const handleHideClick = (_e?: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'close' })
}
const handleMinClick = (_e?: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'minsize' })
}
const handleMaxClick = (_e?: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'maxsize' })
}

const loadDocx = async () => {
  const url = appStore.pageDocx?.preview_url || ''
  if (!url) {
    errorText.value = 'Word 预览地址为空'
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    await nextTick()
    if (!viewerRef.value) throw new Error('无法创建 Word 预览区域')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Word 文件下载失败：${response.status}`)
    const blob = await response.blob()
    viewerRef.value.innerHTML = ''
    await renderAsync(blob, viewerRef.value, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      renderComments: false,
      useBase64URL: true
    })
  } catch (err: any) {
    errorText.value = err?.message || 'Word 预览失败'
    message.error(errorText.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = appStore.pageDocx?.file_name || 'Word 预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  loadDocx()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
})
</script>

<template>
  <a-layout style="height: 100vh; background: #f2f4f7" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile-doc"></i>
        </a-button>
        <div class="title">{{ appStore.pageDocx?.file_name || 'Word 预览' }}</div>
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
    <a-layout-content style="height: calc(100vh - 42px); background: #f2f4f7">
      <div class="docx-preview-shell">
        <a-spin v-if="loading" class="docx-loading" :size="32" tip="加载中..." />
        <a-empty v-if="!loading && errorText" class="docx-error" :description="errorText" />
        <div ref="viewerRef" class="docx-viewer"></div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.docx-preview-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
}

.docx-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
}

.docx-error {
  margin-top: 120px;
}

.docx-viewer {
  width: fit-content;
  min-width: min(100%, 760px);
  margin: 0 auto;
}

.docx-viewer :deep(.docx-wrapper) {
  background: transparent;
  padding: 0;
}

.docx-viewer :deep(section.docx) {
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.18);
}
</style>

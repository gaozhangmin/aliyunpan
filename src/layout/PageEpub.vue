<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ePub from 'epubjs'
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
const locationText = ref('')

let book: any = null
let rendition: any = null

const onKeyDown = (event: KeyboardEvent) => {
  const ele = (event.srcElement || event.target) as any
  const nodeName = ele && ele.nodeName
  if (document.body.getElementsByClassName('arco-modal-container').length) return
  if (event.key == 'Control' || event.key == 'Shift' || event.key == 'Alt' || event.key == 'Meta') return
  const isInput = nodeName == 'INPUT' || nodeName == 'TEXTAREA' || false
  if (!isInput) {
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault()
      prevPage()
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault()
      nextPage()
      return
    }
    keyboardStore.KeyDown(event)
  }
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

const prevPage = () => {
  if (rendition) rendition.prev()
}

const nextPage = () => {
  if (rendition) rendition.next()
}

const loadEpub = async () => {
  const url = appStore.pageEpub?.preview_url || ''
  if (!url) {
    errorText.value = 'EPUB 预览地址为空'
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    await nextTick()
    if (!viewerRef.value) throw new Error('无法创建 EPUB 阅读区域')
    book = ePub(url)
    rendition = book.renderTo(viewerRef.value, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none'
    })
    rendition.themes.default({
      body: {
        color: '#1f2937',
        background: '#ffffff',
        'font-size': '18px',
        'line-height': '1.75'
      },
      a: {
        color: '#2563eb'
      }
    })
    rendition.on('relocated', (location: any) => {
      if (location?.start?.displayed) {
        locationText.value = `${location.start.displayed.page} / ${location.start.displayed.total}`
      }
    })
    await rendition.display()
  } catch (err: any) {
    errorText.value = err?.message || 'EPUB 加载失败'
    message.error(errorText.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = appStore.pageEpub?.file_name || 'EPUB 预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  loadEpub()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  if (rendition) rendition.destroy()
  if (book) book.destroy()
})
</script>

<template>
  <a-layout style="height: 100vh; background: #f4f1ea" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconwenjian"></i>
        </a-button>
        <div class="title">{{ appStore.pageEpub?.file_name || 'EPUB 预览' }}</div>
        <div class="epub-toolbar q-electron-drag--exception">
          <a-button type="outline" size="mini" @click="prevPage">上一页</a-button>
          <span class="epub-page-text">{{ locationText || '-' }}</span>
          <a-button type="outline" size="mini" @click="nextPage">下一页</a-button>
        </div>
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
    <a-layout-content style="height: calc(100vh - 42px); background: #f4f1ea">
      <div class="epub-preview">
        <a-spin v-if="loading" class="epub-loading" :size="32" tip="加载中..." />
        <a-empty v-if="!loading && errorText" class="epub-error" :description="errorText" />
        <div ref="viewerRef" class="epub-viewer"></div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.epub-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.epub-page-text {
  min-width: 64px;
  color: var(--color-text-2);
  font-size: 12px;
  text-align: center;
}

.epub-preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
}

.epub-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
}

.epub-error {
  margin-top: 120px;
}

.epub-viewer {
  width: min(920px, 100%);
  height: 100%;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 2px 12px rgba(68, 52, 34, 0.16);
}
</style>

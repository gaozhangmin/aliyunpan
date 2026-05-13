<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url'
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import message from '../utils/message'

;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
})

const appStore = useAppStore()
const canvasRef = ref<HTMLCanvasElement>()
const pageNum = ref(1)
const pageCount = ref(0)
const scale = ref(1.15)
const loading = ref(true)
const errorText = ref('')

let pdfDoc: any = null
let loadingTask: any = null
let renderTask: any = null

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
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
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

const renderPage = async () => {
  if (!pdfDoc || !canvasRef.value) return
  loading.value = true
  errorText.value = ''
  try {
    if (renderTask) {
      renderTask.cancel()
      renderTask = null
    }
    const page = await pdfDoc.getPage(pageNum.value)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建 PDF 画布')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    renderTask = page.render({ canvasContext: context, viewport })
    await renderTask.promise
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      errorText.value = err?.message || 'PDF 渲染失败'
      message.error(errorText.value)
    }
  } finally {
    loading.value = false
  }
}

const loadPdf = async () => {
  const url = appStore.pagePdf?.preview_url || ''
  if (!url) {
    errorText.value = 'PDF 预览地址为空'
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    loadingTask = (pdfjsLib as any).getDocument({
      url,
      withCredentials: false,
      disableStream: false,
      disableRange: false
    })
    pdfDoc = await loadingTask.promise
    pageCount.value = Number(pdfDoc.numPages || 0)
    pageNum.value = 1
    await nextTick()
    await renderPage()
  } catch (err: any) {
    errorText.value = err?.message || 'PDF 加载失败'
    message.error(errorText.value)
    loading.value = false
  }
}

const prevPage = () => {
  if (pageNum.value > 1) pageNum.value -= 1
}

const nextPage = () => {
  if (pageNum.value < pageCount.value) pageNum.value += 1
}

const zoomOut = () => {
  scale.value = Math.max(0.5, Number((scale.value - 0.15).toFixed(2)))
}

const zoomIn = () => {
  scale.value = Math.min(3, Number((scale.value + 0.15).toFixed(2)))
}

watch([pageNum, scale], () => {
  renderPage()
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = appStore.pagePdf?.file_name || 'PDF 预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  loadPdf()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  if (renderTask) renderTask.cancel()
  if (loadingTask) loadingTask.destroy()
})
</script>

<template>
  <a-layout style="height: 100vh; background: #f2f4f7" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile-pdf"></i>
        </a-button>
        <div class="title">{{ appStore.pagePdf?.file_name || 'PDF 预览' }}</div>
        <div class="pdf-toolbar q-electron-drag--exception">
          <a-button type="outline" size="mini" :disabled="pageNum <= 1" @click="prevPage">上一页</a-button>
          <span class="pdf-page-text">{{ pageNum }} / {{ pageCount || '-' }}</span>
          <a-button type="outline" size="mini" :disabled="pageNum >= pageCount" @click="nextPage">下一页</a-button>
          <a-button type="outline" size="mini" @click="zoomOut">-</a-button>
          <span class="pdf-page-text">{{ Math.round(scale * 100) }}%</span>
          <a-button type="outline" size="mini" @click="zoomIn">+</a-button>
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
    <a-layout-content style="height: calc(100vh - 42px); background: #f2f4f7">
      <div class="pdf-preview">
        <a-spin v-if="loading" class="pdf-loading" :size="32" tip="加载中..." />
        <a-empty v-if="!loading && errorText" class="pdf-error" :description="errorText" />
        <canvas ref="canvasRef" class="pdf-canvas" />
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.pdf-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.pdf-page-text {
  min-width: 48px;
  color: var(--color-text-2);
  font-size: 12px;
  text-align: center;
}

.pdf-preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: center;
}

.pdf-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.pdf-error {
  margin-top: 120px;
}

.pdf-canvas {
  display: block;
  margin: 16px auto;
  background: #fff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.18);
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import message from '../utils/message'

type SheetRows = Array<Array<string | number | boolean | null>>

const MAX_ROWS = 2000
const MAX_COLS = 100

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
})

const appStore = useAppStore()
const loading = ref(true)
const errorText = ref('')
const sheetNames = ref<string[]>([])
const activeSheet = ref('')
const rows = ref<SheetRows>([])
const truncated = ref(false)

const visibleRows = computed(() => rows.value)
const maxColumnCount = computed(() => visibleRows.value.reduce((max, row) => Math.max(max, row.length), 0))

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

const renderSheet = (workbook: XLSX.WorkBook, name: string) => {
  const worksheet = workbook.Sheets[name]
  if (!worksheet) {
    rows.value = []
    return
  }
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: ''
  }) as SheetRows
  truncated.value = data.length > MAX_ROWS || data.some(row => row.length > MAX_COLS)
  rows.value = data.slice(0, MAX_ROWS).map(row => row.slice(0, MAX_COLS))
}

const changeSheet = (name: string, workbook?: XLSX.WorkBook) => {
  activeSheet.value = name
  if (workbook) {
    renderSheet(workbook, name)
  }
}

const loadSheet = async () => {
  const url = appStore.pageSheet?.preview_url || ''
  if (!url) {
    errorText.value = '表格预览地址为空'
    loading.value = false
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`表格文件下载失败：${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    sheetNames.value = workbook.SheetNames
    const firstSheet = workbook.SheetNames[0] || ''
    activeSheet.value = firstSheet
    renderSheet(workbook, firstSheet)
    ;(window as any).__boxplayerSheetWorkbook = workbook
  } catch (err: any) {
    errorText.value = err?.message || '表格预览失败'
    message.error(errorText.value)
  } finally {
    loading.value = false
  }
}

const handleSheetClick = (name: string) => {
  changeSheet(name, (window as any).__boxplayerSheetWorkbook)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = appStore.pageSheet?.file_name || '表格预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  loadSheet()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true)
  delete (window as any).__boxplayerSheetWorkbook
})
</script>

<template>
  <a-layout style="height: 100vh; background: #f2f4f7" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile-xsl"></i>
        </a-button>
        <div class="title">{{ appStore.pageSheet?.file_name || '表格预览' }}</div>
        <div class="sheet-tabs q-electron-drag--exception">
          <a-button
            v-for="name in sheetNames"
            :key="name"
            :type="name === activeSheet ? 'primary' : 'outline'"
            size="mini"
            @click="handleSheetClick(name)"
          >
            {{ name }}
          </a-button>
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
      <div class="sheet-preview-shell">
        <a-spin v-if="loading" class="sheet-loading" :size="32" tip="加载中..." />
        <a-empty v-if="!loading && errorText" class="sheet-error" :description="errorText" />
        <div v-if="!loading && !errorText" class="sheet-grid-wrap">
          <div v-if="truncated" class="sheet-limit">文件较大，只显示前 {{ MAX_ROWS }} 行、前 {{ MAX_COLS }} 列</div>
          <table class="sheet-grid">
            <thead>
              <tr>
                <th class="sheet-row-index"></th>
                <th v-for="col in maxColumnCount" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in visibleRows" :key="rowIndex">
                <th class="sheet-row-index">{{ rowIndex + 1 }}</th>
                <td v-for="col in maxColumnCount" :key="col">{{ row[col - 1] ?? '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.sheet-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 480px;
  margin-left: 12px;
  overflow: auto;
}

.sheet-preview-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sheet-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
}

.sheet-error {
  margin-top: 120px;
}

.sheet-grid-wrap {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #fff;
}

.sheet-limit {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 6px 10px;
  color: #7a4d00;
  background: #fff7e6;
  border-bottom: 1px solid #ffd591;
  font-size: 12px;
}

.sheet-grid {
  border-collapse: collapse;
  min-width: 100%;
  font-size: 12px;
  color: #1f2937;
}

.sheet-grid th,
.sheet-grid td {
  min-width: 96px;
  max-width: 320px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid #d9dee8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
}

.sheet-grid thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #eef2f7;
  color: #5b6472;
  font-weight: 500;
}

.sheet-grid .sheet-row-index {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 44px;
  width: 44px;
  max-width: 44px;
  background: #eef2f7;
  color: #5b6472;
  text-align: center;
  font-weight: 500;
}

.sheet-grid thead .sheet-row-index {
  z-index: 4;
}
</style>

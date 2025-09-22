<script setup lang="ts">
import AliFile from '../aliapi/file'
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import message from '../utils/message'
import { onMounted, ref } from 'vue'
import { TestAlt, TestKey } from '../utils/keyboardhelper'

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
const codeBlock = ref()
const lang = ref('language-' + appStore.pageCode?.code_ext || '')
const codeString = ref('')
const format = ref(false)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = appStore.pageCode?.file_name || '文档在线预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  setTimeout(() => {
    document.title = name
  }, 10000)

  loadCode()
})

const handleHideClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'close' })
}
const handleMinClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'minsize' })
}
const handleMaxClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'maxsize' })
}

const loadCode = () => {
  const pageCode = appStore.pageCode!
  AliFile.ApiFileDownText(pageCode.user_id, pageCode.drive_id, pageCode.file_id, pageCode.file_size, 512 * 1024, pageCode.encType, pageCode.password).then((data: any) => {
    if (pageCode.file_size > 512 * 1024) {
      message.info('文件较大，只显示了前 512KB 的内容')
    }
    let fext = pageCode.code_ext || 'plain'
    const fsub = data.substring(0, Math.min(200, data.length))
    if (fext == 'plain' && fsub.includes('<?xml')) {
      fext = 'xml'
      lang.value = 'language-xml'
    }
    if (fext == 'plain' && fsub.indexOf('{') >= 0 && fsub.indexOf(':') > 0 && fsub.indexOf('}') > 0 && fsub.indexOf('"') > 0) {
      fext = 'json'
      lang.value = 'language-json'
    }

    const nofromate = pageCode.file_size > 512 * 1024 || fext == 'plain'
    codeString.value = data
    format.value = nofromate

    if (nofromate) return
    setTimeout(() => {
      try {
        if (codeBlock.value) window.Prism.highlightAllUnder(codeBlock.value)
      } catch {
      }
    }, 500)
  })
}
</script>

<template>
  <a-layout style="height: 100vh" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i v-if="format" class="iconfont icondebug"></i>
          <i v-else class="iconfont iconfile-txt"></i>
        </a-button>
        <div class="title">{{ appStore.pageCode?.file_name || '文档在线预览' }}</div>
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
    <a-layout-content style="height: calc(100vh - 42px)">
      <div id="doc-preview" class="doc-preview" style="width: 100%; height: 100%; overflow: auto">
        <div ref="codeBlock" class="fullwidthcode">
          <pre v-if="format" :class="'line-numbers ' + lang + ' format'">
            <code>{{ codeString }}</code>
          </pre>
          <p v-else class="noformat">{{ codeString }}</p>
        </div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style>
.fullwidthcode {
  min-height: 100%;
  padding: 8px 0 8px 0;
}

.fullwidthcode .format {
  font-size: 14px;
  background-color: #1e1e1e66;
  user-select: text;
  -webkit-user-drag: auto;
  width: fit-content;
  white-space: pre-wrap;
  min-width: 100%;
}

.fullwidthcode .noformat {
  font-size: 14px;
  color: rgb(217, 217, 217);
  background-color: #1e1e1e66;
  user-select: text;
  -webkit-user-drag: auto;
  width: 100%;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-all;
  display: inline-block;
  min-width: 100%;
}

.fullwidthcode pre:focus {
  outline: none;
}

.fullwidthcode pre * {
  user-select: text;
  -webkit-user-drag: auto;
}
</style>

<script setup lang="ts">
import { KeyboardState, useAppStore, useKeyboardStore } from '../store'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'
import axios from 'axios'
import message from '../utils/message'
import { getEncType, getProxyUrl } from '../utils/proxyhelper'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import { t } from '../i18n'

const appStore = useAppStore()
const pageImage = appStore.pageImage!
let keyDowning = false

interface OneImageModel {
  index: number
  drive_id: string
  file_id: string
  name: string
  bigUrl: string
  smallUrl: string
  time: number
  size: number
  encType: string
}

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
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
let viewver: Viewer | undefined

const rawImageList = ref<OneImageModel[]>([])
const showIndex = ref(0)
const showName = ref('')
const isPlaying = ref(false)

const drive_id = pageImage.drive_id || ''
const file_id = pageImage.file_id || ''
const imageList = pageImage.imageList || []
const thirdPartyImageDrives = new Set(['cloud123', 'drive115', 'baidu', 'pikpak', 'quark', 'cloud139', 'cloud189', 'dropbox', 'onedrive', 'box', 'guangya'])

const rawList: OneImageModel[] = []
for (let i = 0, maxi = imageList.length; i < maxi; i++) {
  const add: OneImageModel = {
    index: i,
    drive_id: imageList[i].drive_id || drive_id,
    file_id: imageList[i].file_id,
    name: imageList[i].name,
    bigUrl: '',
    smallUrl: '',
    time: 0,
    size: imageList[i].size,
    encType: getEncType(imageList[i])
  }
  getImageUrl(add)
  rawList.push(add)
  if (imageList[i].file_id == file_id) {
    showIndex.value = i
  }
}
rawImageList.value = rawList

const onKeyDown = (event: any) => {
  if (pageImage.mode == 'fill') return
  event.stopPropagation()
  event.preventDefault()

  if (keyDowning) return
  keyDowning = true
  setTimeout(() => {
    keyDowning = false
  }, 200)

  if (event.code == 'ArrowRight') {
    goNextImage()
  } else if (event.code == 'ArrowLeft') {
    goLastImage()
  }

  const ele = (event.srcElement || event.target) as any
  const nodeName = ele && ele.nodeName
  if (document.body.getElementsByClassName('arco-modal-container').length) return
  if (event.key == 'Control' || event.key == 'Shift' || event.key == 'Alt' || event.key == 'Meta') return
  const isInput = nodeName == 'INPUT' || nodeName == 'TEXTAREA' || false
  if (!isInput) {
    keyboardStore.KeyDown(event)
  }
}
const goLastImage = () => {
  const fileIndex = showIndex.value - 1
  if (fileIndex < 0) {
    message.info(t('image.first'))
  } else {
    showIndex.value = fileIndex
    showImage()
  }
}
const goNextImage = () => {
  const imageList = rawImageList.value
  const fileIndex = showIndex.value + 1
  if (fileIndex >= imageList.length) {
    message.info(t('image.last'))
  } else {
    showIndex.value = fileIndex
    showImage()
  }
}
const goRefreshImage = () => {
  const imageList = rawImageList.value
  const image = imageList[showIndex.value]
  image.time = 0
  image.bigUrl = ''
  image.smallUrl = ''
  getImageUrl(image)
  showImage()
}
const modeChange = (mode: string) => {
  pageImage.mode = mode
  nextTick(() => showImage())
}

onMounted(() => {
  const name = pageImage.file_name || t('image.preview')
  document.title = name
  window.addEventListener('keydown', onKeyDown, true)

  showImage()
  preloadIndex = 1
  setTimeout(loadAllImg, 1000)
})
onUnmounted(() => {
  preloadIndex = -1
  window.removeEventListener('keydown', onKeyDown)
})

const showImage = () => {
  const imageList = rawImageList.value
  const fileIndex = showIndex.value

  const indexInfo = '[' + (fileIndex + 1).toString() + '/' + imageList.length.toString() + '] '
  const name = indexInfo + ' ' + imageList[fileIndex].name
  document.title = name
  showName.value = name

  let next = fileIndex + 1
  if (next < imageList.length) {

    if (imageList[next].time == 0) {
      preload(imageList[next])
    }
  }
  next = fileIndex + 2
  if (next < imageList.length) {

    if (imageList[next].time == 0) {
      preload(imageList[next])
    }
  }

  if (pageImage.mode == 'fill') {
    if (!viewver) {
      viewver = new Viewer(document.getElementById('images')!, {
        container: '#app',
        backdrop: 'static',
        keyboard: true,
        focus: true,
        loading: true,
        zIndex: 0,
        button: false,
        title: false,
        url: 'data-src',
        fullscreen: true,
        loop: false,
        // Large cloud images can make Viewer.js transition animation contend
        // with pinch/double-tap rendering. Keep gestures immediate and let
        // the browser compositor handle the transform.
        transition: false,
        zoomRatio: 0.2,
        play: () => {
          isPlaying.value = true
        },
        stop: () => {
          isPlaying.value = false
        },
        view: (e: any) => {
          const nextIndex = e.detail.index
          const imageList = rawImageList.value
          const rawImage = imageList[nextIndex]
          const indexInfo = '[' + rawImage.index.toString() + '/' + imageList.length.toString() + '] '
          const name = indexInfo + ' ' + rawImage.name
          document.title = name
          showIndex.value = nextIndex
          showName.value = name

          const ul = document.getElementsByClassName('viewer-list viewer-transition')
          if (ul && ul.length > 0) {
            const lilist = ul[0].childNodes

            for (let i = Math.max(0, nextIndex - 30), maxi = Math.min(nextIndex + 30, imageList.length); i < maxi; i++) {
              const imgNode = lilist[i].firstChild
              if (imgNode) {
                const img = imgNode as Element
                let src = img.getAttribute('src')
                const smallurl = imageList[i].smallUrl
                if (src != smallurl) img.setAttribute('src', smallurl)
                src = img.getAttribute('data-original-url')
                const bigurl = imageList[i].bigUrl
                if (src != bigurl) img.setAttribute('data-original-url', bigurl)
              }
            }
          }

          if (rawImage.index + 1 < imageList.length) preload(imageList[rawImage.index + 1])
          if (rawImage.index + 2 < imageList.length) preload(imageList[rawImage.index + 2])
        }
      })
    }
    viewver.view(fileIndex)
  } else {
    setTimeout(() => {
      const doc = document.getElementById('fullwidthimage')
      if (doc) {
        doc.scrollTop = 0
      }
    }, 200)
  }
}

let preloadIndex = 0
const loadAllImg = () => {
  if (preloadIndex && rawImageList.value && preloadIndex < rawImageList.value.length) {
    preload(rawImageList.value[preloadIndex])
    preloadIndex++
    if (preloadIndex < rawImageList.value.length) {
      setTimeout(loadAllImg, 2000)
    }
  }
}

function preload(img: OneImageModel) {
  return axios
    .get(img.bigUrl, {
      withCredentials: false,
      responseType: 'blob',
      timeout: 30000
    })
    .then(() => {
      img.time = new Date().getTime()
    })
    .catch(function(err: any) {
      if (err.response && err.response.status == 400) {
        img.bigUrl = _imageUrlRaw(img)
        img.smallUrl = img.bigUrl
        axios
          .get(img.smallUrl, {
            withCredentials: false,
            responseType: 'blob',
            timeout: 30000
          })
          .then(() => {
            img.time = new Date().getTime()
          })
          .catch(function(error: any) {
            console.log('imgerr2', error)
          })
      }
    })
}

function _imageUrlSmall(item: OneImageModel) {
  if (item.encType || thirdPartyImageDrives.has(item.drive_id) || item.drive_id.startsWith('webdav:')) {
    return getProxyUrl({
      user_id: pageImage.user_id,
      drive_id: item.drive_id,
      file_id: item.file_id,
      file_size: item.size,
      encType: item.encType,
      password: pageImage.password
    })
  }
  return 'https://api.aliyundrive.com/v2/file/download?t=' + Date.now().toString() + '&drive_id=' + item.drive_id + '&file_id=' + item.file_id + '&image_thumbnail_process=image%2Fresize%2Cl_60%2Fformat%2Cjpg%2Fauto-orient%2C1'
}

function _imageUrlBig(item: OneImageModel) {
  if (item.encType || thirdPartyImageDrives.has(item.drive_id) || item.drive_id.startsWith('webdav:')) {
    return getProxyUrl({
      user_id: pageImage.user_id,
      drive_id: item.drive_id,
      file_id: item.file_id,
      file_size: item.size,
      encType: item.encType,
      password: pageImage.password
    })
  }
  return 'https://api.aliyundrive.com/v2/file/download?t=' + Date.now().toString() + '&drive_id=' + item.drive_id + '&file_id=' + item.file_id + '&image_thumbnail_process=image%2Fresize%2Cl_1920%2Fformat%2Cwebp%2Fauto-orient%2C1'
}

function _imageUrlRaw(item: OneImageModel) {
  if (item.encType || thirdPartyImageDrives.has(item.drive_id) || item.drive_id.startsWith('webdav:')) {
    return getProxyUrl({
      user_id: pageImage.user_id,
      drive_id: item.drive_id,
      file_id: item.file_id,
      file_size: item.size,
      encType: item.encType,
      password: pageImage.password
    })
  }
  return 'https://api.aliyundrive.com/v2/file/download?t=' + Date.now().toString() + '&drive_id=' + item.drive_id + '&file_id=' + item.file_id
}

function getImageUrl(item: OneImageModel) {
  if (!item.bigUrl) {
    item.smallUrl = _imageUrlSmall(item)
    item.bigUrl = _imageUrlBig(item)
  }
}
</script>

<template>
  <a-layout style="height: 100vh" draggable="false">
    <a-layout-header v-show="!isPlaying" id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <IconFont name="iconfile-img" />
        </a-button>
        <div class="title">{{ showName }}</div>
        <div class="flexauto"></div>
        <a-button type='text' tabindex='-1' :title="t('common.minimize') + ' Alt+M'" @click='handleMinClick'>
          <IconFont name="iconzuixiaohua" />
        </a-button>
        <a-button type='text' tabindex='-1' :title="t('common.maximize') + ' Alt+Enter'" @click='handleMaxClick'>
          <IconFont name="iconfullscreen" />
        </a-button>
        <a-button type='text' tabindex='-1' :title="t('common.close') + ' Alt+F4'" @click='handleHideClick'>
          <IconFont name="iconclose" />
        </a-button>
      </div>
    </a-layout-header>
    <a-layout-content style="height: calc(100vh - 42px); padding: 12px 16px 12px 16px">
      <div class="toppanbtns" style="margin-bottom: 8px">
        <div class="flexauto"></div>
        <div class="toppanbtn">
          <a-button type="text" tabindex="-1" @click="modeChange('fill')"> {{ t('image.albumMode') }}</a-button>
        </div>
        <div class="toppanbtn">
          <a-button type="text" tabindex="-1" @click="goRefreshImage"><IconFont name="iconreload-1-icon" />{{ t('user.refresh') }}
          </a-button>
        </div>
        <div class="toppanbtn">
          <a-button type="text" tabindex="-1" @click="goLastImage"><IconFont name="iconarrow-left-2-icon" />{{ t('image.previous') }}
          </a-button>
          <a-button type="text" tabindex="-1" @click="goNextImage"><IconFont name="iconarrow-right-2-icon" />{{ t('image.next') }}
          </a-button>
        </div>
      </div>
      <div id="doc-preview" class="doc-preview" style="width: 100%; height: calc(100% - 26px - 8px)">
        <div v-if="pageImage.mode == 'width'" id="fullwidthimage" class="fullwidthimage scroll">
          <a-image v-if="rawImageList.length > 0" id="imagewidth" width="100%" referrerPolicy="no-referrer"
                   :src="rawImageList[showIndex].bigUrl" :preview="false">
            <template #error>
              <img
                src="data:image/png;base64,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" />
            </template>
          </a-image>
        </div>
        <ul v-else id="images" style="display: none">
          <li v-for="item in rawImageList" :key="item.file_id">
            <img
              v-if="Math.abs(item.index - showIndex) > 10"
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABkCAYAAAA2VDb+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAC1SURBVHhe7dAxAQAgEIDA1/49P4YutIBb2Dm7+0bsUq0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUK0GUKmZD2xzBHzglwceAAAAAElFTkSuQmCC"
              :data-src="item.bigUrl"
              :alt="item.name"
              referrerPolicy="no-referrer" />
            <img v-else :src="item.smallUrl" :data-src="item.bigUrl" :alt="item.name" referrerPolicy="no-referrer" />
          </li>
        </ul>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style>
.fullwidthimage {
  height: 100%;
  margin: 0 auto;
  padding: 0;
  overflow: auto;
  text-align: center;
  background: #23232e;
}

.fullwidthimage .loading {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  padding-top: 30%;
  text-align: center;
  background: #23232e;
}

.viewer-backdrop {
  background: #23232e !important;
}

.viewer-list > .viewer-active,
.viewer-list > .viewer-active:focus,
.viewer-list > .viewer-active:hover {
  border: 4px solid rgb(var(--primary-6));
}

.viewer-player {
  z-index: 12 !important;
}
</style>

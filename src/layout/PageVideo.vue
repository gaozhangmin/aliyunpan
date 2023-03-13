<script setup lang="ts">
import Artplayer from 'artplayer'
import FlvJs from 'flv.js'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import { useAppStore } from '../store'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * @type {import("artplayer")}
 */
const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
let ArtPlayer: Artplayer

const options = {
  id: "artPlayer",
  container: '#artPlayer',
  url: '',
  volume: 0.5,
  autoSize: false,
  autoMini: true,
  loop: false,
  flip: true,
  playbackRate: true,
  aspectRatio: true,
  setting: true,
  hotkey: true,
  pip: true,
  mutex: true,
  fullscreen: true,
  fullscreenWeb: true,
  subtitleOffset: true,
  miniProgressBar: false,
  playsInline: true,
  quality: [],
  plugins: [],
  whitelist: [],
  moreVideoAttr: {
    // @ts-ignore
    "webkit-playsinline": true,
    playsInline: true,
  },
  customType: {
    flv: function (video: HTMLMediaElement, url: string) {
      const flvPlayer = FlvJs.createPlayer(
          {
            type: "flv",
            url: url,
          },
          {referrerPolicy: "same-origin"}
      )
      flvPlayer.attachMediaElement(video)
      flvPlayer.load()
    },
    m3u8: function (video: HTMLMediaElement, url: string) {
      const hls = new HlsJs()
      hls.loadSource(url)
      hls.attachMedia(video)
      if (!video.src) {
        video.src = url
      }
    },
  },
}

onMounted(() => {
  const name = appStore.pageVideo?.file_name || '视频在线预览'
  setTimeout(() => { document.title = name }, 1000)
  // 初始化
  ArtPlayer = new Artplayer(options)
  ArtPlayer.title = name
  // 获取用户配置
  const storage = ArtPlayer.storage
  const volume = storage.get('videoVolume')
  if (volume) ArtPlayer.volume = parseFloat(volume)
  const muted = storage.get('videoMuted')
  if (muted) ArtPlayer.muted = muted === 'true'
  // 获取视频链接
  AliFile.ApiVideoPreviewUrl(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id).then((data) => {
    if (data) {
      // 画质
      const qualitySelector: { url: string; html: string; default?: boolean }[] = []
      if (data.urlQHD) qualitySelector.push({url: data.urlQHD, html: '原画'})
      if (data.urlFHD) qualitySelector.push({url: data.urlFHD, html: '全高清 1080P'})
      if (data.urlHD) qualitySelector.push({url: data.urlHD, html: '高清 720P'})
      if (data.urlSD) qualitySelector.push({url: data.urlSD, html: '标清 540P'})
      if (data.urlLD) qualitySelector.push({url: data.urlLD, html: '流畅 480P'})
      const qualityDefault = qualitySelector.find((item) => item.default) || qualitySelector[0]
      ArtPlayer.url = qualityDefault.url
      ArtPlayer.controls.add({
        name: 'quality',
        index: 10,
        position: 'right',
        style: {marginRight: '10px',},
        html: qualityDefault ? qualityDefault.html : '',
        selector: qualitySelector,
        onSelect: (item: { url: string; html: string; default?: boolean }) => {
          ArtPlayer.switchQuality(item.url);
        }
      })
      // 字幕
      if (data.subtitles.length > 0) {
        const subSelector: { url: string; html: string; default?: boolean }[] = []
        for (let i = 0; i < data.subtitles.length; i++) {
          const subtitle = i == 0
              ? {
                html: data.subtitles[i].language,
                url: data.subtitles[i].url,
                default: true
              }
              : {html: data.subtitles[i].language, url: data.subtitles[i].url}
          subSelector.push(subtitle)
        }
        const subDefault = subSelector.find((item) => item.default) || subSelector[0]
        ArtPlayer.subtitle.url = subDefault.url
        ArtPlayer.setting.add({
          name: 'Subtitle',
          width: 200,
          html: '字幕切换',
          tooltip: subDefault ? subDefault.html : '',
          selector: [
            {
              html: '字幕开关',
              tooltip: '开启',
              switch: true,
              onSwitch: function (item) {
                item.tooltip = item.switch ? '关闭' : '开启'
                ArtPlayer.subtitle.show = !item.switch
                return !item.switch;
              },
            },
            ...subSelector
          ],
          onSelect: (item) => {
            ArtPlayer.subtitle.switch(item.url, {name: item.html});
            return item.html;
          },
        })
      }
    }
  })
  ArtPlayer.on('ready', () => {
    // 进度
    AliFile.ApiFileInfo(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id).then((info) => {
      if (info?.play_cursor) {
        ArtPlayer.currentTime = info?.play_cursor
      } else if (info?.user_meta) {
        const meta = JSON.parse(info?.user_meta)
        if (meta.play_cursor) {
          ArtPlayer.currentTime = parseFloat(meta.play_cursor)
        }
      }
      ArtPlayer.play()
    })
    // 视频播放完毕
    ArtPlayer.on('video:ended', () => {
      updateVideoTime()
    })
    // 视频跳转
    ArtPlayer.on('video:seeked', () => {
      updateVideoTime()
    })
    // 播放已暂停
    ArtPlayer.on('video:pause', () => {
      updateVideoTime()
    })
    // 音量发生变化
    ArtPlayer.on('video:volumechange', () => {
      storage.set('videoVolume', ArtPlayer.volume)
      storage.set('videoMuted', ArtPlayer.muted ? 'true' : 'false')
    })
  })
})

const updateVideoTime = () => {
  return AliFile.ApiUpdateVideoTime(
      pageVideo.user_id,
      pageVideo.drive_id,
      pageVideo.file_id,
      ArtPlayer.currentTime
  )
}
const handleHideClick = () => {
  updateVideoTime().then(() => {
    window.close()
  })
}

onBeforeUnmount(() => {
  ArtPlayer && ArtPlayer.destroy(false)
})

</script>

<template>
  <a-layout style="height: 100vh" draggable="false">
    <a-layout-header id="xbyhead" draggable="false">
      <div id="xbyhead2" class="q-electron-drag">
        <a-button type="text" tabindex="-1">
          <i class="iconfont iconfile_video"></i>
        </a-button>
        <div class="title">{{ appStore.pageVideo?.file_name || '视频在线预览' }}</div>
        <div class="flexauto"></div>
        <a-button type="text" tabindex="-1" @click="handleHideClick">
          <i class="iconfont iconclose"></i>
        </a-button>
      </div>
    </a-layout-header>
    <a-layout-content style="height: calc(100vh - 42px)">
      <div id="artPlayer" style="width: 100%; height: 100%"></div>
    </a-layout-content>
  </a-layout>
</template>

<style lang="less" scoped>

</style>

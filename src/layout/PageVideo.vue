<script setup lang="ts">
import Artplayer from 'artplayer'
import FlvJs from 'flv.js'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import { useAppStore } from '../store'
import { onBeforeUnmount, onMounted } from 'vue'
import { IVideoPreviewUrl, IVideoXBTUrl } from '../aliapi/models'
import AliDirFileList from '../aliapi/dirfilelist'
import { SettingOption } from "artplayer/types/setting"
import AliHttp from "../aliapi/alihttp";
import {IAliRecentPlayList} from "../aliapi/alimodels";
import Config from "../utils/config";

/**
 * @type {import("artplayer")}
 */
const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
let ArtPlayerRef: Artplayer
let playListIndex = 0
let globalPlayList:string[] = []

const options = {
  id: "artPlayer",
  container: '#artPlayer',
  url: '',
  volume: 0.5,
  autoSize: false,
  autoMini: true,
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
  playsInline: true,
  quality: [],
  plugins: [],
  whitelist: [],
  screenshot: true,
  loop: true,
  miniProgressBar: true,
  airplay: true,
  theme: '#23ade5',
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
const getCurDirList = async (filter?: RegExp): Promise<any[]>  => {
  const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id,
    pageVideo.parent_file_id, '', 'name asc', '')
  const fileList: any[] = []
  if (!dir.next_marker) {
    for (let i = 0, maxi = dir.items.length; i < maxi; i++) {
      let fileModel = dir.items[i]
      if (fileModel.isDir) continue
      else fileList.push({
        html: '在线:  ' + fileModel.name,
        name: fileModel.name,
        file_id: fileModel.file_id,
        ext: fileModel.ext
      })
    }
  }
  return filter ? fileList.filter(file => filter.test(file.ext)) : fileList
}

const getVideoInfo = async (art: Artplayer) => {
  // 获取视频链接
  const data: IVideoPreviewUrl | undefined = await AliFile.ApiVideoPreviewUrlOpenApi(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id, true)
  if (data && data.url != '') {
    // 画质
    globalPlayList.push(data.url)
    const qualitySelector: { url: string; html: string; default?: boolean }[] = []
    if (data.urlQHD) qualitySelector.push({url: data.urlQHD, html: '原画'})
    if (data.urlFHD) qualitySelector.push({url: data.urlFHD, html: '全高清 1080P'})
    if (data.urlHD) qualitySelector.push({url: data.urlHD, html: '高清 720P'})
    if (data.urlSD) qualitySelector.push({url: data.urlSD, html: '标清 540P'})
    if (data.urlLD) qualitySelector.push({url: data.urlLD, html: '流畅 480P'})
    const qualityDefault = qualitySelector.find((item) => item.default) || qualitySelector[0]
    art.url = qualityDefault.url
    art.controls.add({
      name: '清晰度',
      index: 10,
      position: 'right',
      style: {marginRight: '10px',},
      html: qualityDefault ? qualityDefault.html : '',
      selector: qualitySelector,
      onSelect: (item: { url: string; html: string; default?: boolean }) => {
        art.switchQuality(item.url)
      }
    })
    //播放列表
    if (data.playList && data.playList.length > 0) {
      const playList: { url: string; html: string; style: any, quality: { url: string; html: string; default?: boolean }[]}[] = []
      for (let i = 0; i < data.playList.length; i++) {
        const item = data.playList[i]
        if(item.url === '') continue
        globalPlayList.push(item.url)
        const quality: { url: string; html: string; default?: boolean }[] = []
        if (item.urlQHD) quality.push({url: item.urlQHD, html: '原画'})
        if (item.urlFHD) quality.push({url: item.urlFHD, html: '全高清 1080P'})
        if (item.urlHD) quality.push({url: item.urlHD, html: '高清 720P'})
        if (item.urlSD) quality.push({url: item.urlSD, html: '标清 540P'})
        if (item.urlLD) quality.push({url: item.urlLD, html: '流畅 480P'})
        const play = {
          html: item.file_name == undefined? "视频" + (i + 1):item.file_name,
          url: item.url,
          quality: quality,
          style: { textAlign: 'left' }
        }
        playList.push(play)
      }
      art.controls.add({
        name: '播放列表',
        index: 10,
        position: 'right',
        style: { padding: '0 10px' },
        html: pageVideo.file_name,
        selector: playList,
        onSelect: (item: { url: string; html: string; quality: { url: string; html: string; default?: boolean }[] }) => {
          // const defaultQ = item.quality[0]
          // art.controls.add({
          //   name: '清晰度',
          //   index: 10,
          //   position: 'right',
          //   style: { textAlign: 'left' },
          //   html: defaultQ ? defaultQ.html : '',
          //   selector: item.quality,
          //   onSelect: (item: { url: string; html: string; default?: boolean }) => {
          //     art.switchQuality(item.url)
          //   }
          // })
          art.switchUrl(item.url)
        }
      })
    }
    // 内嵌字幕
    const subSelector: { url: string; file_id?: string, html: string; name: string; default?: boolean }[] = []
    if (data.subtitles.length > 0) {
      for (let i = 0; i < data.subtitles.length; i++) {
        const subtitle =
            i == 0 ? {
              html: '内嵌:  ' + data.subtitles[i].language,
              name: data.subtitles[i].language,
              url: data.subtitles[i].url,
              default: true
            } : {html: '内嵌:  ' + data.subtitles[i].language, name: data.subtitles[i].language, url: data.subtitles[i].url}
        subSelector.push(subtitle)
      }
      art.subtitle.url = subSelector[0].url
      let subtitle = Artplayer.utils.query('.art-subtitle')
      let subtitleSize = ArtPlayerRef.storage.get('subtitleSize') || '30px'
      Artplayer.utils.setStyle(subtitle, 'fontSize', subtitleSize)
    }
    // 尝试加载当前文件夹字幕文件
    const dir = await getCurDirList(/srt|vtt|ass/)
    console.log("subtitles dir", dir)
    subSelector.push(...dir)
    const subDefault = subSelector.find((item) => item.default) || subSelector[0]
    if (subSelector && subSelector.length > 0) {
      art.setting.add({
        name: 'Subtitle',
        width: 250,
        html: '字幕设置',
        tooltip: subDefault.html,
        selector: [
          {
            html: '字幕开关',
            tooltip: '开启',
            switch: true,
            onSwitch: (item: SettingOption) => {
              item.tooltip = item.switch ? '关闭' : '开启'
              art.subtitle.show = !item.switch
              art.notice.show = '字幕' + item.tooltip
              let currentItem = Artplayer.utils.queryAll('.art-setting-panel.art-current div:nth-of-type(n+4)')
              if (currentItem.length > 0) {
                currentItem.forEach(current => {
                  if(item.switch){
                    Artplayer.utils.removeClass(current, 'art-current')
                    Artplayer.utils.addClass(current,'disable')
                    item.$parentItem.tooltip = ''
                  } else {
                    Artplayer.utils.removeClass(current,'disable')
                  }
                })
              }
              return !item.switch
            },
          },
          {
            html: '字幕大小',
            tooltip: '30px',
            range: [30, 20, 50, 5],
            onChange: (item) => {
              let size = item.range + 'px'
              let subtitle = Artplayer.utils.query('.art-subtitle')
              Artplayer.utils.setStyle(subtitle, 'fontSize', size)
              ArtPlayerRef.storage.set('subtitleSize', size)
              return size
            },
          },
          ...subSelector
        ],
        onSelect: async (item: SettingOption, element: HTMLDivElement) => {
          if (art.subtitle.show) {
            let subtitle = Artplayer.utils.query('.art-subtitle')
            let subtitleSize = ArtPlayerRef.storage.get('subtitleSize') || '30px'
            Artplayer.utils.setStyle(subtitle, 'fontSize', subtitleSize)
            if (!item.file_id) {
              art.notice.show = ''
              art.subtitle.switch(item.url, { name: item.name })
              return item.html
            } else {
              art.notice.show = '正在加载在线字幕中...'
              const data = await AliFile.ApiFileDownloadUrlOpenApi(pageVideo.user_id, pageVideo.drive_id, item.file_id,
                  14400)
              if (typeof data !== 'string' && data.url && data.url != '') {
                art.notice.show = `加载${item.name}字幕文件成功`
                art.subtitle.switch(data.url, { name: item.name })
                return item.html
              } else {
                art.notice.show = `加载${item.name}字幕文件失败`
              }
            }
          } else {
            art.notice.show = '未开启字幕'
            Artplayer.utils.removeClass(element, 'art-current')
            return false
          }
        },
      })
    }
  }
}
onMounted(async () => {
  const name = appStore.pageVideo?.file_name || '视频在线预览'
  setTimeout(() => { document.title = name }, 1000)
  if (pageVideo.file_name.endsWith("m3u8")) {

  }
  // 初始化
  ArtPlayerRef = new Artplayer(options)

  ArtPlayerRef.title = name
  // 自定义热键
  // enter
  ArtPlayerRef.hotkey.add(13, () => {
    ArtPlayerRef.fullscreen = !ArtPlayerRef.fullscreen
  })
  // z
  ArtPlayerRef.hotkey.add(90, () => {
    ArtPlayerRef.playbackRate = 1
  })
  // x
  ArtPlayerRef.hotkey.add(88, () => {
    ArtPlayerRef.playbackRate -= 0.5
  })
  // c
  ArtPlayerRef.hotkey.add(67, () => {
    ArtPlayerRef.playbackRate += 0.5
  })
  // 获取用户配置
  const storage = ArtPlayerRef.storage
  const volume = storage.get('videoVolume')
  if (volume) ArtPlayerRef.volume = parseFloat(volume)
  const muted = storage.get('videoMuted')
  if (muted) ArtPlayerRef.muted = muted === 'true'
  // 获取视频信息
  await getVideoInfo(ArtPlayerRef)
  ArtPlayerRef.on('ready', () => {
    // 进度
    AliHttp.Post(Config.recentPlayListUrl, {}, pageVideo.user_id, '')
        .then((resp) => {
          if (resp.code === 200) {
            const list = resp.body.items as IAliRecentPlayList[]
            if (list && list.length > 0) {
              for (let i = 0; i < list.length; i++) {
                const info = list[i]
                if (info.file_id === pageVideo.file_id) {
                  if (info?.play_cursor) {
                    ArtPlayerRef.currentTime = info?.play_cursor
                  }
                  ArtPlayerRef.play()
                  break
                }
              }
            }
          }
        })
        .catch((err) => {
          console.log(err)
        })
    // 视频播放完毕
    ArtPlayerRef.on('video:ended', () => {
      updateVideoTime()
      playNext()
    })
    // 视频跳转
    ArtPlayerRef.on('video:seeked', () => {
      updateVideoTime()
    })
    // 播放已暂停
    ArtPlayerRef.on('video:pause', () => {
      updateVideoTime()
    })
    // 音量发生变化
    ArtPlayerRef.on('video:volumechange', () => {
      storage.set('videoVolume', ArtPlayerRef.volume)
      storage.set('videoMuted', ArtPlayerRef.muted ? 'true' : 'false')
    })
  })
})

function playM3u8(video: HTMLVideoElement, url: string, art:Artplayer) {
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);

    // optional
    art.hls = hls;
    art.once('url', () => hls.destroy());
    art.once('destroy', () => hls.destroy());
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
  } else {
    art.notice.show = 'Unsupported playback format: m3u8';
  }
}


function playNext() {
  playListIndex += 1;
  var url = globalPlayList[playListIndex]
  if (url) {
    // play next
    ArtPlayerRef.switchUrl(url)
  } else {
    // play first
    playListIndex = 0;
    ArtPlayerRef.switchUrl(globalPlayList[playListIndex])
  }

  ArtPlayerRef.seek = 0;
  ArtPlayerRef.play();
}

const updateVideoTime = () => {
  return AliFile.ApiUpdateVideoTimeOpenApi(
    pageVideo.user_id,
    pageVideo.drive_id,
    pageVideo.file_id,
    ArtPlayerRef.currentTime
  )
}
const handleHideClick = () => {
  updateVideoTime().then(() => {
    window.close()
  })
}

onBeforeUnmount(() => {
  ArtPlayerRef && ArtPlayerRef.destroy(false)
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

<style>
.disable {
  cursor: not-allowed;
  pointer-events: none;
  background-color: transparent;
  color:#ACA899;
}
</style>

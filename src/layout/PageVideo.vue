<script setup lang='ts'>
import Artplayer from 'artplayer'
import FlvJs from 'flv.js'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import { useAppStore } from '../store'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ICompilationList, IVideoPreviewUrl } from '../aliapi/models'
import AliDirFileList from '../aliapi/dirfilelist'
import { type SettingOption } from 'artplayer/types/setting'

const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
let autoNextPlayNumber = 0
let ArtPlayerRef: Artplayer

const options = {
  id: 'artPlayer',
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
  subtitleOffset: false,
  screenshot: true,
  miniProgressBar: false,
  playsInline: true,
  quality: [],
  plugins: [],
  whitelist: [],
  moreVideoAttr: {
    // @ts-ignore
    'webkit-playsinline': true,
    playsInline: true
  },
  customType: {
    flv: function(video: HTMLMediaElement, url: string) {
      const flvPlayer = FlvJs.createPlayer(
        {
          type: 'flv',
          url: url
        },
        { referrerPolicy: 'same-origin' }
      )
      flvPlayer.attachMediaElement(video)
      flvPlayer.load()
    },
    m3u8: function(video: HTMLMediaElement, url: string) {
      const hls = new HlsJs()
      hls.loadSource(url)
      hls.attachMedia(video)
      if (!video.src) {
        video.src = url
      }
    }
  }
}


type selectorItem = {
  url: string;
  html: string;
  name?: string;
  default?: boolean;
  file_id?: string;
  play_cursor?: number;
}

onMounted(async () => {
  const name = pageVideo.file_name || '视频在线预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  // 创建播放窗口
  await createVideo(name)
  await defaultSetting(ArtPlayerRef)
  // 获取视频信息
  await getVideoInfo(ArtPlayerRef)
  await getVideoPlayList(ArtPlayerRef)
})

const createVideo = async (name: string) => {
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
  if (!storage.get('curDirList')) storage.set('curDirList', true)

  const volume = storage.get('videoVolume')
  if (volume) ArtPlayerRef.volume = parseFloat(volume)
  const muted = storage.get('videoMuted')
  if (muted) ArtPlayerRef.muted = muted === 'true'
  // 视频播放完毕
  ArtPlayerRef.on('video:ended', () => {
    updateVideoTime()
    const autoPlayNext = () => {
      const currentVideoIndex = getCurrentVideoIndex();
      if (currentVideoIndex + 1 >= playList.length) {
        ArtPlayerRef.notice.show = '视频播放完毕'
        return
      }
      const item = playList[currentVideoIndex + 1]
      if (item.file_id !== pageVideo.file_id) {
        refreshSetting(ArtPlayerRef, item)
        getVideoPlayList(ArtPlayerRef, item.file_id)
      } else {
        autoPlayNext()
      }
    }
    autoPlayNext()
  })
  // 视频跳转
  ArtPlayerRef.on('ready', () => {
    ArtPlayerRef.seek = storage.get('autoSkip')
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

  ArtPlayerRef.on('video:timeupdate', () => {
    const totalDuration = pageVideo.duration
    const endDuration = storage.get('autoSkipEnd')
    if (totalDuration
        && totalDuration - ArtPlayerRef.currentTime > 0
        && totalDuration - ArtPlayerRef.currentTime <= endDuration) {
      console.log("autoSkipEnd")
      ArtPlayerRef.seek = totalDuration
    }
  });
}

const getCurDirList = async (parent_file_id: string, category: string = '', filter?: RegExp): Promise<any[]> => {
  const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id, parent_file_id, '', 'name asc', '')
  const fileList: any[] = []
  if (!dir.next_marker) {
    for (let i = 0, maxi = dir.items.length; i < maxi; i++) {
      let fileModel = dir.items[i]
      if (fileModel.isDir) continue
      else fileList.push({
        html: (category ? '' : '在线:  ') + fileModel.name,
        category: fileModel.category,
        name: fileModel.name,
        file_id: fileModel.file_id,
        ext: fileModel.ext
      })
    }
  }
  if (category) {
    return fileList.filter(file => file.category === category)
  }
  return filter ? fileList.filter(file => filter.test(file.ext)) : fileList
}



const refreshSetting = async (art: Artplayer, item: selectorItem) => {
  if (pageVideo.file_id === item.file_id) return
  // 刷新文件
  pageVideo.file_name = item.html
  pageVideo.file_id = item.file_id || ''
  // 刷新信息
  await getVideoInfo(art)
}

const defaultSetting = async (art: Artplayer) => {
  art.setting.add(
      {
        name: 'autoSkipBegin',
        width: 250,
        html: '跳过片头',
        tooltip:  art.storage.get('autoSkipBegin') + 's',
        range: [0, 0, 10, 1],
        onChange(item: SettingOption) {
          art.storage.set('autoSkipBegin', item.range*10)
          return item.range*10 + 's'
        }
      }
  )
  art.setting.add(
      {
        name: 'autoSkipEnd',
        width: 250,
        html: '跳过片尾',
        tooltip: art.storage.get('autoSkipEnd') + 's',
        range: [0, 0, 10, 1],
        onChange(item: SettingOption) {
          art.storage.set('autoSkipEnd', item.range*10)
          return item.range*10 + 's'
        }
      }
  )
  art.setting.add({
    name: 'playListMode',
    width: 250,
    html: '列表模式',
    tooltip: art.storage.get('curDirList') ? '同文件夹' : '同专辑',
    selector: [
      {
        default: true,
        html: '同文件夹',
      },
      {
        html: '同专辑',
      }
    ],
    onSelect: async (item: SettingOption) => {
      item.tooltip = item.html
      art.storage.set('curDirList', item.html === '同文件夹')
      await getVideoPlayList(art)
      return item.html
    }
  })
}

const getVideoInfo = async (art: Artplayer, play_cursor?: number) => {
  // 获取视频链接
  const data: IVideoPreviewUrl | undefined =
    await AliFile.ApiVideoPreviewUrl(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id)
  if (data) {
    pageVideo.duration = data.duration
    // 画质
    const qualitySelector: selectorItem[] = []
    if (data.urlQHD) qualitySelector.push({ url: data.urlQHD, html: '原画' })
    if (data.urlFHD) qualitySelector.push({ url: data.urlFHD, html: '全高清 1080P' })
    if (data.urlHD) qualitySelector.push({ url: data.urlHD, html: '高清 720P' })
    if (data.urlSD) qualitySelector.push({ url: data.urlSD, html: '标清 540P' })
    if (data.urlLD) qualitySelector.push({ url: data.urlLD, html: '流畅 480P' })
    const qualityDefault = qualitySelector.find((item) => item.default) || qualitySelector[0]
    qualityDefault.default = true
    art.url = qualityDefault.url
    art.controls.update({
      name: 'quality',
      index: 20,
      position: 'right',
      style: { marginRight: '10px' },
      html: qualityDefault ? qualityDefault.html : '',
      selector: qualitySelector,
      onSelect: (item: selectorItem) => {
        art.switchQuality(item.url)
      }
    })
    // 字幕
    await getSubTitleList(art, data.subtitles || [])
    // 进度
    await getVideoCursor(art, play_cursor)
  }
}

let playList: selectorItem[] = []

const getCurrentVideoIndex = () => {
  return playList.findIndex((item) => item.file_id === pageVideo.file_id)
}
const getVideoPlayList = async (art: Artplayer, file_id?: string) => {
  if (!file_id) {
    let fileList: any
    if (!art.storage.get('curDirList')) {
      fileList = await AliFile.ApiListByFileInfo(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id, 100)
      console.log(" AliFile.ApiListByFileInfo", fileList)
    } else {
      fileList = await getCurDirList(pageVideo.parent_file_id, 'video') || []
      console.log("getCurDirList", fileList)
    }
    playList = []
    if (fileList && fileList.length > 1) {
      for (let i = 0; i < fileList.length; i++) {
        playList.push({
          url: fileList[i].url,
          html: fileList[i].name,
          name: fileList[i].name,
          file_id: fileList[i].file_id,
          play_cursor: fileList[i].play_cursor,
          default: fileList[i].file_id === pageVideo.file_id
        })
      }
    }
  } else {
    for (let list of playList) {
      if (list.file_id === file_id) {
        list.default = true
        break
      }
    }
  }
  art.controls.update({
    name: 'playList',
    index: 10,
    position: 'right',
    style: { padding: '0 10px' },
    html: pageVideo.file_name.length > 20 ? pageVideo.file_name.substring(0, 20) + '...' : pageVideo.file_name,
    selector: playList,
    onSelect: async (item: selectorItem) => {
      await refreshSetting(art, item)
    }
  })
}

const getVideoCursor = async (art: Artplayer, play_cursor?: number) => {
  // 进度
  if (play_cursor) {
    art.currentTime = play_cursor
  } else {
    const info = await AliFile.ApiFileInfoOpenApi(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id)
    const autoSkipBegin  = art.storage.get('autoSkipBegin')
    console.log("autoSkipBegin", autoSkipBegin)
    if (info?.play_cursor) {
      if (autoSkipBegin > info?.play_cursor) {
        art.currentTime = autoSkipBegin
      } else {
        art.currentTime = info?.play_cursor
      }
    } else if (info?.user_meta) {
      const meta = JSON.parse(info?.user_meta)
      if (meta.play_cursor) {
        if (parseFloat(meta.play_cursor) > autoSkipBegin) {
          art.currentTime = parseFloat(meta.play_cursor)
        } else {
          art.currentTime = autoSkipBegin
        }
      } else {
        art.currentTime = autoSkipBegin
      }
    } else {
      art.currentTime = autoSkipBegin
    }
  }
  await art.play()
}

const getSubTitleList = async (art: Artplayer, subtitles: { language: string; url: string }[]) => {
  // 内嵌字幕
  const subSelector: selectorItem[] = []
  if (subtitles.length > 0) {
    for (let i = 0; i < subtitles.length; i++) {
      subSelector.push({
        html: '内嵌:  ' + subtitles[i].language,
        name: subtitles[i].language,
        url: subtitles[i].url,
        default: i === 0
      })
    }
    art.subtitle.url = subSelector[0].url
    let subtitle = Artplayer.utils.query('.art-subtitle')
    let subtitleSize = art.storage.get('subtitleSize') || '30px'
    Artplayer.utils.setStyle(subtitle, 'fontSize', subtitleSize)
  }
  // 尝试加载当前文件夹字幕文件
  const dir = await getCurDirList(pageVideo.parent_file_id, '',/srt|vtt|ass/) || []
  subSelector.push(...dir)
  subSelector.length === 0 && subSelector.push({ html: '无可用字幕', name: '', url: '', default: true })
  const subDefault = subSelector.find((item) => item.default) || subSelector[0]
  // 字幕设置面板
  art.setting.update({
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
          let currentItem = Artplayer.utils.queryAll('.art-setting-panel.art-current .art-setting-item:nth-of-type(n+3)')
          if (currentItem.length > 0) {
            currentItem.forEach((current: HTMLElement) => {
              if (item.switch) {
                Artplayer.utils.removeClass(current, 'art-current')
                Artplayer.utils.addClass(current, 'disable')
                item.$parentItem.tooltip = ''
              } else {
                Artplayer.utils.removeClass(current, 'disable')
              }
            })
          }
          return !item.switch
        }
      },
      {
        html: '字幕偏移',
        tooltip: '0s',
        range: [0, -5, 5, 0.1],
        onChange(item: SettingOption) {
          art.subtitleOffset = item.range
          return item.range + 's'
        }
      },
      {
        html: '字幕大小',
        tooltip: '30px',
        range: [30, 20, 50, 5],
        onChange: (item: SettingOption) => {
          let size = item.range + 'px'
          let subtitle = Artplayer.utils.query('.art-subtitle')
          Artplayer.utils.setStyle(subtitle, 'fontSize', size)
          art.storage.set('subtitleSize', size)
          return size
        }
      },
      ...subSelector
    ],
    onSelect: async (item: SettingOption, element: HTMLDivElement) => {
      if (art.subtitle.show) {
        let subtitle = Artplayer.utils.query('.art-subtitle')
        let subtitleSize = art.storage.get('subtitleSize') || '30px'
        Artplayer.utils.setStyle(subtitle, 'fontSize', subtitleSize)
        if (!item.file_id) {
          art.notice.show = ''
          art.subtitle.switch(item.url, { name: item.name })
          return item.html
        } else {
          art.notice.show = '正在加载在线字幕中...'
          const data = await AliFile.ApiFileDownloadUrl(pageVideo.user_id, pageVideo.drive_id, item.file_id, 14400)
          if (typeof data !== 'string' && data.url && data.url != '') {
            art.notice.show = `加载${item.name}字幕文件成功`
            art.subtitle.switch(data.url, { name: item.name, type: item.ext })
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
    }
  })
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
  <a-layout style='height: 100vh' draggable='false'>
    <a-layout-header id='xbyhead' draggable='false'>
      <div id='xbyhead2' class='q-electron-drag'>
        <a-button type='text' tabindex='-1'>
          <i class='iconfont iconfile_video'></i>
        </a-button>
        <div class='title'>{{ appStore.pageVideo?.file_name || '视频在线预览' }}</div>
        <div class='flexauto'></div>
        <a-button type='text' tabindex='-1' @click='handleHideClick()'>
          <i class='iconfont iconclose'></i>
        </a-button>
      </div>
    </a-layout-header>
    <a-layout-content style='height: calc(100vh - 42px)'>
      <div id='artPlayer' style='width: 100%; height: 100%;text-overflow: ellipsis;white-space: nowrap;'></div>
    </a-layout-content>
  </a-layout>
</template>

<style>
.disable {
    cursor: not-allowed;
    pointer-events: none;
    background-color: transparent;
    color: #ACA899;
}
</style>

<script setup lang='ts'>
import { useAppStore } from '../store'
import { onBeforeUnmount, onMounted } from 'vue'
import Artplayer from 'artplayer'
import FlvJs from 'flv.js'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import AliDirFileList from '../aliapi/dirfilelist'
import levenshtein from 'fast-levenshtein'
import { IVideoPreviewUrl } from '../aliapi/models'
import { type SettingOption } from 'artplayer/types/setting'
import { type Option } from 'artplayer/types/option'

const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
let ArtPlayerRef: Artplayer

const options: Option = {
  id: 'artPlayer',
  container: '#artPlayer',
  url: '',
  volume: 1,
  autoSize: false,
  autoMini: true,
  loop: false,
  flip: true,
  playbackRate: true,
  aspectRatio: true,
  setting: true,
  hotkey: true,
  pip: true,
  airplay: true,
  mutex: true,
  fullscreen: true,
  fullscreenWeb: true,
  subtitleOffset: false,
  screenshot: true,
  miniProgressBar: false,
  playsInline: true,
  moreVideoAttr: {
    // @ts-ignore
    'webkit-playsinline': true,
    playsInline: true
  },
  customType: {
    flv: (video: HTMLMediaElement, url: string) => playFlv(video, url, ArtPlayerRef),
    m3u8: (video: HTMLMediaElement, url: string) => playM3U8(video, url, ArtPlayerRef)
  }
}

const playM3U8 = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (HlsJs.isSupported()) {
    // @ts-ignore
    if (art.hls) art.hls.destroy()
    const hls = new HlsJs({
      maxBufferLength: 20,
      maxBufferSize: 60 * 1000 * 1000,
    })
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(HlsJs.Events.ERROR, (event, data) => {
      const errorType = data.type
      const errorDetails = data.details
      const errorFatal = data.fatal
      if (errorFatal) { // 尝试修复致命错误
        if (errorType === HlsJs.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else if (errorType === HlsJs.ErrorTypes.NETWORK_ERROR){
          art.emit('video:ended', data)
        }
      }
    })
    // @ts-ignore
    art.hls = hls
    art.on('destroy', () => hls.destroy())
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
  } else {
    art.notice.show = 'Unsupported playback format: m3u8'
  }
}

const playFlv = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (FlvJs.isSupported()) {
    // @ts-ignore
    if (art.flv) art.flv.destroy()
    const flv = FlvJs.createPlayer(
      { url: url, type: 'flv', withCredentials: true, cors: true },
      { referrerPolicy: 'same-origin' }
    )
    flv.attachMediaElement(video)
    flv.load()
    // @ts-ignore
    art.flv = flv
    art.on('destroy', () => flv.destroy())
  } else {
    art.notice.show = 'Unsupported playback format: flv'
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
  if (!storage.get('autoSkipEnd')) storage.set('autoSkipEnd', 0)
  if (!storage.get('autoSkipBegin')) storage.set('autoSkipBegin', 0)

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
// // 视频跳转
//   ArtPlayerRef.on('video:seeked', () => {
//     updateVideoTime()
//   })
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

const curDirList: any[] = []
const getCurDirList = async (parent_file_id: string, category: string = '', filter?: RegExp): Promise<any[]> => {
  if (curDirList.length === 0) {
    const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id, parent_file_id, '', 'name asc', '')
    if (!dir.next_marker) {
      for (let i = 0, maxi = dir.items.length; i < maxi; i++) {
        let fileModel = dir.items[i]
        if (fileModel.isDir) continue
        else curDirList.push({
          html: (category ? '' : '在线:  ') + fileModel.name,
          category: fileModel.category,
          name: fileModel.name,
          file_id: fileModel.file_id,
          ext: fileModel.ext
        })
      }
    }
  }
  if (category) {
    return curDirList.filter(file => file.category === category)
  }
  return filter ? curDirList.filter(file => filter.test(file.ext)) : curDirList
}


const refreshSetting = async (art: Artplayer, item: selectorItem) => {
  if (pageVideo.file_id === item.file_id) return
  // 刷新文件
  pageVideo.html = item.html.length > 20 ? item.html.substring(0, 40) + '...' : item.html
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
        icon: '<i class="iconfont iconarrow-right-1-icon"></i>',
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
        icon: '<i class="iconfont iconarrow-right-1-icon"></i>',
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
    html: '播放列表模式',
    icon: '<i class="iconfont iconhistory icon-playlist"></i>',
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

const getVideoInfo = async (art: Artplayer) => {
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
    await getVideoCursor(art)
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
    } else {
      fileList = await getCurDirList(pageVideo.parent_file_id, 'video') || []
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
  if (playList.length > 1) {
    art.controls.update({
      name: 'playList',
      index: 10,
      position: 'right',
      style: { padding: '0 10px' },
      html: pageVideo.html,
      selector: playList,
      onSelect: async (item: selectorItem) => {
        await refreshSetting(art, item)
      }
    })
  }
}

const getVideoCursor = async (art: Artplayer) => {
  // 进度
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
  await art.play()
}

const loadOnlineSub = async (art: Artplayer, item: any) => {
  art.notice.show = '正在加载在线字幕中...'
  const data = await AliFile.ApiFileDownloadUrl(pageVideo.user_id, pageVideo.drive_id, item.file_id, 14400)
  if (typeof data !== 'string' && data.url && data.url != '') {
    art.subtitle.switch(data.url, {
      name: item.name,
      type: item.ext,
      encoding: 'utf-8',
      escape: true
    })
    return item.html
  } else {
    art.notice.show = `加载${item.name}字幕失败`
  }
}

const getSubTitleList = async (art: Artplayer, subtitles: { language: string; url: string }[]) => {
  let subSelector: selectorItem[]
  // 内嵌字幕
  const embedSubSelector: selectorItem[] = []
  if (subtitles.length > 0) {
    for (let i = 0; i < subtitles.length; i++) {
      embedSubSelector.push({
        html: '内嵌:  ' + subtitles[i].language,
        name: subtitles[i].language,
        url: subtitles[i].url,
        default: i === 0
      })
    }
    art.subtitle.url = embedSubSelector[0].url
    let subtitleSize = art.storage.get('subtitleSize') || '30px'
    art.subtitle.style('fontSize', subtitleSize)
  }
  // 尝试加载当前文件夹字幕文件
  let onlineSubSelector = await getCurDirList(pageVideo.parent_file_id, '', /srt|vtt|ass/) || []
  subSelector = [...embedSubSelector, ...onlineSubSelector]
  if (subSelector.length === 0) {
    subSelector.push({ html: '无可用字幕', name: '', url: '', default: true })
  }
  if (embedSubSelector.length === 0 && onlineSubSelector.length > 0) {
    const similarity = { distance: 999, index: 0}
    for (let i = 0; i < subSelector.length; i++) {
      // 莱文斯坦距离算法(计算相似度)
      const distance = levenshtein.get(pageVideo.file_name, subSelector[i].html, { useCollator: true })
      if (similarity.distance > distance) {
        similarity.distance = distance
        similarity.index = i
      }
    }
    // 自动加载同名字幕
    if (similarity.distance !== 999) {
      let selectorItem = subSelector[similarity.index]
      let subtitleSize = art.storage.get('subtitleSize') || '30px'
      art.subtitle.style('fontSize', subtitleSize)
      subSelector.forEach(v => v.default = false)
      selectorItem.default = true
      await loadOnlineSub(art, selectorItem)
    }
  }
  const subDefault = subSelector.find((item) => item.default) || subSelector[0]
  // 字幕设置面板
  art.setting.update({
    name: 'Subtitle',
    width: 250,
    html: '字幕设置',
    tooltip: art.subtitle.show ? (subDefault.url !== '' ? '字幕开启' : subDefault.html) : '字幕关闭',
    selector: [
      {
        html: '字幕开关',
        tooltip: subDefault.url !== '' ? '开启' : '关闭',
        switch: subDefault.url !== '',
        onSwitch: (item: SettingOption) => {
          if (subDefault.url !== '') {
            item.tooltip = item.switch ? '关闭' : '开启'
            art.subtitle.show = !item.switch
            art.notice.show = '字幕' + item.tooltip
            let currentItem = Artplayer.utils.queryAll('.art-setting-panel.art-current .art-setting-item:nth-of-type(n+3)')
            if (currentItem.length > 0) {
              currentItem.forEach((current: HTMLElement) => {
                if (item.switch) {
                  !art.subtitle.url && Artplayer.utils.removeClass(current, 'art-current')
                  Artplayer.utils.addClass(current, 'disable')
                  item.$parentItem.tooltip = subDefault.url !== '' ? '字幕开启' : subDefault.html
                } else {
                  item.$parentItem.tooltip = '字幕开启'
                  Artplayer.utils.removeClass(current, 'disable')
                }
              })
            }
            return !item.switch
          } else {
            return false
          }
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
          art.storage.set('subtitleSize', size)
          art.subtitle.style('fontSize', size)
          return size
        }
      },
      ...subSelector
    ],
    onSelect: async (item: SettingOption, element: HTMLDivElement) => {
      if (art.subtitle.show) {
        if (!item.file_id) {
          art.notice.show = ''
          art.subtitle.switch(item.url, {
            name: item.name,
            encoding: 'utf-8',
            escape: true
          })
          return item.html
        } else {
          return await loadOnlineSub(art, item)
        }
      } else {
        art.notice.show = '未开启字幕'
        Artplayer.utils.removeClass(element, 'art-current')
        return false
      }
    }
  })
}

const updateVideoTime =  () => {
  return  AliFile.ApiUpdateVideoTimeOpenApi(
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
.iconfont.iconarrow-right-1-icon {
  font-size: 20px;
  color: #ffffff;
}
.icon-playlist {
  font-size: 20px;
  color: #ffffff;
}
</style>

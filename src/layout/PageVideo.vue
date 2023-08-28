<script setup lang='ts'>
import { useAppStore, usePanFileStore, useResPanFileStore, useSettingStore } from '../store'
import { onBeforeUnmount, onMounted } from 'vue'
import Artplayer from 'artplayer'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import AliDirFileList from '../aliapi/dirfilelist'
import levenshtein from 'fast-levenshtein'
import { type SettingOption } from 'artplayer/types/setting'
import { type Option } from 'artplayer/types/option'
import AliFileCmd from '../aliapi/filecmd'
import ASS from 'ass-html5'

const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
let autoPlayNumber = 0
let playbackRate = 1
let ArtPlayerRef: Artplayer
let AssSubtitleRef: ASS

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
    m3u8: (video: HTMLMediaElement, url: string) => playM3U8(video, url, ArtPlayerRef)
  }
}

const playM3U8 = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (HlsJs.isSupported()) {
    // @ts-ignore
    if (art.hls) art.hls.destroy()
    const hls = new HlsJs({
      maxBufferLength: 50,
      maxBufferSize: 60 * 1000 * 1000
    })
    hls.detachMedia()
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(HlsJs.Events.MANIFEST_PARSED, async () => {
      await art.play().catch()
      await getVideoCursor(art, pageVideo.play_cursor)
      art.playbackRate = playbackRate
    })
    hls.on(HlsJs.Events.ERROR, (event, data) => {
      const errorType = data.type
      const errorDetails = data.details
      const errorFatal = data.fatal
      if (errorFatal) { // 尝试修复致命错误
        if (errorType === HlsJs.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else if (errorType === HlsJs.ErrorTypes.NETWORK_ERROR) {
          art.emit('video:ended', data)
        } else {
          hls.destroy()
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

type selectorItem = {
  url: string;
  html: string;
  name?: string;
  default?: boolean;
  file_id?: string;
  description?: string;
  play_cursor?: number;
}

onMounted(async () => {
  const name = pageVideo.file_name || '视频在线预览'
  setTimeout(() => {
    document.title = name
  }, 1000)
  // 创建播放窗口
  await createVideo(name)
  // 获取视频信息
  await getPlayList(ArtPlayerRef)
  await getVideoInfo(ArtPlayerRef)
  // 加载设置
  await defaultSetting(ArtPlayerRef)
})

const getCurrentVideoIndex = () => {
  return playList.findIndex((item) => item.file_id === pageVideo.file_id)
}

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
    playbackRate = 1
  })
  // x
  ArtPlayerRef.hotkey.add(88, () => {
    ArtPlayerRef.playbackRate -= 0.5
    playbackRate -= 0.5
  })
  // c
  ArtPlayerRef.hotkey.add(67, () => {
    ArtPlayerRef.playbackRate += 0.5
    playbackRate += 0.5
  })
  // 获取用户配置
  const storage = ArtPlayerRef.storage
  if (storage.get('curDirList') === undefined) storage.set('curDirList', true)
  if (storage.get('autoJumpCursor') === undefined) storage.set('autoJumpCursor', true)
  if (storage.get('autoSkipEnd') === undefined) storage.set('autoSkipEnd', 0)
  if (storage.get('subTitleListMode') === undefined) storage.set('subTitleListMode', false)
  if (storage.get('subtitleSize') === undefined) storage.set('subtitleSize', 30)
  if (storage.get('autoSkipBegin') === undefined) storage.set('autoSkipBegin', 0)
  if (storage.get('autoPlayNext') === undefined) storage.set('autoPlayNext', true)
  if (storage.get('videoVolume')) ArtPlayerRef.volume = parseFloat(storage.get('videoVolume'))
  if (storage.get('videoMuted')) ArtPlayerRef.muted = storage.get('videoMuted') === 'true'
  const volume = storage.get('videoVolume')
  if (volume) ArtPlayerRef.volume = parseFloat(volume)
  const muted = storage.get('videoMuted')
  if (muted) ArtPlayerRef.muted = muted === 'true'
  ArtPlayerRef.on('ready', async () => {
    // @ts-ignore
    if (!ArtPlayerRef.hls) {
      await ArtPlayerRef.play().catch((err) => {})
      await getVideoCursor(ArtPlayerRef, pageVideo.play_cursor)
      ArtPlayerRef.playbackRate = playbackRate
    }
  })
  // 视频播放完毕
  ArtPlayerRef.on('video:ended', async () => {
    await updateVideoTime()
    if (storage.get('autoPlayNext')) {
      const autoPlayNext = async () => {
        const currentVideoIndex = getCurrentVideoIndex();
        if (currentVideoIndex + 1 >= playList.length) {
          ArtPlayerRef.notice.show = '视频播放完毕'
          return
        }
        const item = playList[currentVideoIndex + 1]
        if (item.file_id !== pageVideo.file_id) {
          await refreshSetting(ArtPlayerRef, item)
          await getPlayList(ArtPlayerRef, item.file_id)
        } else {
          autoPlayNext()
        }
      }
      autoPlayNext()
    }
  })

// // 视频跳转
//   ArtPlayerRef.on('video:seeked', () => {
//     updateVideoTime()
//   })

// 播放已暂停
  ArtPlayerRef.on('video:pause', async () => {
    await updateVideoTime()
  })
// 音量发生变化
  ArtPlayerRef.on('video:volumechange', () => {
    storage.set('videoVolume', ArtPlayerRef.volume)
    storage.set('videoMuted', ArtPlayerRef.muted ? 'true' : 'false')
  })

  // 播放倍数变化
  ArtPlayerRef.on('video:ratechange', async () => {
    playbackRate = ArtPlayerRef.playbackRate
  })

  ArtPlayerRef.on('video:timeupdate', () => {
    const totalDuration = pageVideo.duration
    const endDuration = storage.get('autoSkipEnd')
    if (totalDuration
        && totalDuration - ArtPlayerRef.currentTime > 0
        && totalDuration - ArtPlayerRef.currentTime <= endDuration) {
      ArtPlayerRef.seek = totalDuration
    }
  });
}

const curDirFileList: any[] = []
const childDirFileList: any[] = []
const getDirFileList = async (dir_id: string, hasDir: boolean, category: string = '', filter?: RegExp): Promise<any[]> => {
  if (curDirFileList.length === 0 || (hasDir && childDirFileList.length === 0)) {
    const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id, dir_id, '', 'name asc', '', true)
    if (!dir.next_marker) {
      for (let item of dir.items) {
        const fileInfo = {
          html: item.name,
          category: item.category,
          description: item.description,
          name: item.name,
          file_id: item.file_id,
          ext: item.ext,
          isDir: item.isDir
        }
        if (!hasDir) curDirFileList.push(fileInfo)
        else childDirFileList.push(fileInfo)
      }
    }
  }
  const filterList = hasDir ? [...childDirFileList, ...curDirFileList].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')) : curDirFileList
  if (category) {
    return filterList.filter(file => file.category === category)
  }
  if (filter) {
    return filterList.filter(file => filter.test(file.ext))
  }
  return filterList
}


const refreshSetting = async (art: Artplayer, item: any) => {
  if (pageVideo.file_id === item.file_id) return
  // 刷新文件
  pageVideo.html = item.html
  pageVideo.play_cursor = item.play_cursor
  pageVideo.file_name = item.html
  pageVideo.file_id = item.file_id || ''
  // 更新标记
  const settingStore = useSettingStore()
  if (settingStore.uiAutoColorVideo && !item.description) {
    AliFileCmd.ApiFileColorBatch(pageVideo.user_id, pageVideo.drive_id, 'c5b89b8', [item.file_id])
      .then((success) => {
        if (pageVideo.drive_id == usePanFileStore().DriveID) {
          usePanFileStore().mColorFiles('c5b89b8', success)
        } else {
          useResPanFileStore().mColorFiles('c5b89b8', success)
        }
      })
  }
  // 释放字幕Blob
  if (onlineSubBlobUrl.length > 0) {
    URL.revokeObjectURL(onlineSubBlobUrl)
    onlineSubBlobUrl = ''
  }

  if (AssSubtitleRef) {
    AssSubtitleRef.destroy()
  }

  // 刷新信息
  await getVideoInfo(art)
}

const defaultSetting = async (art: Artplayer) => {
  art.setting.add({
    name: 'autoJumpCursor',
    width: 250,
    html: '自动跳转',
    tooltip: art.storage.get('autoJumpCursor') ? '跳转到历史进度' : '关闭',
    switch: art.storage.get('autoJumpCursor'),
    onSwitch: async (item: SettingOption) => {
      item.tooltip = item.switch ? '关闭' : '跳转到历史进度'
      art.storage.set('autoJumpCursor', !item.switch)
      return !item.switch
    }
  })
  if (playList.length > 1) {
    art.setting.add({
      name: 'autoPlayNext',
      width: 250,
      html: '自动连播',
      tooltip: art.storage.get('autoPlayNext') ? '开启' : '关闭',
      switch: art.storage.get('autoPlayNext'),
      onSwitch: (item: SettingOption) => {
        item.tooltip = item.switch ? '关闭' : '开启'
        art.notice.show = '自动连播' + item.tooltip
        art.storage.set('autoPlayNext', !item.switch)
        return !item.switch
      }
    })
  }
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
          art.storage.set('autoSkipEnd', item.range*60)
          return item.range*60 + 's'
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
      await getPlayList(art)
      return item.html
    }
  })
}

const getVideoInfo = async (art: Artplayer) => {
  // 获取视频链接
  const data: any = await AliFile.ApiVideoPreviewUrlOpenApi(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id)
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
      onSelect: async (item: selectorItem) => {
        await art.switchQuality(item.url)
      }
    })
    // 内嵌字幕
    const subtitles = data.subtitles || []
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
      let subtitleSize = art.storage.get('subtitleSize') + 'px'
      art.subtitle.style('fontSize', subtitleSize)
    }
    // 字幕列表
    await getSubTitleList(art)
  }
}

let playList: selectorItem[] = []
const getPlayList = async (art: Artplayer, file_id?: string) => {
  if (!file_id) {
    let fileList: any
    if (!art.storage.get('curDirList')) {
      fileList = await AliFile.ApiListByFileInfo(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id, 100)
    } else {
      fileList = await getDirFileList(pageVideo.parent_file_id, false, 'video') || []
    }
    playList = []
    if (fileList && fileList.length > 1) {
      for (let i = 0; i < fileList.length; i++) {
        playList.push({
          url: fileList[i].url,
          html: fileList[i].name,
          name: fileList[i].name,
          file_id: fileList[i].file_id,
          description: fileList[i].description,
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
    autoPlayNumber = playList.findIndex(list => list.file_id == pageVideo.file_id)
    art.controls.update({
      name: 'playList',
      index: 10,
      position: 'right',
      style: { padding: '0 10px' },
      html: pageVideo.html.length > 20 ? pageVideo.html.substring(0, 40) + '...' : pageVideo.html,
      selector: playList,
      mounted: (panel: HTMLDivElement) => {
        const $current = Artplayer.utils.queryAll('.art-selector-item', panel)
          .find((item) => Number(item.dataset.index) == autoPlayNumber)
        $current && Artplayer.utils.addClass($current, 'art-list-icon')
      },
      onSelect: async (item: SettingOption, element: HTMLElement) => {
        await updateVideoTime()
        await refreshSetting(art, item)
        Artplayer.utils.inverseClass(element, 'art-list-icon')
        return item.html.length > 20 ? item.html.substring(0, 40) + '...' : item.html
      }
    })
  }
}

const getVideoCursor = async (art: Artplayer, play_cursor: number) => {
  const autoSkipBegin  = art.storage.get('autoSkipBegin')
  if (art.storage.get('autoJumpCursor')) {
    let cursor = play_cursor
    if (cursor > autoSkipBegin) {
      art.currentTime = cursor
    } else {
      art.currentTime = autoSkipBegin
    }
  } else {
    art.currentTime = autoSkipBegin
  }
}

let onlineSubBlobUrl: string = ''
const loadOnlineSub = async (art: Artplayer, item: any) => {
  const data = await AliFile.ApiFileDownText(pageVideo.user_id, pageVideo.drive_id, item.file_id, -1, -1)
  if (data) {
    if (item.ext === 'ass') {
      art.subtitle.show = true
      art.notice.show = `切换字幕：${item.name}`
      await renderAssSubtitle(art, data)
    } else {
      const blob = new Blob([data], { type: item.ext })
      onlineSubBlobUrl = URL.createObjectURL(blob)
      await art.subtitle.switch(onlineSubBlobUrl, { name: item.name, type: item.ext, escape: false })
    }
    return item.html
  } else {
    art.notice.show = `加载${item.name}字幕失败`
  }
}

const renderAssSubtitle = async (art: Artplayer, assText: string) => {
  if (AssSubtitleRef) {
    AssSubtitleRef.destroy()
  }
  const ass = new ASS({
    assText: assText,
    video: art.video
  })
  await ass.init()
  if (ass.canvas) {
    ass.canvas.style.zIndex = '9999'
    AssSubtitleRef = ass
  }
}

// 内嵌字幕
const embedSubSelector: selectorItem[] = []
const getSubTitleList = async (art: Artplayer) => {
  // 尝试加载当前文件夹字幕文件
  let subSelector: selectorItem[]
  const hasDir = art.storage.get('subTitleListMode')
  // 加载二级目录(仅加载一个文件夹)
  let file_id = ''
  if (hasDir) {
    try {
      file_id = curDirFileList.find(file => file.isDir).file_id
    } catch (err) {
    }
  } else {
    file_id = pageVideo.parent_file_id
  }
  let onlineSubSelector = await getDirFileList(file_id, hasDir, '', /srt|vtt|ass/) || []
  // console.log('onlineSubSelector', onlineSubSelector)
  subSelector = [...embedSubSelector, ...onlineSubSelector]
  if (subSelector.length === 0) {
    subSelector.push({ html: '无可用字幕', name: '', url: '', default: true })
  }
  if (embedSubSelector.length === 0 && onlineSubSelector.length > 0) {
    const fileName = pageVideo.file_name
    // 自动加载同名字幕
    const similarity = subSelector.reduce((min, item, index) => {
      // 莱文斯坦距离算法(计算相似度)
      const distance = levenshtein.get(fileName, item.html, { useCollator: true })
      if (distance < min.distance) {
        min.distance = distance
        min.index = index
      }
      return min
    }, { distance: Infinity, index: -1 })
    if (similarity.index !== -1) {
      subSelector.forEach(v => v.default = false)
      subSelector[similarity.index].default = true
      let subtitleSize = art.storage.get('subtitleSize') + 'px'
      art.subtitle.style('fontSize', subtitleSize)
      await loadOnlineSub(art, subSelector[similarity.index])
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
            let subtitleSize = art.storage.get('subtitleSize') + 'px'
            if (AssSubtitleRef && AssSubtitleRef.canvas) {
              AssSubtitleRef.canvas.style.display = art.subtitle.show ? '' : 'none'
            } else {
              art.subtitle.style('fontSize', subtitleSize)
            }
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
        html: '字幕列表',
        tooltip: art.storage.get('subTitleListMode') ? '子文件夹内' : '同文件夹内',
        switch: art.storage.get('subTitleListMode'),
        onSwitch: async (item: SettingOption) => {
          item.tooltip = item.switch ? '同文件夹' : '含子文件夹'
          art.storage.set('subTitleListMode', item.switch)
          await getSubTitleList(art)
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
          if (AssSubtitleRef) return '无法设置'
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
          await art.subtitle.switch(item.url, { escape:false, name: item.name})
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

const updateVideoTime =  async () => {
  await AliFile.ApiUpdateVideoTimeOpenApi(
      pageVideo.user_id,
      pageVideo.drive_id,
      pageVideo.file_id,
      ArtPlayerRef.currentTime
  )
}
const handleHideClick = async () => {
  await updateVideoTime()
  // 释放字幕Blob
  if (onlineSubBlobUrl.length > 0) {
    URL.revokeObjectURL(onlineSubBlobUrl)
    onlineSubBlobUrl = ''
  }
  window.close()
}

onBeforeUnmount(() => {
  if (AssSubtitleRef) {
    AssSubtitleRef.destroy()
  }
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

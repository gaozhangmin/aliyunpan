<script setup lang='ts'>
import { KeyboardState, useAppStore, useKeyboardStore, useSettingStore } from '../store'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Artplayer from 'artplayer'
import HlsJs from 'hls.js'
import AliFile from '../aliapi/file'
import AliDirFileList from '../aliapi/dirfilelist'
import levenshtein from 'fast-levenshtein'
import type { SettingOption } from 'artplayer/types/setting'
import type { Option } from 'artplayer/types/option'
import AliFileCmd from '../aliapi/filecmd'
import { getEncType, getProxyUrl, getRawUrl, IRawUrl } from '../utils/proxyhelper'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import { GetExpiresTime } from '../utils/utils'
import artplayerPluginDanmuku from '../../src/module/video-plugins/artplayer-plugin-danmuku'
import artplayerPluginLibass from '../../src/module/video-plugins/artplayer-plugin-libass'
import PlayerUtils from '../utils/playerhelper'
import { simpleToTradition, traditionToSimple } from 'chinese-simple2traditional'
import path from 'path'

const appStore = useAppStore()
const pageVideo = appStore.pageVideo!
const isTop = ref(false)
let autoPlayNumber = 0
let lastPlayNumber = -1
let playbackRate = 1
let longPressSpeed = 1
let ArtPlayerRef: Artplayer

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (TestAlt('f4', state.KeyDownEvent, handleHideClick)) return
  if (TestAlt('m', state.KeyDownEvent, handleMinClick)) return
  if (TestAlt('enter', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('f11', state.KeyDownEvent, handleMaxClick)) return
  if (TestKey('t', state.KeyDownEvent, handleTop)) return
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
  fullscreenWeb: false,
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
    m3u8: (video: HTMLMediaElement, url: string, art: Artplayer) => playByHls(video, url, art),
    ts: (video: HTMLMediaElement, url: string, art: Artplayer) => playByHls(video, url, art)
  }
}

const playByHls = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (HlsJs.isSupported()) {
    // @ts-ignore
    if (art.hls) art.hls.destroy()
    const hls = new HlsJs({
      maxBufferLength: 500
    })
    hls.detachMedia()
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(HlsJs.Events.ERROR, async (event, data) => {
      const errorType = data.type
      const errorDetails = data.details
      const errorFatal = data.fatal
      if (errorFatal) { // 尝试修复致命错误
        if (errorType === HlsJs.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else if (errorType === HlsJs.ErrorTypes.NETWORK_ERROR) {
          if (pageVideo.expire_time && pageVideo.expire_time <= Date.now()) {
            await updateVideoTime()
            await getVideoInfo(art)
          } else {
            art.emit('video:error', data)
          }
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
    art.notice.show = '不支持的视频格式'
  }
}

type selectorItem = {
  url: string;
  html: string;
  type?: string;
  name?: string;
  default?: boolean;
  file_id?: string;
  ext?: string;
  description?: string;
  play_cursor?: number;
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = pageVideo.file_name || '视频在线预览'
  document.body.setAttribute('arco-theme', 'dark')
  setTimeout(() => {
    document.title = name
    document.getElementById('artPlayer')?.focus()
  }, 1000)
  // 创建播放窗口
  await createVideo(name)
  // 获取视频信息
  await refreshPlayList(ArtPlayerRef)
  await loadPlugins(ArtPlayerRef)
  await getVideoInfo(ArtPlayerRef)
  // 加载设置
  await defaultSettings(ArtPlayerRef)
  await defaultControls(ArtPlayerRef)
})

const createVideo = async (name: string) => {
  // 初始化
  Artplayer.SETTING_WIDTH = 300
  Artplayer.SETTING_ITEM_WIDTH = 300
  Artplayer.NOTICE_TIME = 3000
  Artplayer.LOG_VERSION = false
  Artplayer.PLAYBACK_RATE = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
  ArtPlayerRef = new Artplayer(options)
  ArtPlayerRef.title = name
  // 获取用户配置
  initStorage(ArtPlayerRef)
  initEvent(ArtPlayerRef)
  initHotKey(ArtPlayerRef)
}

const initStorage = (art: Artplayer) => {
  const storage = art.storage
  if (storage.get('autoJumpCursor') === undefined) storage.set('autoJumpCursor', true)
  if (storage.get('subTitleListMode') === undefined) storage.set('subTitleListMode', false)
  if (storage.get('subtitleSize') === undefined) storage.set('subtitleSize', 30)
  if (storage.get('subtitleTranslate') === undefined) storage.set('subtitleTranslate', 0)
  if (storage.get('autoSkipEnd') === undefined) storage.set('autoSkipEnd', 0)
  if (storage.get('longPressSpeed') === undefined) storage.set('longPressSpeed', 2)
  if (storage.get('autoSkipBegin') === undefined) storage.set('autoSkipBegin', 0)
  if (storage.get('videoVolume')) ArtPlayerRef.volume = parseFloat(storage.get('videoVolume'))
  if (storage.get('videoMuted')) ArtPlayerRef.muted = storage.get('videoMuted') === 'true'
}

// 自定义热键
const initHotKey = (art: Artplayer) => {
  // enter
  art.hotkey.add(13, () => {
    art.fullscreen = !art.fullscreen
  })
  // z
  art.hotkey.add(90, () => {
    art.playbackRate = 1
  })
  // x
  art.hotkey.add(88, () => {
    art.playbackRate -= 0.5
  })
  // f
  art.hotkey.add(70, () => {
    art.fullscreen = !art.fullscreen
  })
  // m
  art.hotkey.add(77, () => {
    art.muted = !art.muted
    art.notice.show = art.muted ? '开启静音' : '关闭静音'
  })
  // c
  art.hotkey.add(67, () => {
    playbackRate += 0.5
    if (playbackRate > 4) {
      playbackRate = 4
    }
    art.playbackRate = playbackRate
  })
  art.events.proxy(document, 'keydown', (event: any) => {
    if (!art.video.paused && !art.video.ended && art.video.readyState > art.video.HAVE_CURRENT_DATA) {
      if (event && (event.key === 'ArrowRight' || event.code === 'KeyD')) {
        if (event.repeat) {
          // 按下右箭头键，阻止默认行为
          event.stopPropagation()
          event.preventDefault()
          // 设置播放速度
          art.playbackRate = art.storage.get('longPressSpeed') || 2
          art.notice.show = `x${art.playbackRate.toFixed(1)} 倍速播放中`
        } else {
          longPressSpeed = art.playbackRate
        }
      }
    }
  })
  art.events.proxy(document, 'keyup', (event: any) => {
    if (art.playing && event && (event.key === 'ArrowRight' || event.code === 'KeyD')) {
      // 按下右箭头键，阻止默认行为
      event.stopPropagation()
      event.preventDefault()
      // 恢复倍数
      art.playbackRate = longPressSpeed
    }
  })
}

const initEvent = (art: Artplayer) => {
  // 监听事件
  art.on('ready', async () => {
    await art.play().catch()
    await getVideoCursor(art, pageVideo.play_cursor)
    art.playbackRate = playbackRate
  })
  art.on('restart', async () => {
    await art.play().catch()
    await getVideoCursor(art, pageVideo.play_cursor)
    art.playbackRate = playbackRate
  })
  // 视频播放完毕
  art.on('video:ended', async () => {
    if (playList.length > 1 && art.video.readyState > art.video.HAVE_CURRENT_DATA) {
      if (autoPlayNumber + 1 >= playList.length) {
        art.notice.show = '视频播放完毕'
        return
      }
      if (art.storage.get('autoPlayNext')) {
        await jumpToNextVideo(art)
      }
    }
  })
  // 播放已暂停
  art.on('video:pause', async () => {
    if (art.video.currentTime > 0
      && !art.video.ended
      && art.video.readyState > art.video.HAVE_CURRENT_DATA) {
      await updateVideoTime()
    }
  })
  // 音量发生变化
  art.on('video:volumechange', () => {
    art.storage.set('videoVolume', art.volume)
    art.storage.set('videoMuted', art.muted ? 'true' : 'false')
  })
  // 播放倍数变化
  art.on('video:ratechange', () => {
    playbackRate = art.playbackRate
    let $panel = art.query('.art-setting-panel.art-current')
    let $tooltip = art.query('.art-current .art-setting-item-right-tooltip')
    if ($tooltip) $tooltip.innerText = playbackRate === 1.0 ? art.i18n.get('Normal') : playbackRate.toFixed(1)
    const $current = Artplayer.utils.queryAll('.art-setting-item', $panel)
      .find((item) => Number(item.dataset.value) === playbackRate)
    if ($current) Artplayer.utils.inverseClass($current, 'art-current')
  })
  // 播放时间变化
  art.on('video:timeupdate', async () => {
    if (art.video.currentTime > 0
      && !art.video.paused && !art.video.ended
      && art.video.readyState > art.video.HAVE_CURRENT_DATA) {
      const endDuration = art.storage.get('autoSkipEnd')
      const currentTime = art.currentTime
      if (currentTime > 0 && endDuration > 0) {
        if (endDuration <= currentTime) {
          if (art.storage.get('autoPlayNext')) {
            await jumpToNextVideo(art)
          }
        }
      }
    }
  })
}

const jumpToNextVideo = async (art: Artplayer) => {
  if (lastPlayNumber + 1 !== autoPlayNumber) return
  if (autoPlayNumber + 1 >= playList.length) {
    autoPlayNumber = playList.length
    art.notice.show = '已经是最后一集了'
    return
  }
  const item = playList[++autoPlayNumber]
  // 刷新视频
  await updateVideoTime()
  await refreshSetting(art, item)
  await refreshPlayList(art, item.file_id)
  // 重新载入弹幕
  if (!art.plugins.artplayerPluginDanmuku.isHide) {
    await art.plugins.artplayerPluginDanmuku.stop()
    await art.plugins.artplayerPluginDanmuku.load()
  }
}

const curDirFileList: any[] = []
const childDirFileList: any[] = []
const getDirFileList = async (dir_id: string, hasDir: boolean, category: string = '', filter?: RegExp): Promise<any[]> => {
  if (curDirFileList.length === 0 || (hasDir && childDirFileList.length === 0)) {
    const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id, dir_id, '', 'name asc', '')
    if (!dir.next_marker) {
      for (let item of dir.items) {
        const fileInfo = {
          html: item.name,
          category: item.category,
          description: item.description,
          name: item.name,
          file_id: item.file_id,
          ext: item.ext,
          isDir: item.isDir,
          encType: getEncType({ description: item.description })
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
  // 刷新文件
  pageVideo.html = item.html
  pageVideo.play_cursor = item.play_cursor
  pageVideo.file_name = item.html
  pageVideo.file_id = item.file_id || ''
  autoPlayNumber = playList.findIndex(list => list.file_id == pageVideo.file_id)
  // 更新标记
  const settingStore = useSettingStore()
  const description = item.description
  if (settingStore.uiAutoColorVideo && (!description || !description.includes('ce74c3c'))) {
    AliFileCmd.ApiFileColorBatch(pageVideo.user_id, pageVideo.drive_id, item.description, 'ce74c3c', [item.file_id])
  }
  if (onlineSubData.dataUrl) {
    URL.revokeObjectURL(onlineSubData.dataUrl)
  }
  onlineSubData.data = ''
  onlineSubData.type = ''
  onlineSubData.name = ''
  // 刷新信息
  await getVideoInfo(art)
  await defaultSettings(art)
}

const defaultSettings = async (art: Artplayer) => {
  let autoPlayNext = art.storage.get('autoPlayNext')
  let autoJumpCursor = art.storage.get('autoJumpCursor')
  let autoSkipBegin = art.storage.get('autoSkipBegin')
  let autoSkipEnd = art.storage.get('autoSkipEnd')
  let longPressSpeed = art.storage.get('longPressSpeed')
  art.setting.update({
    name: 'autoJumpCursor',
    width: 300,
    html: '自动跳转',
    icon: art.icons.play,
    tooltip: autoJumpCursor ? '跳转到历史进度' : '关闭',
    switch: autoJumpCursor,
    onSwitch: async (item: SettingOption) => {
      item.tooltip = item.switch ? '关闭' : '跳转到历史进度'
      art.storage.set('autoJumpCursor', !item.switch)
      return !item.switch
    }
  })
  if (playList.length > 1) {
    art.setting.update({
      name: 'autoPlayNext',
      width: 300,
      html: '自动连播',
      icon: art.icons.airplay,
      tooltip: autoPlayNext ? '开启' : '关闭',
      switch: autoPlayNext,
      onSwitch: (item: SettingOption) => {
        item.tooltip = item.switch ? '关闭' : '开启'
        art.notice.show = '自动连播' + item.tooltip
        art.storage.set('autoPlayNext', !item.switch)
        return !item.switch
      }
    })
  }
  art.setting.update({
    name: 'autoSkip',
    width: 300,
    html: '更多设置',
    selector: [{
      name: 'longPressSpeed',
      width: 300,
      html: '长按倍速',
      icon: art.icons.playbackRate,
      tooltip: 'x' + longPressSpeed,
      range: [longPressSpeed, 1.5, 4, 0.5],
      onChange(item: SettingOption) {
        art.storage.set('longPressSpeed', item.range)
        return 'x' + item.range
      }
    }, {
      name: 'autoSkipBegin',
      width: 300,
      html: '设置片头',
      tooltip: autoSkipBegin + 's',
      range: [autoSkipBegin, 0, 3000, 1],
      onChange(item: SettingOption) {
        art.storage.set('autoSkipBegin', item.range)
        return item.range + 's'
      }
    }, {
      name: 'autoSkipEnd',
      width: 300,
      html: '设置片尾',
      tooltip: autoSkipEnd + 's',
      range: [autoSkipEnd, 0, 3000, 1],
      onChange(item: SettingOption) {
        art.storage.set('autoSkipEnd', item.range)
        return item.range + 's'
      }
    }]
  })
}

const defaultControls = async (art: Artplayer) => {
  if (playList.length > 1) {
    art.controls.update({
      index: 20,
      position: 'left',
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-skip-forward"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" x2="19" y1="5" y2="19"></line></svg>',
      tooltip: '下一集',
      click: async () => {
        await jumpToNextVideo(art)
      }
    })
  }
  art.controls.update({
    name: 'skipBegin',
    index: 40,
    position: 'left',
    style: { marginLeft: '10px' },
    html: '片头',
    tooltip: '点击设置片头',
    click: async (component, event) => {
      if (art.storage.get('autoSkipBegin') > 0) {
        art.storage.set('autoSkipBegin', 0)
        art.notice.show = `取消设置片头`
      } else {
        art.storage.set('autoSkipBegin', art.currentTime)
        art.notice.show = `设置片头：${art.currentTime}s`
      }
    }
  })
  art.controls.update({
    name: 'skipEnd',
    index: 50,
    position: 'left',
    html: '片尾',
    tooltip: '点击设置片尾',
    click: async (component, event) => {
      if (art.storage.get('autoSkipEnd') > 0) {
        art.storage.set('autoSkipEnd', 0)
        art.notice.show = `取消设置片尾`
      } else {
        art.storage.set('autoSkipEnd', art.currentTime)
        art.notice.show = `设置片尾：${art.currentTime}s`
      }
    }
  })
}

const loadPlugins = async (art: Artplayer) => {
  // 弹幕插件
  art.plugins.add(artplayerPluginDanmuku({
    danmuku: async (option) => PlayerUtils.getVideoDanmuList(pageVideo, option, autoPlayNumber)
  }))
  // 字幕插件
  art.plugins.add(artplayerPluginLibass({}))
}

const getVideoInfo = async (art: Artplayer) => {
  // 获取视频链接
  const data: string | IRawUrl = await getRawUrl(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id, pageVideo.encType, pageVideo.password, false, 'video')
  if (typeof data != 'string' && data.qualities.length > 0) {
    // 画质
    let uiVideoQuality = useSettingStore().uiVideoQuality
    let defaultQuality: selectorItem
    if (uiVideoQuality === 'Origin') {
      // 代理播放
      data.qualities[0].url = getProxyUrl({
        user_id: pageVideo.user_id,
        drive_id: pageVideo.drive_id,
        file_id: pageVideo.file_id,
        encType: pageVideo.encType,
        password: pageVideo.password,
        file_size: data.size,
        quality: 'Origin',
        proxy_url: data.url
      })
      defaultQuality = data.qualities[0]
    } else {
      let preData = data.qualities.filter(q => q.width)
      defaultQuality = preData.find(q => q.quality === uiVideoQuality) || preData[0] || data.qualities[0]
    }
    art.url = defaultQuality.url
    defaultQuality.default = true
    pageVideo.expire_time = GetExpiresTime(defaultQuality.url)
    art.controls.update({
      name: 'quality',
      index: 20,
      position: 'right',
      style: { marginRight: '15px' },
      html: defaultQuality ? defaultQuality.html : '',
      selector: data.qualities,
      onSelect: async (item: selectorItem) => {
        if (item.html === '原画' && art.hls) {
          art.hls.detachMedia()
          art.hls.destroy()
          delete art.hls
        }
        await art.switchQuality(item.url)
        art.playbackRate = playbackRate
      }
    })
    // 内嵌字幕
    const subtitles = data.subtitles || []
    if (subtitles.length > 0) {
      embedSubSelector = []
      for (let i = 0; i < subtitles.length; i++) {
        embedSubSelector.push({
          html: '内嵌:  ' + subtitles[i].language,
          name: subtitles[i].language,
          url: subtitles[i].url,
          default: i === 0
        })
      }
    }
    // 字幕列表
    await getSubTitleList(art)
  } else {
    art.url = ''
    art.notice.show = '获取视频链接失败'
    art.emit('video:error', '获取视频链接失败')
  }
}

let playList: selectorItem[] = []
const refreshPlayList = async (art: Artplayer, file_id?: string) => {
  if (!file_id) {
    let fileList: any = await getDirFileList(pageVideo.parent_file_id, false, 'video') || []
    if (fileList && fileList.length > 1) {
      playList = []
      for (let i = 0; i < fileList.length; i++) {
        // 移除扩展名
        let fileExt = fileList[i].ext
        let fileName = fileList[i].name
        let html = path.parse(fileName).name
        playList.push({
          url: '',
          html: html,
          name: fileList[i].name,
          file_id: fileList[i].file_id,
          ext: fileExt,
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
    lastPlayNumber = autoPlayNumber - 1
    let curPlayTitle = playList[autoPlayNumber].html
    art.controls.update({
      name: 'playList',
      index: 10,
      position: 'right',
      style: { padding: '0 10px', marginRight: '10px' },
      html: handlerPlayTitle(curPlayTitle),
      selector: playList,
      mounted: (panel: HTMLDivElement) => {
        const $current = Artplayer.utils.queryAll('.art-selector-item', panel)
          .find((item) => Number(item.dataset.index) == autoPlayNumber)
        $current && Artplayer.utils.addClass($current, 'art-list-icon')
      },
      onSelect: async (item: SettingOption, element: HTMLElement) => {
        await updateVideoTime()
        await refreshSetting(art, item)
        lastPlayNumber = autoPlayNumber - 1
        Artplayer.utils.inverseClass(element, 'art-list-icon')
        // 重新载入弹幕
        if (!art.plugins.artplayerPluginDanmuku.isHide) {
          await art.plugins.artplayerPluginDanmuku.stop()
          await art.plugins.artplayerPluginDanmuku.load()
        }
        return handlerPlayTitle(item.html)
      }
    })
  }
}

const handlerPlayTitle = (html: string) => {
  return (html.length > 15 ? html.substring(0, 10) + '...' : html)
}

const getVideoCursor = async (art: Artplayer, play_cursor?: number) => {
  const autoSkipBegin = art.storage.get('autoSkipBegin')
  if (art.storage.get('autoJumpCursor')) {
    let cursor = 0
    // 进度
    if (play_cursor) {
      cursor = play_cursor
    } else {
      const info = await AliFile.ApiFileInfo(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id)
      if (info?.play_cursor) {
        cursor = info?.play_cursor
      } else if (info?.user_meta) {
        const meta = JSON.parse(info?.user_meta)
        if (meta.play_cursor) {
          cursor = parseFloat(meta.play_cursor)
        }
      }
    }
    // 防止无效跳转
    if (cursor >= art.duration) {
      cursor = art.duration - 60
    }
    if (cursor > autoSkipBegin) {
      art.currentTime = cursor
    } else {
      art.currentTime = autoSkipBegin
    }
  } else {
    art.currentTime = autoSkipBegin
  }
}

let onlineSubData: any = { name: '', data: '', dataUrl: '', type: '' }
const loadOnlineSub = async (art: Artplayer, item: any) => {
  const data = await AliFile.ApiFileDownText(pageVideo.user_id, pageVideo.drive_id, item.file_id, -1, -1, item.encType)
  if (data) {
    const subtitleTranslate = art.storage.get('subtitleTranslate')
    if (subtitleTranslate === 1) {
      onlineSubData.data = traditionToSimple(onlineSubData.data)
    } else if (subtitleTranslate === 2) {
      onlineSubData.data = simpleToTradition(onlineSubData.data)
    } else {
      onlineSubData.data = data
    }
    onlineSubData.name = item.name
    onlineSubData.ext = item.ext
    onlineSubData.dataUrl = URL.createObjectURL(
      new Blob([onlineSubData.data], { type: item.ext })
    )
    let type = onlineSubData.ext === 'ass' ? 'libass' : onlineSubData.ext
    await art.subtitle.switch(onlineSubData.dataUrl, {
      name: onlineSubData.name,
      type: type,
      escape: false
    })
    art.subtitle.show = true
    art.notice.show = `切换字幕：${item.name}`
    return item.html
  } else {
    art.notice.show = `加载${item.name}字幕失败`
  }
}

// 内嵌字幕
let embedSubSelector: selectorItem[] = []
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
  } else {
    let subtitleSize = art.storage.get('subtitleSize') + 'px'
    if (onlineSubSelector.length > 0) {
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
        art.subtitle.style('fontSize', subtitleSize)
        await loadOnlineSub(art, subSelector[similarity.index])
      }
    } else {
      art.subtitle.url = embedSubSelector[0].url
      art.subtitle.style('fontSize', subtitleSize)
    }
  }
  const subDefault = subSelector.find((item) => item.default) || subSelector[0]
  const subtitleTranslate = art.storage.get('subtitleTranslate')
  // 字幕设置面板
  art.setting.update({
    name: 'Subtitle',
    width: 300,
    html: '字幕设置',
    tooltip: art.subtitle.show ? (subDefault.url !== '' ? '字幕开启' : subDefault.html) : '字幕关闭',
    selector: [{
      html: '字幕开关',
      icon: art.icons.pip,
      tooltip: subDefault.url !== '' ? '开启' : '关闭',
      switch: subDefault.url !== '',
      onSwitch: (item: SettingOption) => {
        if (subDefault.url !== '') {
          item.tooltip = item.switch ? '关闭' : '开启'
          art.subtitle.show = !item.switch
          art.notice.show = '字幕' + item.tooltip
          let subtitleSize = art.storage.get('subtitleSize') + 'px'
          art.subtitle.style('fontSize', subtitleSize)
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
    }, {
      html: '繁中转换',
      tooltip: subtitleTranslate === 0 ? '关闭' : (subtitleTranslate === 1 ? '繁转中' : '中转繁'),
      selector: [{
        default: subtitleTranslate == 1,
        html: '繁转中',
        subtitleTranslate: 1
      }, {
        default: subtitleTranslate == 2,
        html: '中转繁',
        subtitleTranslate: 2
      }, {
        default: subtitleTranslate == 0,
        html: '关闭',
        subtitleTranslate: 0
      }],
      onSelect: async (item: SettingOption) => {
        art.storage.set('subtitleTranslate', item.subtitleTranslate)
        // 字幕繁中转换
        if (onlineSubData.data) {
          let data = onlineSubData.data
          let tips = '关闭'
          if (item.subtitleTranslate === 1) {
            data = traditionToSimple(onlineSubData.data)
            tips = '字幕：繁体转简体'
          } else if (item.subtitleTranslate === 2) {
            data = simpleToTradition(onlineSubData.data)
            tips = '字幕：简体转繁体'
          }
          URL.revokeObjectURL(onlineSubData.dataUrl)
          onlineSubData.dataUrl = URL.createObjectURL(
            new Blob([data], { type: onlineSubData.ext })
          )
          let type = onlineSubData.ext === 'ass' ? ' libass' : onlineSubData.ext
          await art.subtitle.switch(onlineSubData.dataUrl, {
            name: onlineSubData.name,
            type: type,
            escape: false
          })
          art.subtitle.show = true
          art.notice.show = tips
        }
        return item.html
      }
    }, {
      html: '字幕列表',
      tooltip: art.storage.get('subTitleListMode') ? '含子文件夹' : '同文件夹',
      switch: art.storage.get('subTitleListMode'),
      onSwitch: async (item: SettingOption) => {
        item.tooltip = item.switch ? '同文件夹' : '含子文件夹'
        art.storage.set('subTitleListMode', !item.switch)
        await getSubTitleList(art)
        return !item.switch
      }
    }, {
      html: '字幕偏移',
      tooltip: '0s',
      range: [0, -5, 10, 0.1],
      onChange(item: SettingOption) {
        art.subtitleOffset = item.range
        return item.range + 's'
      }
    }, {
      html: '字幕大小',
      tooltip: art.storage.get('subtitleSize') + 'px',
      range: [art.storage.get('subtitleSize'), 20, 50, 5],
      onChange: (item: SettingOption) => {
        let size = item.range + 'px'
        art.storage.set('subtitleSize', item.range)
        art.subtitle.style('fontSize', size)
        return size
      }
    }, ...subSelector],
    onSelect: async (item: SettingOption, element: HTMLDivElement) => {
      if (art.subtitle.show) {
        if (!item.file_id) {
          art.notice.show = ''
          await art.subtitle.switch(item.url, { name: item.name, escape: false })
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

const updateVideoTime = async () => {
  await AliFile.ApiUpdateVideoTime(
    pageVideo.user_id,
    pageVideo.drive_id,
    pageVideo.file_id,
    ArtPlayerRef.currentTime
  )
}

const handleHideClick = async () => {
  await ArtPlayerRef.emit('video:pause')
  await updateVideoTime()
  window.close()
}
const handleMinClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'minsize' })
}
const handleMaxClick = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'maxsize' })
}
const handleTop = (_e: any) => {
  if (window.WebToWindow) window.WebToWindow({ cmd: 'top' }, (res: string) => {
    ArtPlayerRef.notice.show = res === 'top' ? '窗口置顶' : '窗口取消置顶'
    isTop.value = res === 'top'
  })
}

onBeforeUnmount(() => {
  if (onlineSubData.dataUrl) {
    URL.revokeObjectURL(onlineSubData.dataUrl)
  }
  onlineSubData.name = ''
  onlineSubData.data = ''
  onlineSubData.type = ''
  autoPlayNumber = 0
  lastPlayNumber = -1
  playbackRate = 1
  longPressSpeed = 1
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
        <div class='title'>{{ pageVideo?.file_name || '视频在线预览' }}</div>
        <div class='flexauto'></div>
        <a-button type='text' tabindex='-1' :title="(isTop ? '取消置顶' : '置顶') + 'Alt+T'" @click='handleTop'>
          <i :class="'iconfont ' + (isTop ? 'iconquxiaozhiding' : 'iconzhiding')" />
        </a-button>
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
    <a-layout-content>
      <div id='artPlayer' style='width: 100%; height: 100%;text-overflow: ellipsis;white-space: nowrap;' />
    </a-layout-content>
  </a-layout>
</template>

<style scoped lang="less">
.disable {
  cursor: not-allowed;
  pointer-events: none;
  background-color: transparent;
  color: #ACA899;
}

.art-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.art-list-icon:before {
  content: '\2713';
  font-size: 20px;
  font-weight: bold;
  color: white;
}

:deep(.art-notice) {
  height: 8% !important;
  justify-content: center;
  align-items: center;

  .art-notice-inner {
    background-color: rgba(33, 33, 33, .9);
    color: #fff;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
  }
}
</style>

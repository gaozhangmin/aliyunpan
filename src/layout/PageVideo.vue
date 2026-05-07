<script setup lang='ts'>
import { KeyboardState, useAppStore, useKeyboardStore, useSettingStore } from '../store'
import { useMediaLibraryStore } from '../store/medialibrary'
import type { MediaLibraryItem } from '../types/media'
import { h, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button, Input, Modal, Option as AOption, Select } from '@arco-design/web-vue'
import Artplayer from 'artplayer'
import HlsJs from 'hls.js'
import * as dashjs from 'dashjs'
import AliFile from '../aliapi/file'
import AliDirFileList from '../aliapi/dirfilelist'
import levenshtein from 'fast-levenshtein'
import type { SettingOption } from 'artplayer/types/setting'
import type { Option } from 'artplayer/types/option'
import AliFileCmd from '../aliapi/filecmd'
import PlayerUtils from '../utils/playerhelper'
import { getEncType, getProxyUrl, getRawUrl, IRawUrl } from '../utils/proxyhelper'
import { TestAlt, TestKey } from '../utils/keyboardhelper'
import { GetExpiresTime } from '../utils/utils'
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku'
import type { Danmu } from 'artplayer-plugin-danmuku'
import artplayerPluginChapter from 'artplayer-plugin-chapter'
import artplayerPluginDashControl from 'artplayer-plugin-dash-control'
import artplayerPluginHlsControl from 'artplayer-plugin-hls-control'
import artplayerPluginJassub from 'artplayer-plugin-jassub'
import artplayerPluginMultipleSubtitles from 'artplayer-plugin-multiple-subtitles'
import JASSUBWorker from 'jassub/dist/jassub-worker.js?url'
import JASSUBWorkerWasm from 'jassub/dist/jassub-worker.wasm?url'
import JASSUBWorkerModernWasm from 'jassub/dist/jassub-worker-modern.wasm?url'
import JASSUBDefaultFont from 'jassub/dist/default.woff2?url'
import {
  autoMatchDanmaku,
  buildDanmakuPluginOption,
  getBangumiDetail,
  loadDanmakuComments,
  searchAnime
} from '../utils/danmakuApi'
import type { DanmakuApiConfig, DanmakuEpisode, DanmakuSearchAnime } from '../utils/danmakuApi'
import {
  formatSubtitleDownloadCount,
  getSubtitleDownload,
  getSubtitleExtension,
  searchSubtitles
} from '../utils/subtitleApi'
import type { SubtitleSearchResult } from '../utils/subtitleApi'
import message from '../utils/message'
import { simpleToTradition, traditionToSimple } from 'chinese-simple2traditional'
import path from 'path'
import UserDAL from '../user/userdal'
import Config from '../config'
import { isBaiduUser, isCloud123User, isDrive115User } from '../aliapi/utils'
import { apiCloud123FileList, mapCloud123FileToAliModel } from '../cloud123/dirfilelist'
import { apiDrive115FileList, mapDrive115FileToAliModel } from '../cloud115/dirfilelist'
import { apiBaiduFileList, mapBaiduFileToAliModel } from '../cloudbaidu/dirfilelist'
import { getWebDavConnection, getWebDavConnectionId, isWebDavDrive, listWebDavDirectory } from '../utils/webdavClient'
import useMediaServerRegistryStore from '../store/mediaServerRegistry'
import {
  getMediaServerItemDetail,
  getMediaServerPlaybackInfo,
  reportMediaServerPlaybackProgress,
  reportMediaServerPlaybackStart,
  reportMediaServerPlaybackStop
} from '../media-server/contentGateway'

const appStore = useAppStore()
const mediaStore = useMediaLibraryStore()
const mediaServerRegistry = useMediaServerRegistryStore()
const pageVideo = appStore.pageVideo!
const isTop = ref(false)
let autoPlayNumber = 0
let lastPlayNumber = -1
let playbackRate = 1
let longPressSpeed = 1
let ArtPlayerRef: Artplayer
let mediaServerReportStarted = false
let mediaServerStopReported = false
let mediaServerLastProgressSecond = -1
let pendingMediaServerSeekTime: number | null = null
const mediaServerControlNames = new Set<string>()
let danmakuAutoLoadingKey = ''
let danmakuAutoLoadedKey = ''

const updateWindowTitle = (name?: string) => {
  document.title = name || pageVideo.file_name || '视频在线预览'
}

const applyPendingMediaServerSeek = async (art: Artplayer) => {
  if (pendingMediaServerSeekTime == null) return
  const nextTime = pendingMediaServerSeekTime
  pendingMediaServerSeekTime = null
  if (nextTime <= 0) return
  try {
    art.currentTime = nextTime
  } catch (error) {
    console.warn('媒体服务器切换后恢复播放进度失败:', error)
  }
}

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
  backdrop: false,
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
  subtitle: {
    escape: false
  },
  playsInline: true,
  moreVideoAttr: {
    // @ts-ignore
    'webkit-playsinline': true,
    playsInline: true
  },
  customType: {
    m3u8: (video: HTMLMediaElement, url: string, art: Artplayer) => playByHls(video, url, art),
    ts: (video: HTMLMediaElement, url: string, art: Artplayer) => playByHls(video, url, art),
    mpd: (video: HTMLMediaElement, url: string, art: Artplayer) => playByDash(video, url, art)
  }
}

const refreshMediaServerPlayback = async (
  art: Artplayer,
  sourceId = '',
  videoStreamIndex = -1,
  audioStreamIndex = -1,
  subtitleStreamIndex = -1
) => {
  mediaServerRegistry.ensureLoaded()
  const serverId = pageVideo.media_server_id || ''
  const itemId = pageVideo.media_server_item_id || pageVideo.file_id || ''
  if (!serverId || !itemId) {
    art.notice.show = '媒体服务器播放信息不完整'
    return
  }
  const server = mediaServerRegistry.servers.find((item) => item.id === serverId)
  if (!server) {
    art.notice.show = '媒体服务器不存在或已被删除'
    return
  }
  const playback = await getMediaServerPlaybackInfo(
    server,
    itemId,
    sourceId || pageVideo.media_server_source_id || '',
    videoStreamIndex,
    audioStreamIndex,
    subtitleStreamIndex
  )
  const resumeTime = art.currentTime || pageVideo.play_cursor || playback.playCursorSeconds || 0
  pendingMediaServerSeekTime = resumeTime
  pageVideo.play_cursor = resumeTime
  pageVideo.media_url = playback.url
  pageVideo.media_headers = playback.headers
  pageVideo.media_server_source_id = sourceId || pageVideo.media_server_source_id || ''
  pageVideo.media_server_play_session_id = playback.playSessionId || pageVideo.media_server_play_session_id || ''
  if (videoStreamIndex >= 0) {
    pageVideo.media_server_video_label = (pageVideo.media_server_video_options || []).find((item) => item.streamIndex === videoStreamIndex)?.label || pageVideo.media_server_video_label || ''
  }
  if (audioStreamIndex >= 0) {
    pageVideo.media_server_audio_label = (pageVideo.media_server_audio_options || []).find((item) => item.streamIndex === audioStreamIndex)?.label || pageVideo.media_server_audio_label || ''
  }
  if (subtitleStreamIndex >= 0) {
    pageVideo.media_server_subtitle_label = (pageVideo.media_server_subtitle_options || []).find((item) => item.streamIndex === subtitleStreamIndex)?.label || pageVideo.media_server_subtitle_label || ''
  }
  setArtVideoUrl(art, playback.url, getArtVideoType(playback.url))
  mediaServerReportStarted = false
  mediaServerStopReported = false
  await sendMediaServerStartReport(resumeTime)
  await sendMediaServerProgressReport(resumeTime)
}

const getCurrentMediaServer = () => {
  mediaServerRegistry.ensureLoaded()
  const serverId = pageVideo.media_server_id || ''
  if (!serverId) return undefined
  return mediaServerRegistry.servers.find((item) => item.id === serverId)
}

const sendMediaServerStartReport = async (positionSeconds = 0) => {
  if (pageVideo.drive_id !== 'media_server' || mediaServerReportStarted) return
  const server = getCurrentMediaServer()
  if (!server) return
  try {
    await reportMediaServerPlaybackStart(
      server,
      pageVideo.media_server_item_id || pageVideo.file_id,
      pageVideo.media_server_source_id,
      pageVideo.media_server_play_session_id,
      positionSeconds,
      ArtPlayerRef?.duration || 0
    )
    mediaServerReportStarted = true
    mediaServerStopReported = false
  } catch (error) {
    console.error('媒体服务器开始播放上报失败:', error)
  }
}

const sendMediaServerProgressReport = async (positionSeconds = 0) => {
  if (pageVideo.drive_id !== 'media_server' || !mediaServerReportStarted) return
  const server = getCurrentMediaServer()
  if (!server) return
  try {
    await reportMediaServerPlaybackProgress(
      server,
      pageVideo.media_server_item_id || pageVideo.file_id,
      pageVideo.media_server_source_id,
      pageVideo.media_server_play_session_id,
      positionSeconds,
      ArtPlayerRef?.duration || 0
    )
  } catch (error) {
    console.error('媒体服务器播放进度上报失败:', error)
  }
}

const sendMediaServerStopReport = async (positionSeconds = 0) => {
  if (pageVideo.drive_id !== 'media_server' || mediaServerStopReported) return
  const server = getCurrentMediaServer()
  if (!server) return
  try {
    await reportMediaServerPlaybackStop(
      server,
      pageVideo.media_server_item_id || pageVideo.file_id,
      pageVideo.media_server_source_id,
      pageVideo.media_server_play_session_id,
      positionSeconds,
      ArtPlayerRef?.duration || 0
    )
    mediaServerStopReported = true
  } catch (error) {
    console.error('媒体服务器停止播放上报失败:', error)
  }
}

const playByHls = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (HlsJs.isSupported()) {
    // @ts-ignore
    if (art.hls) art.hls.destroy()
    destroyArtDash(art)
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
    hls.on(HlsJs.Events.MANIFEST_PARSED, () => {
      if ((art as any).hls === hls && isHlsVideoType(art.type)) getHlsControlPlugin(art)?.update?.()
    })
    hls.on(HlsJs.Events.AUDIO_TRACKS_UPDATED, () => {
      if ((art as any).hls === hls && isHlsVideoType(art.type)) getHlsControlPlugin(art)?.update?.()
    })
    // @ts-ignore
    art.hls = hls
    ensureHlsControlPlugin(art)
    art.on('destroy', () => hls.destroy())
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
  } else {
    art.notice.show = '不支持的视频格式'
  }
}

const playByDash = (video: HTMLMediaElement, url: string, art: Artplayer) => {
  if (!dashjs.supportsMediaSource()) {
    art.notice.show = '不支持的视频格式：mpd'
    return
  }
  destroyArtHls(art)
  destroyArtDash(art)
  const dash = dashjs.MediaPlayer().create()
  dash.initialize(video, url, art.option.autoplay)
  ;(art as any).dash = dash
  ensureDashControlPlugin(art)
  const events = dashjs.MediaPlayer.events
  dash.on(events.STREAM_INITIALIZED, () => {
    if ((art as any).dash === dash && isDashVideoType(art.type)) getDashControlPlugin(art)?.update?.()
  })
  dash.on(events.PLAYBACK_METADATA_LOADED, () => {
    if ((art as any).dash === dash && isDashVideoType(art.type)) getDashControlPlugin(art)?.update?.()
  })
  art.on('destroy', () => dash.destroy())
}

const getArtVideoType = (url: string, type?: string) => {
  const normalizedType = String(type || '').toLowerCase()
  if (normalizedType === 'hls' || normalizedType === 'm3u8') return 'm3u8'
  if (normalizedType === 'dash' || normalizedType === 'mpd') return 'mpd'
  if (normalizedType === 'ts') return 'ts'
  const pathname = url.split('?')[0].split('#')[0].toLowerCase()
  if (pathname.endsWith('.m3u8')) return 'm3u8'
  if (pathname.endsWith('.ts')) return 'ts'
  if (pathname.endsWith('.mpd')) return 'mpd'
  return ''
}

const isHlsVideoType = (type: string) => ['m3u8', 'hls', 'ts'].includes(type)
const isDashVideoType = (type: string) => ['mpd', 'dash'].includes(type)

const destroyArtHls = (art: Artplayer) => {
  if ((art as any).hls) {
    ;(art as any).hls.detachMedia?.()
    ;(art as any).hls.destroy?.()
    delete (art as any).hls
  }
  cleanupStreamingControlPlugin(art, 'hls')
}

const destroyArtDash = (art: Artplayer) => {
  if ((art as any).dash) {
    ;(art as any).dash.destroy?.()
    delete (art as any).dash
  }
  cleanupStreamingControlPlugin(art, 'dash')
}

const setArtVideoUrl = (art: Artplayer, url: string, type?: string) => {
  const artType = getArtVideoType(url, type)
  art.type = artType as any
  if (!isHlsVideoType(artType)) destroyArtHls(art)
  if (!isDashVideoType(artType)) destroyArtDash(art)
  art.url = url
  scheduleCleanupInactiveStreamingControls(art)
}

const getHlsControlPlugin = (art: Artplayer) => {
  return art.plugins.artplayerPluginHlsControl as any
}

const safeRemoveArtControl = (art: Artplayer, name: string) => {
  try {
    art.controls.remove(name)
  } catch (error) {
    if ((art.controls as any).cache?.has?.(name)) console.warn(`移除播放器控件失败: ${name}`, error)
  }
}

const safeRemoveArtSetting = (art: Artplayer, name: string) => {
  try {
    if (art.setting.find?.(name)) art.setting.remove(name)
  } catch (error) {
    console.warn(`移除播放器设置失败: ${name}`, error)
  }
}

const forceRemoveStreamingControlDom = (art: Artplayer, name: string) => {
  const player = (art as any).template?.$player as HTMLElement | undefined
  if (!player) return
  player.querySelectorAll(`.art-control-${name}, .art-setting-item[data-name="${name}"]`)
    .forEach((element) => element.remove())
}

const cleanupStreamingControlPlugin = (art: Artplayer, type: 'hls' | 'dash') => {
  const plugin = type === 'hls' ? getHlsControlPlugin(art) : getDashControlPlugin(art)
  if (plugin?.update) {
    art.off('ready', plugin.update)
    art.off('restart', plugin.update)
  }
  safeRemoveArtControl(art, `${type}-quality`)
  safeRemoveArtControl(art, `${type}-audio`)
  safeRemoveArtSetting(art, `${type}-quality`)
  safeRemoveArtSetting(art, `${type}-audio`)
  forceRemoveStreamingControlDom(art, `${type}-quality`)
  forceRemoveStreamingControlDom(art, `${type}-audio`)
}

const cleanupInactiveStreamingControls = (art: Artplayer) => {
  if (!isHlsVideoType(art.type)) cleanupStreamingControlPlugin(art, 'hls')
  if (!isDashVideoType(art.type)) cleanupStreamingControlPlugin(art, 'dash')
}

const scheduleCleanupInactiveStreamingControls = (art: Artplayer) => {
  cleanupInactiveStreamingControls(art)
  window.setTimeout(() => cleanupInactiveStreamingControls(art), 0)
  window.setTimeout(() => cleanupInactiveStreamingControls(art), 250)
}

const ensureHlsControlPlugin = (art: Artplayer) => {
  if (getHlsControlPlugin(art)) return
  art.plugins.add(artplayerPluginHlsControl({
    quality: {
      control: true,
      setting: true,
      getName: (level: any) => level.name || (level.height ? `${level.height}P` : '未知'),
      title: '清晰度',
      auto: '自动'
    },
    audio: {
      control: true,
      setting: true,
      getName: (track: any) => track.name || track.lang || track.language || '默认音轨',
      title: '音轨',
      auto: '自动'
    }
  }))
}

const getDashControlPlugin = (art: Artplayer) => {
  return art.plugins.artplayerPluginDashControl as any
}

const ensureDashControlPlugin = (art: Artplayer) => {
  if (getDashControlPlugin(art)) return
  art.plugins.add(artplayerPluginDashControl({
    quality: {
      control: true,
      setting: true,
      getName: (level: any) => level.height ? `${level.height}P` : '未知',
      title: '清晰度',
      auto: '自动'
    },
    audio: {
      control: true,
      setting: true,
      getName: (track: any) => String(track.lang || track.id || '默认音轨').toUpperCase(),
      title: '音轨',
      auto: '自动'
    }
  }))
}

const getChapterPlugin = (art: Artplayer) => {
  return art.plugins.artplayerPluginChapter as any
}

const getMediaServerChapters = (art: Artplayer) => {
  if (pageVideo.drive_id !== 'media_server') return []
  const duration = Number(art.duration || 0)
  if (!duration) return []
  return (pageVideo.media_server_chapters || [])
    .map((chapter) => ({
      start: Number(chapter.start),
      end: chapter.end === Infinity ? Infinity : Number(chapter.end),
      title: String(chapter.title || '')
    }))
    .filter((chapter) => (
      Number.isFinite(chapter.start)
      && chapter.start >= 0
      && chapter.start < duration
      && (chapter.end === Infinity || (Number.isFinite(chapter.end) && chapter.end > chapter.start))
    ))
    .map((chapter) => ({
      ...chapter,
      end: chapter.end === Infinity ? Infinity : Math.min(chapter.end, duration)
    }))
}

const updateVideoChapters = (art: Artplayer) => {
  getChapterPlugin(art)?.update?.({
    chapters: getMediaServerChapters(art)
  })
}

type selectorItem = {
  url: string;
  html: string;
  type?: string;
  name?: string;
  data?: string;
  default?: boolean;
  file_id?: string;
  ext?: string;
  description?: string;
  play_cursor?: number;
  user_id?: string;
  drive_id?: string;
  parent_file_id?: string;
  password?: string;
  encType?: string;
}

type MultipleSubtitleTrack = {
  name: string;
  label: string;
  url: string;
  type: 'srt' | 'vtt';
}

type mediaServerStreamOption = {
  streamIndex: number;
  label: string;
}

const findMediaServerStreamIndex = (options: mediaServerStreamOption[] = [], label?: string) => {
  if (!label) return -1
  return options.find((item) => item.label === label)?.streamIndex ?? -1
}

const upsertMediaServerControl = (art: Artplayer, option: Record<string, any>) => {
  const name = String(option.name || '')
  if (!name) return
  if (mediaServerControlNames.has(name)) {
    art.controls.update(option as any)
    return
  }
  art.controls.add(option as any)
  mediaServerControlNames.add(name)
}

const removeMediaServerControl = (art: Artplayer, name: string) => {
  if (!mediaServerControlNames.has(name)) return
  art.controls.remove?.(name)
  mediaServerControlNames.delete(name)
}

const loadMediaServerSourceState = async (
  sourceId?: string,
  preferred?: {
    videoStreamIndex?: number
    audioStreamIndex?: number
    subtitleStreamIndex?: number
  }
) => {
  const server = getCurrentMediaServer()
  const itemId = pageVideo.media_server_item_id || pageVideo.file_id || ''
  if (!server || !itemId) return undefined

  const detail = await getMediaServerItemDetail(server, itemId)
  const sourceOptions = detail.sourceOptions || []
  const selectedSource = sourceOptions.find((item) => item.id === sourceId)
    || sourceOptions.find((item) => item.id === pageVideo.media_server_source_id)
    || sourceOptions[0]
  const mediaCards = selectedSource?.mediaInfoCards?.length
    ? selectedSource.mediaInfoCards
    : detail.mediaInfoCards

  const videoOptions = mediaCards
    .filter((card) => card.kind === 'video' && typeof card.streamIndex === 'number')
    .map((card) => ({ streamIndex: card.streamIndex as number, label: card.title }))
  const audioOptions = mediaCards
    .filter((card) => card.kind === 'audio' && typeof card.streamIndex === 'number')
    .map((card) => ({ streamIndex: card.streamIndex as number, label: card.title }))
  const subtitleOptions = mediaCards
    .filter((card) => card.kind === 'subtitle' && typeof card.streamIndex === 'number')
    .map((card) => ({ streamIndex: card.streamIndex as number, label: card.title }))

  const defaultVideoIndex = mediaCards.find((card) => card.kind === 'video' && card.selected && typeof card.streamIndex === 'number')?.streamIndex
    ?? mediaCards.find((card) => card.kind === 'video' && typeof card.streamIndex === 'number')?.streamIndex
    ?? -1
  const defaultAudioIndex = mediaCards.find((card) => card.kind === 'audio' && card.selected && typeof card.streamIndex === 'number')?.streamIndex
    ?? mediaCards.find((card) => card.kind === 'audio' && typeof card.streamIndex === 'number')?.streamIndex
    ?? -1
  const defaultSubtitleIndex = mediaCards.find((card) => card.kind === 'subtitle' && card.selected && typeof card.streamIndex === 'number')?.streamIndex
    ?? mediaCards.find((card) => card.kind === 'subtitle' && typeof card.streamIndex === 'number')?.streamIndex
    ?? -1

  const videoStreamIndex = typeof preferred?.videoStreamIndex === 'number' && preferred.videoStreamIndex >= 0 && videoOptions.some((item) => item.streamIndex === preferred.videoStreamIndex)
    ? preferred.videoStreamIndex
    : defaultVideoIndex
  const audioStreamIndex = typeof preferred?.audioStreamIndex === 'number' && preferred.audioStreamIndex >= 0 && audioOptions.some((item) => item.streamIndex === preferred.audioStreamIndex)
    ? preferred.audioStreamIndex
    : defaultAudioIndex
  const subtitleStreamIndex = typeof preferred?.subtitleStreamIndex === 'number' && preferred.subtitleStreamIndex >= 0 && subtitleOptions.some((item) => item.streamIndex === preferred.subtitleStreamIndex)
    ? preferred.subtitleStreamIndex
    : defaultSubtitleIndex

  pageVideo.media_server_source_id = selectedSource?.id || ''
  pageVideo.media_server_source_label = selectedSource?.title || ''
  pageVideo.media_server_source_options = sourceOptions.map((item) => ({
    id: item.id,
    label: item.title,
    subLabel: item.fileSubLabel
  }))
  pageVideo.media_server_video_options = videoOptions
  pageVideo.media_server_audio_options = audioOptions
  pageVideo.media_server_subtitle_options = subtitleOptions
  pageVideo.media_server_video_label = videoOptions.find((item) => item.streamIndex === videoStreamIndex)?.label || ''
  pageVideo.media_server_audio_label = audioOptions.find((item) => item.streamIndex === audioStreamIndex)?.label || ''
  pageVideo.media_server_subtitle_label = subtitleOptions.find((item) => item.streamIndex === subtitleStreamIndex)?.label || ''
  pageVideo.media_server_chapters = detail.chapters || []

  return {
    sourceId: selectedSource?.id || '',
    sourceLabel: selectedSource?.title || '',
    videoStreamIndex,
    audioStreamIndex,
    subtitleStreamIndex
  }
}

const renderMediaServerControls = (art: Artplayer) => {
  const sourceOptions = pageVideo.media_server_source_options || []
  const sourceLabel = pageVideo.media_server_source_label || ''
  const videoOptions = pageVideo.media_server_video_options || []
  const videoLabel = pageVideo.media_server_video_label || ''
  const audioLabel = pageVideo.media_server_audio_label || ''
  const subtitleLabel = pageVideo.media_server_subtitle_label || ''

  if (sourceOptions.length > 1) {
    upsertMediaServerControl(art, {
      name: 'mediaServerSource',
      index: 17,
      position: 'right',
      style: { padding: '0 10px', marginRight: '8px', opacity: '0.92' },
      html: sourceLabel || sourceOptions[0]?.label || '版本',
      selector: sourceOptions.map((item) => ({
        html: item.subLabel ? `${item.label} · ${item.subLabel}` : item.label,
        sourceId: item.id,
        default: item.id === pageVideo.media_server_source_id
      })),
      onSelect: async (selector: any) => {
        const item = selector as { html: string, sourceId: string }
        const state = await loadMediaServerSourceState(item.sourceId)
        await refreshMediaServerPlayback(
          art,
          state?.sourceId || item.sourceId,
          state?.videoStreamIndex ?? -1,
          state?.audioStreamIndex ?? -1,
          state?.subtitleStreamIndex ?? -1
        )
        renderMediaServerControls(art)
        return state?.sourceLabel || item.html
      }
    })
  } else {
    removeMediaServerControl(art, 'mediaServerSource')
  }

  if (videoOptions.length > 1) {
    upsertMediaServerControl(art, {
      name: 'mediaServerVideo',
      index: 18,
      position: 'right',
      style: { padding: '0 10px', marginRight: '8px', opacity: '0.92' },
      html: videoLabel || videoOptions[0]?.label || '视频流',
      selector: videoOptions.map((item) => ({
        html: item.label,
        streamIndex: item.streamIndex,
        default: item.label === videoLabel
      })),
      onSelect: async (selector: any) => {
        const item = selector as { html: string, streamIndex: number }
        pageVideo.media_server_video_label = item.html
        await refreshMediaServerPlayback(
          art,
          pageVideo.media_server_source_id || '',
          item.streamIndex,
          findMediaServerStreamIndex(pageVideo.media_server_audio_options, pageVideo.media_server_audio_label),
          findMediaServerStreamIndex(pageVideo.media_server_subtitle_options, pageVideo.media_server_subtitle_label)
        )
        return item.html
      }
    })
  } else {
    removeMediaServerControl(art, 'mediaServerVideo')
    removeMediaServerControl(art, 'quality')
  }

  if (audioLabel) {
    upsertMediaServerControl(art, {
      name: 'mediaServerAudio',
      index: 19,
      position: 'right',
      style: { padding: '0 10px', marginRight: '8px', opacity: '0.92' },
      html: `音轨 ${audioLabel}`,
      selector: (pageVideo.media_server_audio_options || []).map((item) => ({
        html: item.label,
        streamIndex: item.streamIndex,
        default: item.label === audioLabel
      })),
      onSelect: async (selector: any) => {
        const item = selector as { html: string, streamIndex: number }
        pageVideo.media_server_audio_label = item.html
        await refreshMediaServerPlayback(
          art,
          pageVideo.media_server_source_id || '',
          findMediaServerStreamIndex(pageVideo.media_server_video_options, pageVideo.media_server_video_label),
          item.streamIndex,
          findMediaServerStreamIndex(pageVideo.media_server_subtitle_options, pageVideo.media_server_subtitle_label)
        )
        return `音轨 ${item.html}`
      }
    })
  } else {
    removeMediaServerControl(art, 'mediaServerAudio')
  }

  if (subtitleLabel) {
    upsertMediaServerControl(art, {
      name: 'mediaServerSubtitle',
      index: 20,
      position: 'right',
      style: { padding: '0 10px', marginRight: '8px', opacity: '0.92' },
      html: `字幕 ${subtitleLabel}`,
      selector: (pageVideo.media_server_subtitle_options || []).map((item) => ({
        html: item.label,
        streamIndex: item.streamIndex,
        default: item.label === subtitleLabel
      })),
      onSelect: async (selector: any) => {
        const item = selector as { html: string, streamIndex: number }
        pageVideo.media_server_subtitle_label = item.html
        await refreshMediaServerPlayback(
          art,
          pageVideo.media_server_source_id || '',
          findMediaServerStreamIndex(pageVideo.media_server_video_options, pageVideo.media_server_video_label),
          findMediaServerStreamIndex(pageVideo.media_server_audio_options, pageVideo.media_server_audio_label),
          item.streamIndex
        )
        return `字幕 ${item.html}`
      }
    })
  } else {
    removeMediaServerControl(art, 'mediaServerSubtitle')
  }
}

const refreshMediaServerPlayList = async (art: Artplayer, itemId?: string) => {
  const entries = pageVideo.media_server_episode_playlist || []
  if (entries.length <= 1) {
    playList = []
    return
  }

  const currentItemId = itemId || pageVideo.media_server_item_id || pageVideo.file_id
  playList = entries.map((item) => ({
    url: '',
    html: item.title,
    name: item.title,
    file_id: item.id,
    default: item.id === currentItemId
  }))

  autoPlayNumber = Math.max(0, playList.findIndex((item) => item.file_id === currentItemId))
  lastPlayNumber = autoPlayNumber - 1
  const currentTitle = playList[autoPlayNumber]?.html || pageVideo.html || pageVideo.file_name || '当前剧集'

  art.setting.update({
    name: 'mediaServerPlayList',
    width: 300,
    html: pageVideo.media_server_playlist_label || '播放列表',
    icon: art.icons.play,
    tooltip: handlerPlayTitle(currentTitle),
    selector: playList,
    onSelect: async (selector: any) => {
      const item = selector as selectorItem
      const nextTitle = await switchMediaServerPlaylistItem(art, item)
      return nextTitle || handlerPlayTitle(item.html)
    }
  })

  art.controls.update({
    name: 'playList',
    index: 10,
    position: 'right',
    style: { padding: '0 10px', marginRight: '10px' },
    html: handlerPlayTitle(currentTitle),
    selector: playList,
    mounted: (element: HTMLElement) => {
      const panel = element as HTMLDivElement
      const $current = Artplayer.utils.queryAll('.art-selector-item', panel)
        .find((item) => Number((item as HTMLElement).dataset.index) === autoPlayNumber)
      if ($current) Artplayer.utils.addClass($current as HTMLElement, 'art-list-icon')
    },
    onSelect: async (selector: any, element: HTMLElement) => {
      const item = selector as selectorItem
      const nextTitle = await switchMediaServerPlaylistItem(art, item)
      Artplayer.utils.inverseClass(element, 'art-list-icon')
      return nextTitle || handlerPlayTitle(item.html)
    }
  })
}

const switchMediaServerPlaylistItem = async (art: Artplayer, item: selectorItem) => {
  const nextItemId = item.file_id || ''
  if (!nextItemId || nextItemId === (pageVideo.media_server_item_id || pageVideo.file_id)) {
    return handlerPlayTitle(item.html)
  }

  const server = getCurrentMediaServer()
  if (!server) {
    art.notice.show = '媒体服务器不存在或已被删除'
    return handlerPlayTitle(pageVideo.html || pageVideo.file_name || item.html)
  }

  try {
    await sendMediaServerProgressReport(art.currentTime || 0)
    await sendMediaServerStopReport(art.currentTime || 0)

    const detail = await getMediaServerItemDetail(server, nextItemId)
    const sourceOption = detail.sourceOptions[0]
    const mediaCards = sourceOption?.mediaInfoCards?.length ? sourceOption.mediaInfoCards : detail.mediaInfoCards
    const selectedVideoCard = mediaCards.find((card) => card.kind === 'video' && card.selected)
      || mediaCards.find((card) => card.kind === 'video')
    const selectedAudioCard = mediaCards.find((card) => card.kind === 'audio' && card.selected)
      || mediaCards.find((card) => card.kind === 'audio')
    const selectedSubtitleCard = mediaCards.find((card) => card.kind === 'subtitle' && card.selected)
      || mediaCards.find((card) => card.kind === 'subtitle')
    const videoOptions = mediaCards
      .filter((card) => card.kind === 'video' && typeof card.streamIndex === 'number')
      .map((card) => ({
        streamIndex: card.streamIndex as number,
        label: card.title
      }))
    const audioOptions = mediaCards
      .filter((card) => card.kind === 'audio' && typeof card.streamIndex === 'number')
      .map((card) => ({
        streamIndex: card.streamIndex as number,
        label: card.title
      }))
    const subtitleOptions = mediaCards
      .filter((card) => card.kind === 'subtitle' && typeof card.streamIndex === 'number')
      .map((card) => ({
        streamIndex: card.streamIndex as number,
        label: card.title
      }))
    const playback = await getMediaServerPlaybackInfo(
      server,
      detail.id,
      sourceOption?.id || '',
      typeof selectedVideoCard?.streamIndex === 'number' ? selectedVideoCard.streamIndex : -1,
      typeof selectedAudioCard?.streamIndex === 'number' ? selectedAudioCard.streamIndex : -1,
      typeof selectedSubtitleCard?.streamIndex === 'number' ? selectedSubtitleCard.streamIndex : -1
    )

    pageVideo.file_id = detail.id
    pageVideo.file_name = detail.title
    pageVideo.html = detail.title
    updateWindowTitle(detail.title)
    pageVideo.parent_file_name = detail.parentTitle || pageVideo.parent_file_name
    pageVideo.play_cursor = playback.playCursorSeconds || 0
    pageVideo.media_url = playback.url
    pageVideo.media_headers = playback.headers
    pageVideo.media_server_item_id = detail.id
    pageVideo.media_server_source_id = sourceOption?.id || ''
    pageVideo.media_server_source_label = sourceOption?.title || ''
    pageVideo.media_server_play_session_id = playback.playSessionId || ''
    pageVideo.media_server_source_options = detail.sourceOptions.map((item) => ({
      id: item.id,
      label: item.title,
      subLabel: item.fileSubLabel
    }))
    pageVideo.media_server_video_label = selectedVideoCard?.title || ''
    pageVideo.media_server_video_options = videoOptions
    pageVideo.media_server_audio_label = selectedAudioCard?.title || ''
    pageVideo.media_server_subtitle_label = selectedSubtitleCard?.title || ''
    pageVideo.media_server_audio_options = audioOptions
    pageVideo.media_server_subtitle_options = subtitleOptions
    pageVideo.media_server_chapters = detail.chapters || []

    mediaServerReportStarted = false
    mediaServerStopReported = false
    mediaServerLastProgressSecond = -1
    if (onlineSubData.dataUrl) URL.revokeObjectURL(onlineSubData.dataUrl)
    onlineSubData.data = ''
    onlineSubData.ext = ''
    onlineSubData.name = ''
    onlineSubData.dataUrl = ''
    clearDownloadedSubtitleSelector()

    pendingMediaServerSeekTime = pageVideo.play_cursor || playback.playCursorSeconds || 0
    await getVideoInfo(art)
    await refreshMediaServerPlayList(art, detail.id)
    await art.play().catch(() => undefined)
    await getVideoCursor(art, pageVideo.play_cursor)
    await applyPendingMediaServerSeek(art)
    art.playbackRate = playbackRate
    await sendMediaServerStartReport(art.currentTime || pageVideo.play_cursor || 0)
    await autoLoadDanmaku(art)
    return handlerPlayTitle(detail.title)
  } catch (error: any) {
    console.error('播放器内切换剧集失败:', error)
    art.notice.show = error?.message || '切换剧集失败'
    return handlerPlayTitle(pageVideo.html || pageVideo.file_name || item.html)
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown, true)
  const name = pageVideo.file_name || '视频在线预览'
  document.body.setAttribute('arco-theme', 'dark')
  setTimeout(() => {
    updateWindowTitle(name)
    document.getElementById('artPlayer')?.focus()
  }, 1000)
  // 创建播放窗口
  await createVideo(name)
  // 获取视频信息
  await refreshPlayList(ArtPlayerRef)
  await loadPlugins(ArtPlayerRef)
  await getVideoInfo(ArtPlayerRef)
  await autoLoadDanmaku(ArtPlayerRef)
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
  if (storage.get('videoVolume')) ArtPlayerRef.volume = parseFloat(String(storage.get('videoVolume')))
  if (storage.get('videoMuted')) ArtPlayerRef.muted = storage.get('videoMuted') === 'true'
}

// 自定义热键
const initHotKey = (art: Artplayer) => {
  // enter
  art.hotkey.add("13", () => {
    art.fullscreen = !art.fullscreen
  })
  // z
  art.hotkey.add("90", () => {
    art.playbackRate = 1
  })
  // x
  art.hotkey.add("88", () => {
    art.playbackRate = Math.max(0.5, art.playbackRate - 0.5)
  })
  // f
  art.hotkey.add("70", () => {
    art.fullscreen = !art.fullscreen
  })
  // m
  art.hotkey.add("77", () => {
    art.muted = !art.muted
    art.notice.show = art.muted ? '开启静音' : '关闭静音'
  })
  // c
  art.hotkey.add("67", () => {
    playbackRate = Math.min(4, playbackRate + 0.5)
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
          art.playbackRate = Number(art.storage.get('longPressSpeed')) || 2
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
    await applyPendingMediaServerSeek(art)
    art.playbackRate = playbackRate
    scheduleCleanupInactiveStreamingControls(art)
    if (pageVideo.drive_id === 'media_server') {
      await sendMediaServerStartReport(art.currentTime || pageVideo.play_cursor || 0)
    }
  })
  art.on('restart', async () => {
    await art.play().catch()
    await getVideoCursor(art, pageVideo.play_cursor)
    await applyPendingMediaServerSeek(art)
    art.playbackRate = playbackRate
    scheduleCleanupInactiveStreamingControls(art)
    if (pageVideo.drive_id === 'media_server') {
      mediaServerLastProgressSecond = -1
      await sendMediaServerStartReport(art.currentTime || pageVideo.play_cursor || 0)
    }
  })
  // 视频播放完毕
  art.on('video:ended', async () => {
    if (pageVideo.drive_id === 'media_server') {
      await sendMediaServerStopReport(art.currentTime || 0)
    }
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
      if (pageVideo.drive_id === 'media_server') {
        await sendMediaServerProgressReport(art.currentTime || 0)
      }
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
    const $panel = art.query('.art-setting-panel.art-current')
    const $tooltip = art.query('.art-current .art-setting-item-right-tooltip')
    if ($tooltip) ($tooltip as HTMLElement).innerText = playbackRate === 1.0 ? art.i18n.get('Normal') : playbackRate.toFixed(1)
    if ($panel) {
      const $current = Artplayer.utils.queryAll('.art-setting-item', $panel as HTMLElement)
        .find((item) => Number((item as HTMLElement).dataset.value) === playbackRate)
      if ($current) Artplayer.utils.inverseClass($current as HTMLElement, 'art-current')
    }
  })
  art.on('video:loadedmetadata', () => {
    updateVideoChapters(art)
    scheduleCleanupInactiveStreamingControls(art)
  })
  art.on('video:canplay', () => {
    scheduleCleanupInactiveStreamingControls(art)
  })
  // 播放时间变化
  art.on('video:timeupdate', async () => {
    if (art.video.currentTime > 0
      && !art.video.paused && !art.video.ended
      && art.video.readyState > art.video.HAVE_CURRENT_DATA) {
      if (pageVideo.drive_id === 'media_server') {
        const currentSecond = Math.floor(art.currentTime)
        if (currentSecond > 0 && currentSecond % 10 === 0 && currentSecond !== mediaServerLastProgressSecond) {
          mediaServerLastProgressSecond = currentSecond
          await sendMediaServerProgressReport(currentSecond)
        }
      }
      const endDuration = art.storage.get('autoSkipEnd') as number
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
  if (pageVideo.drive_id === 'media_server') {
    const nextTitle = await switchMediaServerPlaylistItem(art, item)
    art.notice.show = `切换到 ${nextTitle || item.html}`
    return
  }
  // 刷新视频
  await updateVideoTime()
  await refreshSetting(art, item)
  await refreshPlayList(art, item.file_id)
  await autoLoadDanmaku(art)
}

const curDirFileList: any[] = []
const childDirFileList: any[] = []
const getDirFileList = async (dir_id: string, hasDir: boolean, category: string = '', filter?: RegExp): Promise<any[]> => {
  if (curDirFileList.length === 0 || (hasDir && childDirFileList.length === 0)) {
    let items: any[] = []
    if (isWebDavDrive(pageVideo.drive_id)) {
      const connection = getWebDavConnection(getWebDavConnectionId(pageVideo.drive_id))
      if (connection) {
        items = await listWebDavDirectory(connection, dir_id || '/')
      }
    } else if (isCloud123User(pageVideo.user_id) || pageVideo.drive_id === 'cloud123') {
      const list = await apiCloud123FileList(pageVideo.user_id, dir_id, 500, false)
      items = list.map(item => mapCloud123FileToAliModel(item))
    } else if (isDrive115User(pageVideo.user_id) || pageVideo.drive_id === 'drive115') {
      const list = await apiDrive115FileList(pageVideo.user_id, dir_id, 200, 0, true)
      items = list.map(item => mapDrive115FileToAliModel(item, pageVideo.drive_id))
    } else if (isBaiduUser(pageVideo.user_id) || pageVideo.drive_id === 'baidu') {
      const list = await apiBaiduFileList(pageVideo.user_id, dir_id || '/', 'name', 0, 1000)
      items = list.map(item => mapBaiduFileToAliModel(item, pageVideo.drive_id, dir_id || '/'))
    } else {
      const dir = await AliDirFileList.ApiDirFileList(pageVideo.user_id, pageVideo.drive_id, dir_id, '', 'name asc', '')
      if (!dir.next_marker) items = dir.items
    }
    for (let item of items) {
      const fileInfo = {
        html: item.name,
        category: item.category,
        description: item.description,
        name: item.name,
        file_id: item.file_id,
        ext: item.ext,
        isDir: item.isDir,
        encType: getEncType({ description: item.description || '' })
      }
      if (!hasDir) curDirFileList.push(fileInfo)
      else childDirFileList.push(fileInfo)
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
  if (item.user_id) pageVideo.user_id = item.user_id
  if (item.drive_id) pageVideo.drive_id = item.drive_id
  if (item.parent_file_id) pageVideo.parent_file_id = item.parent_file_id
  if (typeof item.password === 'string') pageVideo.password = item.password
  if (typeof item.encType === 'string' && item.encType) {
    pageVideo.encType = getEncType({ description: item.encType })
  } else if (item.description) {
    pageVideo.encType = getEncType({ description: item.description })
  }
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
  onlineSubData.ext = ''
  onlineSubData.name = ''
  clearDownloadedSubtitleSelector()
  // 刷新信息
  await getVideoInfo(art)
  await defaultSettings(art)
}

const defaultSettings = async (art: Artplayer) => {
  let autoPlayNext = art.storage.get('autoPlayNext') as boolean
  let autoJumpCursor = art.storage.get('autoJumpCursor') as boolean
  let autoSkipBegin = art.storage.get('autoSkipBegin') as number
  let autoSkipEnd = art.storage.get('autoSkipEnd') as number
  let longPressSpeed = art.storage.get('longPressSpeed') as number
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

const getVideoDanmakuTitle = () => {
  return pageVideo.file_name || pageVideo.html || ''
}

const getVideoSearchTitle = () => {
  return pageVideo.file_name || pageVideo.html || ''
}

const getDanmakuVideoKey = () => {
  return [
    pageVideo.drive_id || '',
    pageVideo.user_id || '',
    pageVideo.file_id || '',
    pageVideo.media_server_item_id || '',
    getVideoDanmakuTitle(),
    autoPlayNumber
  ].join('|')
}

const getDanmakuApis = (): DanmakuApiConfig[] => {
  return useSettingStore().danmakuApis
    .filter((api) => api.name.trim() && api.url.trim())
    .map((api) => ({
      id: api.id,
      name: api.name.trim(),
      url: api.url.trim()
    }))
}

const getDanmakuPlugin = (art: Artplayer) => {
  return art.plugins.artplayerPluginDanmuku as any
}

const applyDanmakuPluginConfig = (art: Artplayer) => {
  const plugin = getDanmakuPlugin(art)
  plugin?.config?.(buildDanmakuPluginOption(useSettingStore()) as any)
}

const loadDanmakuToPlayer = async (art: Artplayer, danmus: Danmu[], tip = '已加载弹幕') => {
  const plugin = getDanmakuPlugin(art)
  if (!plugin) return
  applyDanmakuPluginConfig(art)
  await plugin.load?.(danmus)
  if (useSettingStore().danmakuVisible) plugin.show?.()
  else plugin.hide?.()
  message.success(`${tip}（${danmus.length} 条）`)
}

const getJassubInstance = (art: Artplayer) => {
  return (art.plugins.artplayerPluginJassub as any)?.instance
}

const setJassubVisible = (art: Artplayer, visible: boolean) => {
  const instance = getJassubInstance(art)
  const canvasParent = instance?._canvasParent as HTMLElement | undefined
  if (canvasParent) canvasParent.style.display = visible ? 'block' : 'none'
  if (visible) instance?.resize?.()
}

const clearJassubSubtitle = (art: Artplayer) => {
  const instance = getJassubInstance(art)
  instance?.freeTrack?.()
  setJassubVisible(art, false)
  const subtitleElement = (art as any).template?.$subtitle as HTMLElement | undefined
  if (subtitleElement) subtitleElement.style.visibility = 'visible'
}

const isAssSubtitleType = (type?: string) => {
  return ['ass', 'ssa'].includes(String(type || '').toLowerCase())
}

const getSubtitleItemExt = (item: selectorItem) => {
  return String(item.ext || getSubtitleExtension(item.name || item.url || item.html)).toLowerCase()
}

const switchSubtitleText = async (art: Artplayer, name: string, ext: string, data: string) => {
  if (isAssSubtitleType(ext)) {
    const instance = getJassubInstance(art)
    if (!instance) throw new Error('JASSUB 未初始化')
    const subtitleElement = (art as any).template?.$subtitle as HTMLElement | undefined
    if (subtitleElement) subtitleElement.style.visibility = 'hidden'
    instance.freeTrack?.()
    instance.setTrack(data)
    setJassubVisible(art, true)
    art.subtitle.show = true
    art.notice.show = `切换字幕：${name}`
    return
  }

  clearJassubSubtitle(art)
  await art.subtitle.switch(onlineSubData.dataUrl, {
    name,
    type: ext,
    escape: false
  })
  art.subtitle.show = true
  art.notice.show = `切换字幕：${name}`
}

const autoLoadDanmaku = async (art: Artplayer) => {
  const videoKey = getDanmakuVideoKey()
  if (!videoKey || danmakuAutoLoadedKey === videoKey || danmakuAutoLoadingKey === videoKey) return
  const apis = getDanmakuApis()
  if (!apis.length) return
  danmakuAutoLoadingKey = videoKey
  try {
    const match = await autoMatchDanmaku(getVideoDanmakuTitle(), apis)
    const firstMatch = match?.response.matches?.[0]
    if (!match || !firstMatch) throw new Error('no danmaku match')
    const danmus = await loadDanmakuComments(firstMatch.episodeId, match.api)
    if (!danmus.length) throw new Error('empty danmaku')
    if (getDanmakuVideoKey() !== videoKey) return
    const title = firstMatch.episodeTitle || firstMatch.animeTitle || match.api.name
    await loadDanmakuToPlayer(art, danmus, `已自动加载弹幕：${title}`)
    danmakuAutoLoadedKey = videoKey
  } catch (error) {
    console.warn('自动加载弹幕失败:', error)
    if (getDanmakuVideoKey() === videoKey) {
      message.warning('自动加载弹幕失败，可以自己搜索。')
      danmakuAutoLoadedKey = videoKey
    }
  } finally {
    if (danmakuAutoLoadingKey === videoKey) danmakuAutoLoadingKey = ''
  }
}

const subtitleLanguages = [
  { code: 'zh-cn', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh-tw', name: '繁體中文' }
]

const getSelectedDanmakuApi = (apis: DanmakuApiConfig[], apiId: string) => {
  return apis.find((api) => api.id === apiId) || apis[0]
}

const toStringValue = (value: unknown) => {
  return typeof value === 'string' ? value : String(value ?? '')
}

const openDanmakuSearchModal = (art: Artplayer) => {
  const apis = getDanmakuApis()
  if (!apis.length) {
    message.warning('请先在设置中配置弹幕库 API')
    return
  }

  const keyword = ref(getVideoDanmakuTitle())
  const apiId = ref(apis[0].id)
  const loading = ref(false)
  const animes = ref<DanmakuSearchAnime[]>([])
  const episodes = ref<DanmakuEpisode[]>([])
  const selectedAnimeTitle = ref('')
  const selectedAnimeMeta = ref('')
  const viewMode = ref<'search' | 'episodes'>('search')
  let modal: any

  const renderEmpty = (text: string) => {
    return h('div', { class: 'danmaku-empty' }, text)
  }

  const renderAnimeRow = (anime: DanmakuSearchAnime) => {
    const selected = selectedAnimeTitle.value === anime.animeTitle
    return h('button', {
      class: ['danmaku-result-row', selected ? 'is-active' : ''],
      type: 'button',
      onClick: () => loadEpisodes(anime)
    }, [
      h('span', { class: 'danmaku-result-icon' }, [
        h('span', { class: 'danmaku-video-glyph' })
      ]),
      h('span', { class: 'danmaku-result-copy' }, [
        h('span', { class: 'danmaku-result-title' }, anime.animeTitle),
        h('span', { class: 'danmaku-result-meta' }, [
          anime.typeDescription || anime.type || '番剧',
          typeof anime.episodeCount === 'number' ? `  ${anime.episodeCount} 集` : ''
        ].join(''))
      ]),
      h('span', { class: 'danmaku-result-arrow' }, '›')
    ])
  }

  const renderEpisodeRow = (episode: DanmakuEpisode) => {
    const title = episode.episodeTitle || `第 ${episode.episodeNumber || episode.episodeId} 集`
    return h('button', {
      class: 'danmaku-episode-card',
      type: 'button',
      onClick: () => loadEpisode(episode)
    }, [
      h('span', { class: 'danmaku-episode-number' }, typeof episode.episodeNumber !== 'undefined' ? `第 ${episode.episodeNumber} 话` : title),
      h('span', { class: 'danmaku-episode-title' }, title)
    ])
  }

  const runSearch = async () => {
    const api = getSelectedDanmakuApi(apis, apiId.value)
    if (!api || !keyword.value.trim()) return
    loading.value = true
    episodes.value = []
    selectedAnimeTitle.value = ''
    selectedAnimeMeta.value = ''
    viewMode.value = 'search'
    try {
      animes.value = await searchAnime(keyword.value, api)
      if (!animes.value.length) message.warning('没有搜索到弹幕')
    } catch (error: any) {
      message.error(error?.message || '搜索弹幕失败')
    } finally {
      loading.value = false
    }
  }

  const loadEpisodes = async (anime: DanmakuSearchAnime) => {
    const api = getSelectedDanmakuApi(apis, apiId.value)
    if (!api) return
    loading.value = true
    try {
      const detail = await getBangumiDetail(anime.animeId, api)
      selectedAnimeTitle.value = detail.animeTitle || anime.animeTitle
      selectedAnimeMeta.value = anime.typeDescription || anime.type || detail.typeDescription || detail.type || ''
      episodes.value = detail.episodes || []
      if (!episodes.value.length) message.warning('没有可加载的剧集弹幕')
      else viewMode.value = 'episodes'
    } catch (error: any) {
      message.error(error?.message || '获取剧集弹幕失败')
    } finally {
      loading.value = false
    }
  }

  const loadEpisode = async (episode: DanmakuEpisode) => {
    const api = getSelectedDanmakuApi(apis, apiId.value)
    if (!api) return
    loading.value = true
    try {
      const danmus = await loadDanmakuComments(episode.episodeId, api)
      if (!danmus.length) throw new Error('该剧集没有可加载的弹幕')
      await loadDanmakuToPlayer(art, danmus, `已加载弹幕：${episode.episodeTitle}`)
      danmakuAutoLoadedKey = getDanmakuVideoKey()
      modal?.close?.()
    } catch (error: any) {
      message.error(error?.message || '加载弹幕失败')
    } finally {
      loading.value = false
    }
  }

  const renderHeader = () => {
    return h('div', { class: 'danmaku-full-header' }, [
      h('button', {
        class: 'danmaku-close-button',
        type: 'button',
        onClick: () => modal?.close?.()
      }, '×'),
      h('div', { class: 'danmaku-full-title' }, '在线弹幕搜索')
    ])
  }

  const renderSearchView = () => {
    return h('div', { class: 'danmaku-full-content' }, [
      h('div', { class: 'danmaku-searchbar' }, [
        h(Select, {
          class: 'danmaku-api-select',
          modelValue: apiId.value,
          triggerProps: { autoFitPopupMinWidth: true },
          'onUpdate:modelValue': (value: string | number | boolean | Record<string, any> | Array<string | number | boolean | Record<string, any>>) => {
            apiId.value = toStringValue(value)
            animes.value = []
            episodes.value = []
            selectedAnimeTitle.value = ''
            selectedAnimeMeta.value = ''
            if (keyword.value.trim()) void runSearch()
          }
        }, () => apis.map((api) => h(AOption, { value: api.id }, () => api.name))),
      h('div', { class: 'danmaku-input-wrap' }, [
          h(Input, {
            class: 'danmaku-search-input',
            modelValue: keyword.value,
            placeholder: '输入剧集名称或电影标题',
            onInput: (value: string) => { keyword.value = value },
            'onUpdate:modelValue': (value: string) => { keyword.value = value },
            onPressEnter: runSearch
          })
        ]),
        h(Button, {
          class: 'danmaku-search-button',
          loading: loading.value,
          onClick: runSearch
        }, () => '搜索')
      ]),
      h('p', { class: 'danmaku-search-tip' }, '搜索时只保留剧集名称或电影标题，切换弹幕源将自动重新搜索'),
      h('section', { class: 'danmaku-result-shell' }, [
        h('div', { class: 'danmaku-modal-list' }, animes.value.length ? animes.value.map(renderAnimeRow) : renderEmpty('暂无搜索结果'))
      ])
    ])
  }

  const renderEpisodesView = () => {
    return h('div', { class: 'danmaku-full-content danmaku-full-content-episodes' }, [
      h('button', {
        class: 'danmaku-back-button',
        type: 'button',
        onClick: () => { viewMode.value = 'search' }
      }, '‹  返回剧集搜索'),
      h('section', { class: 'danmaku-episode-shell' }, [
        h('div', { class: 'danmaku-episode-grid' }, episodes.value.length ? episodes.value.map(renderEpisodeRow) : renderEmpty('没有可加载的剧集弹幕'))
      ])
    ])
  }

  modal = Modal.open({
    title: '',
    width: 1456,
    hideTitle: true,
    closable: false,
    footer: false,
    maskClosable: false,
    modalClass: 'danmaku-search-modal',
    bodyClass: 'danmaku-search-modal-body',
    onOpen: runSearch,
    content: () => h('div', { class: 'danmaku-modal' }, [
      renderHeader(),
      viewMode.value === 'episodes' ? renderEpisodesView() : renderSearchView()
    ])
  })
}

const loadSubtitleTextToPlayer = async (art: Artplayer, name: string, ext: string, data: string) => {
  clearMultipleSubtitleState(art)
  if (onlineSubData.dataUrl) URL.revokeObjectURL(onlineSubData.dataUrl)
  const subtitleTranslate = art.storage.get('subtitleTranslate')
  if (subtitleTranslate === 1) {
    onlineSubData.data = traditionToSimple(data)
  } else if (subtitleTranslate === 2) {
    onlineSubData.data = simpleToTradition(data)
  } else {
    onlineSubData.data = data
  }
  onlineSubData.name = name
  onlineSubData.ext = ext
  onlineSubData.dataUrl = URL.createObjectURL(new Blob([onlineSubData.data], { type: ext }))
  await switchSubtitleText(art, name, ext, onlineSubData.data)
}

const addDownloadedSubtitleToSelector = (name: string, ext: string, data: string) => {
  downloadedSubSelector.forEach((item) => { item.default = false })
  const html = `搜索: ${name}`
  const index = downloadedSubSelector.findIndex((item) => item.name === name)
  const item = {
    url: '',
    html,
    name,
    ext,
    data,
    default: true
  }
  if (index >= 0) downloadedSubSelector.splice(index, 1, item)
  else downloadedSubSelector.push(item)
}

const loadSubtitleUrlToPlayer = async (art: Artplayer, item: selectorItem) => {
  clearMultipleSubtitleState(art)
  if (typeof item.data === 'string') {
    await loadSubtitleTextToPlayer(art, item.name || item.html, item.ext || getSubtitleExtension(item.name || item.html), item.data)
    return item.html
  }
  const ext = getSubtitleExtension(item.name || item.url || item.html)
  if (isAssSubtitleType(ext)) {
    const response = await fetch(item.url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await loadSubtitleTextToPlayer(art, item.name || item.html, ext, await response.text())
    return item.html
  }
  clearJassubSubtitle(art)
  onlineSubData.name = item.name || item.html
  onlineSubData.data = ''
  onlineSubData.dataUrl = ''
  onlineSubData.ext = ext
  await art.subtitle.switch(item.url, { name: item.name, escape: false })
  return item.html
}

const openSubtitleSearchModal = (art: Artplayer) => {
  const keyword = ref(getVideoSearchTitle())
  const language = ref('zh-cn')
  const loading = ref(false)
  const errorText = ref('')
  const results = ref<SubtitleSearchResult[]>([])
  let modal: any

  const runSearch = async () => {
    if (!keyword.value.trim()) return
    loading.value = true
    errorText.value = ''
    try {
      results.value = await searchSubtitles(keyword.value, language.value)
      if (!results.value.length) message.warning('未找到相关字幕')
    } catch (error: any) {
      errorText.value = error?.message || '搜索失败，请重试'
    } finally {
      loading.value = false
    }
  }

  const loadSubtitle = async (subtitle: SubtitleSearchResult) => {
    loading.value = true
    errorText.value = ''
    try {
      const detail = await getSubtitleDownload(subtitle.fileId)
      const response = await fetch(detail.link)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.text()
      await loadSubtitleTextToPlayer(art, detail.fileName, getSubtitleExtension(detail.fileName), data)
      addDownloadedSubtitleToSelector(detail.fileName, getSubtitleExtension(detail.fileName), data)
      await getSubTitleList(art)
      modal?.close?.()
    } catch (error: any) {
      errorText.value = error?.message || '下载失败，请重试'
    } finally {
      loading.value = false
    }
  }

  const renderSubtitleRow = (subtitle: SubtitleSearchResult) => {
    return h('button', {
      class: 'danmaku-result-row',
      type: 'button',
      disabled: loading.value,
      onClick: () => loadSubtitle(subtitle)
    }, [
      h('span', { class: 'danmaku-result-icon' }, [
        h('span', { class: 'subtitle-doc-glyph' })
      ]),
      h('span', { class: 'danmaku-result-copy' }, [
        h('span', { class: 'danmaku-result-title' }, subtitle.name),
        h('span', { class: 'danmaku-result-meta' }, `${subtitle.language}  下载: ${formatSubtitleDownloadCount(subtitle.downloadCount)}`)
      ]),
      h('span', { class: 'subtitle-download-arrow' }, '↓')
    ])
  }

  const renderContentState = () => {
    if (loading.value && !results.value.length) return h('div', { class: 'danmaku-empty' }, '搜索中...')
    if (errorText.value) return h('div', { class: 'danmaku-empty' }, errorText.value)
    if (!results.value.length) return h('div', { class: 'danmaku-empty' }, keyword.value.trim() ? '未找到相关字幕' : '请输入搜索关键词')
    return results.value.map(renderSubtitleRow)
  }

  modal = Modal.open({
    title: '',
    width: 860,
    hideTitle: true,
    closable: false,
    footer: false,
    maskClosable: false,
    modalClass: 'danmaku-search-modal subtitle-search-modal',
    bodyClass: 'danmaku-search-modal-body',
    onOpen: runSearch,
    content: () => h('div', { class: 'danmaku-modal' }, [
      h('div', { class: 'danmaku-full-header' }, [
        h('button', {
          class: 'danmaku-close-button',
          type: 'button',
          onClick: () => modal?.close?.()
        }, '×'),
        h('div', { class: 'danmaku-full-title' }, '在线字幕搜索')
      ]),
      h('div', { class: 'danmaku-full-content' }, [
        h('div', { class: 'danmaku-searchbar subtitle-searchbar' }, [
          h(Select, {
            class: 'danmaku-api-select',
            modelValue: language.value,
            triggerProps: { autoFitPopupMinWidth: true },
            'onUpdate:modelValue': (value: string | number | boolean | Record<string, any> | Array<string | number | boolean | Record<string, any>>) => {
              language.value = toStringValue(value)
            }
          }, () => subtitleLanguages.map((item) => h(AOption, { value: item.code }, () => item.name))),
          h('div', { class: 'danmaku-input-wrap' }, [
            h(Input, {
              class: 'danmaku-search-input',
              modelValue: keyword.value,
              placeholder: '搜索字幕或输入 TMDB ID',
              onInput: (value: string) => { keyword.value = value },
              'onUpdate:modelValue': (value: string) => { keyword.value = value },
              onPressEnter: runSearch
            })
          ]),
          h(Button, {
            class: 'danmaku-search-button',
            loading: loading.value,
            disabled: !keyword.value.trim(),
            onClick: runSearch
          }, () => '搜索')
        ]),
        h('section', { class: 'danmaku-result-shell' }, [
          h('div', { class: 'danmaku-modal-list' }, renderContentState())
        ])
      ])
    ])
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
      if (Number(art.storage.get('autoSkipBegin')) > 0) {
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
      if (Number(art.storage.get('autoSkipEnd')) > 0) {
        art.storage.set('autoSkipEnd', 0)
        art.notice.show = `取消设置片尾`
      } else {
        art.storage.set('autoSkipEnd', art.currentTime)
        art.notice.show = `设置片尾：${art.currentTime}s`
      }
    }
  })
  const danmakuSearchControl = {
    name: 'danmakuSearch',
    index: 60,
    position: 'right',
    style: { padding: '0 10px', marginRight: '8px' },
    html: '弹幕搜索',
    tooltip: '搜索弹幕',
    click: () => openDanmakuSearchModal(art)
  }
  try {
    art.controls.add(danmakuSearchControl as any)
  } catch {
    art.controls.update(danmakuSearchControl as any)
  }
  const subtitleSearchControl = {
    name: 'subtitleSearch',
    index: 62,
    position: 'right',
    style: { padding: '0 10px', marginRight: '8px' },
    html: '字幕搜索',
    tooltip: '搜索字幕',
    click: () => openSubtitleSearchModal(art)
  }
  try {
    art.controls.add(subtitleSearchControl as any)
  } catch {
    art.controls.update(subtitleSearchControl as any)
  }
}

const loadPlugins = async (art: Artplayer) => {
  // 章节插件
  art.plugins.add(artplayerPluginChapter({
    chapters: []
  }))
  // 弹幕插件
  art.plugins.add(artplayerPluginDanmuku({
    ...buildDanmakuPluginOption(useSettingStore()),
    danmuku: []
  } as any))
  // ASS/SSA 字幕插件
  art.plugins.add(artplayerPluginJassub({
    workerUrl: JASSUBWorker,
    wasmUrl: JASSUBWorkerWasm,
    modernWasmUrl: JASSUBWorkerModernWasm,
    availableFonts: {
      'liberation sans': JASSUBDefaultFont
    },
    fallbackFont: 'liberation sans',
    subContent: '[Script Info]\nScriptType: v4.00+'
  }))
  clearJassubSubtitle(art)
}

const getVideoInfo = async (art: Artplayer) => {
  if (pageVideo.drive_id === 'local') {
    const urlModule = window.require?.('url')
    const filePath = pageVideo.file_id || (pageVideo as any).file_path || ''
    if (filePath) {
      const fileUrl = urlModule?.pathToFileURL ? urlModule.pathToFileURL(filePath).href : `file://${encodeURI(filePath)}`
      setArtVideoUrl(art, fileUrl)
      return
    }
  }
  if (pageVideo.drive_id === 'media_server') {
    if (!(pageVideo.media_server_source_options || []).length) {
      try {
        await loadMediaServerSourceState(pageVideo.media_server_source_id || '')
      } catch (error) {
        console.error('加载媒体服务器版本信息失败:', error)
      }
    }
    const mediaUrl = pageVideo.media_url || ''
    if (!mediaUrl) {
      art.url = ''
      art.notice.show = '获取媒体服务器播放地址失败'
      art.emit('video:error', '获取媒体服务器播放地址失败')
      return
    }
    setArtVideoUrl(art, mediaUrl, getArtVideoType(mediaUrl))
    renderMediaServerControls(art)
    return
  }
  // 获取视频链接
  const data: string | IRawUrl = await getRawUrl(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id, pageVideo.encType, pageVideo.password, false, 'video')
  if (typeof data != 'string' && data.qualities.length > 0) {
    // 画质
    let uiVideoQuality = useSettingStore().uiVideoQuality
    let defaultQuality: selectorItem
    if (uiVideoQuality === 'Origin' && pageVideo.drive_id != 'baidu' && pageVideo.drive_id != 'drive115') {
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
    setArtVideoUrl(art, defaultQuality.url, defaultQuality.type)
    defaultQuality.default = true
    pageVideo.expire_time = GetExpiresTime(defaultQuality.url)
    art.controls.update({
      name: 'quality',
      index: 20,
      position: 'right',
      style: { marginRight: '15px' },
      html: defaultQuality ? defaultQuality.html : '',
      selector: data.qualities,
      onSelect: (selector: any, element: HTMLElement, event: Event) => {
        const item = selector as selectorItem
        const artType = getArtVideoType(item.url, item.type)
        art.type = artType as any
        if (!isHlsVideoType(artType)) destroyArtHls(art)
        if (!isDashVideoType(artType)) destroyArtDash(art)
        art.switchQuality(item.url).then(() => {
          scheduleCleanupInactiveStreamingControls(art)
          art.playbackRate = playbackRate
        })
        return item.html
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
  if (pageVideo.custom_playlist && pageVideo.custom_playlist.length > 1) {
    if (!file_id) {
      playList = pageVideo.custom_playlist.map((item) => ({
        url: '',
        html: item.html || path.parse(item.file_name).name,
        name: item.file_name,
        file_id: item.file_id,
        ext: item.ext,
        description: item.description,
        play_cursor: item.play_cursor,
        user_id: item.user_id,
        drive_id: item.drive_id,
        parent_file_id: item.parent_file_id,
        password: item.password,
        encType: item.encType,
        default: item.file_id === pageVideo.file_id
      }))
    } else {
      for (let list of playList) {
        if (list.file_id === file_id) {
          list.default = true
          break
        }
      }
    }
  } else {
    if (pageVideo.drive_id === 'local') return
  if (pageVideo.drive_id === 'media_server') {
    await refreshMediaServerPlayList(art, file_id)
    return
  }
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
      tooltip: pageVideo.custom_playlist_label || '',
      selector: playList,
      mounted: (element: HTMLElement) => {
        const panel = element as HTMLDivElement
        const $current = Artplayer.utils.queryAll('.art-selector-item', panel)
          .find((item) => Number((item as HTMLElement).dataset.index) == autoPlayNumber)
        if ($current) Artplayer.utils.addClass($current as HTMLElement, 'art-list-icon')
      },
      onSelect: (selector: any, element: HTMLElement, event: Event) => {
        const item = selector as selectorItem
        updateVideoTime().then(() => {
          refreshSetting(art, item).then(() => {
            lastPlayNumber = autoPlayNumber - 1
            Artplayer.utils.inverseClass(element, 'art-list-icon')
            void autoLoadDanmaku(art)
          })
        })
        return handlerPlayTitle(item.html)
      }
    })
  }
}

const handlerPlayTitle = (html: string) => {
  return (html.length > 15 ? html.substring(0, 10) + '...' : html)
}

const getVideoCursor = async (art: Artplayer, play_cursor?: number) => {
  const autoSkipBegin = art.storage.get('autoSkipBegin') as number
  if (art.storage.get('autoJumpCursor')) {
    let cursor = 0
    // 进度
    if (play_cursor) {
      cursor = play_cursor
    } else {
      const info = await PlayerUtils.getPlayCursor(pageVideo.user_id, pageVideo.drive_id, pageVideo.file_id)
      if (info?.play_cursor) {
        cursor = info.play_cursor as number
      } else if (info?.info?.user_meta) {
        const meta = JSON.parse(info?.info?.user_meta)
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

let onlineSubData: any = { name: '', data: '', dataUrl: '', ext: '' }

let multipleSubtitleBlobUrls: string[] = []
let multipleSubtitleMode = 'single'

const applyMultipleSubtitleStyle = () => {
  const style = `
.art-subtitle-primary {
  color: #ffffff;
  font-size: 1em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .85);
}

.art-subtitle-secondary {
  color: #ffd859;
  font-size: .82em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .85);
}
`
  const oldStyle = document.getElementById('artplayer-multiple-subtitle-style')
  if (oldStyle) {
    oldStyle.textContent = style
    return
  }
  const styleElement = document.createElement('style')
  styleElement.id = 'artplayer-multiple-subtitle-style'
  styleElement.textContent = style
  document.head.appendChild(styleElement)
}

const cleanupMultipleSubtitleBlobs = () => {
  multipleSubtitleBlobUrls.forEach((url) => URL.revokeObjectURL(url))
  multipleSubtitleBlobUrls = []
}

const clearMultipleSubtitleState = (art: Artplayer) => {
  ;(art.plugins as any).multipleSubtitles?.tracks?.([])
  cleanupMultipleSubtitleBlobs()
  multipleSubtitleMode = 'single'
}

const isMultipleSubtitleSupported = (item: selectorItem) => {
  const ext = getSubtitleItemExt(item)
  return ['srt', 'vtt'].includes(ext) && (!!item.url || !!item.file_id || typeof item.data === 'string')
}

const hasSubtitleSource = (item?: selectorItem) => {
  return !!item && (!!item.url || !!item.file_id || typeof item.data === 'string')
}

const readSubtitleItemText = async (item: selectorItem) => {
  if (!item.file_id) return ''
  return AliFile.ApiFileDownText(pageVideo.user_id, pageVideo.drive_id, item.file_id, -1, -1, item.encType)
}

const buildMultipleSubtitleTrack = async (art: Artplayer, item: selectorItem, index: number): Promise<MultipleSubtitleTrack | undefined> => {
  const ext = getSubtitleItemExt(item)
  if (ext !== 'srt' && ext !== 'vtt') return undefined
  const label = item.name || item.html || `字幕 ${index + 1}`
  if (item.url) {
    return {
      name: index === 0 ? 'primary' : 'secondary',
      label,
      url: item.url,
      type: ext
    }
  }
  if (typeof item.data === 'string') {
    const url = URL.createObjectURL(new Blob([item.data], { type: ext }))
    multipleSubtitleBlobUrls.push(url)
    return {
      name: index === 0 ? 'primary' : 'secondary',
      label,
      url,
      type: ext
    }
  }
  const data = await readSubtitleItemText(item)
  if (!data) return undefined
  const url = URL.createObjectURL(new Blob([data], { type: ext }))
  multipleSubtitleBlobUrls.push(url)
  return {
    name: index === 0 ? 'primary' : 'secondary',
    label,
    url,
    type: ext
  }
}

const applyMultipleSubtitles = async (art: Artplayer, items: selectorItem[], reverse = false) => {
  const subtitleItems = [...items]
  if (reverse) subtitleItems.reverse()
  clearMultipleSubtitleState(art)
  clearJassubSubtitle(art)
  const tracks = (await Promise.all(
    subtitleItems.slice(0, 2).map((item, index) => buildMultipleSubtitleTrack(art, item, index))
  )).filter(Boolean) as MultipleSubtitleTrack[]
  if (tracks.length < 2) {
    art.notice.show = '至少需要两个 SRT/VTT 字幕'
    return false
  }
  applyMultipleSubtitleStyle()
  const plugin = await artplayerPluginMultipleSubtitles({
    subtitles: tracks.map((track) => ({
      name: track.name,
      url: track.url,
      type: track.type
    }))
  })(art) as any
  ;(art.plugins as any).multipleSubtitles = plugin
  ;(art.plugins as any).multipleSubtitles.tracks(tracks.map((track) => track.name))
  art.subtitle.show = true
  multipleSubtitleMode = reverse ? 'reverse' : 'double'
  art.notice.show = `已加载双字幕：${tracks.map((track) => track.label).join(' / ')}`
  return true
}

const loadOnlineSub = async (art: Artplayer, item: any) => {
  clearMultipleSubtitleState(art)
  const data = await AliFile.ApiFileDownText(pageVideo.user_id, pageVideo.drive_id, item.file_id, -1, -1, item.encType)
  if (data) {
    await loadSubtitleTextToPlayer(art, item.name, item.ext, data)
    return item.html
  } else {
    art.notice.show = `加载${item.name}字幕失败`
  }
}

// 内嵌字幕
let embedSubSelector: selectorItem[] = []
let downloadedSubSelector: selectorItem[] = []

const clearDownloadedSubtitleSelector = () => {
  downloadedSubSelector = []
}

const getSubTitleList = async (art: Artplayer) => {
  // 尝试加载当前文件夹字幕文件
  let subSelector: selectorItem[]
  const hasDir = art.storage.get('subTitleListMode') as boolean
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
  let onlineSubSelector = await getDirFileList(file_id, hasDir, '', /srt|vtt|ass|ssa/) || []
  // console.log('onlineSubSelector', onlineSubSelector)
  subSelector = [...embedSubSelector, ...onlineSubSelector, ...downloadedSubSelector]
  if (subSelector.length === 0) {
    subSelector.push({ html: '无可用字幕', name: '', url: '', default: true })
  } else {
    let subtitleSize = art.storage.get('subtitleSize') + 'px'
    const hasDownloadedDefault = downloadedSubSelector.some((item) => item.default)
    if (onlineSubSelector.length > 0 && !hasDownloadedDefault) {
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
    } else if (embedSubSelector.length > 0 && !hasDownloadedDefault) {
      art.subtitle.url = embedSubSelector[0].url
      art.subtitle.style('fontSize', subtitleSize)
    }
  }
  const subDefault = subSelector.find((item) => item.default) || subSelector[0]
  const multipleSubtitleCandidates = subSelector.filter(isMultipleSubtitleSupported)
  const subtitleTranslate = art.storage.get('subtitleTranslate')
  // 字幕设置面板
  art.setting.update({
    name: 'Subtitle',
    html: '字幕设置',
    tooltip: art.subtitle.show ? (hasSubtitleSource(subDefault) ? '字幕开启' : subDefault.html) : '字幕关闭',
    selector: [{
      html: '字幕开关',
      icon: art.icons.pip,
      tooltip: hasSubtitleSource(subDefault) ? '开启' : '关闭',
      switch: hasSubtitleSource(subDefault),
      onSwitch: (item: SettingOption) => {
        if (hasSubtitleSource(subDefault)) {
          item.tooltip = item.switch ? '关闭' : '开启'
          art.subtitle.show = !item.switch
          if (isAssSubtitleType(onlineSubData.ext)) setJassubVisible(art, !item.switch)
          art.notice.show = '字幕' + item.tooltip
          let subtitleSize = art.storage.get('subtitleSize') + 'px'
          art.subtitle.style('fontSize', subtitleSize)
          let currentItem = Artplayer.utils.queryAll('.art-setting-panel.art-current .art-setting-item:nth-of-type(n+3)')
          if (currentItem.length > 0) {
            currentItem.forEach((current: Element) => {
              const currentElement = current as HTMLElement
              if (item.switch) {
                !art.subtitle.url && Artplayer.utils.removeClass(currentElement, 'art-current')
                Artplayer.utils.addClass(currentElement, 'disable')
                if (item.$parent) item.$parent.tooltip = hasSubtitleSource(subDefault) ? '字幕开启' : subDefault.html
              } else {
                if (item.$parent) item.$parent.tooltip = '字幕开启'
                Artplayer.utils.removeClass(currentElement, 'disable')
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
          if (onlineSubData.dataUrl) URL.revokeObjectURL(onlineSubData.dataUrl)
          onlineSubData.dataUrl = URL.createObjectURL(
            new Blob([data], { type: onlineSubData.ext })
          )
          await switchSubtitleText(art, onlineSubData.name, onlineSubData.ext, data)
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
    }, ...(multipleSubtitleCandidates.length >= 2 ? [{
      html: '双字幕',
      tooltip: multipleSubtitleMode === 'double' ? '开启' : (multipleSubtitleMode === 'reverse' ? '反向' : '关闭'),
      selector: [{
        default: multipleSubtitleMode === 'single',
        html: '关闭',
        mode: 'single'
      }, {
        default: multipleSubtitleMode === 'double',
        html: '双字幕',
        mode: 'double'
      }, {
        default: multipleSubtitleMode === 'reverse',
        html: '双字幕反向',
        mode: 'reverse'
      }],
      onSelect: async (item: SettingOption) => {
        if (item.mode === 'single') {
          clearMultipleSubtitleState(art)
          if (subDefault.file_id) await loadOnlineSub(art, subDefault)
          else if (subDefault.url) await loadSubtitleUrlToPlayer(art, subDefault)
          art.notice.show = '已关闭双字幕'
          return item.html
        }
        const ok = await applyMultipleSubtitles(art, multipleSubtitleCandidates.slice(0, 2), item.mode === 'reverse')
        if (ok && item.$parent) item.$parent.tooltip = item.mode === 'reverse' ? '反向' : '开启'
        return item.html
      }
    }, {
      html: '单字幕',
      tooltip: '选择显示',
      selector: multipleSubtitleCandidates.slice(0, 2).map((candidate, index) => ({
        html: candidate.name || candidate.html || `字幕 ${index + 1}`,
        subtitleIndex: index
      })),
      onSelect: async (item: SettingOption) => {
        const candidate = multipleSubtitleCandidates[item.subtitleIndex]
        if (!candidate) return item.html
        clearMultipleSubtitleState(art)
        if (candidate.file_id) await loadOnlineSub(art, candidate)
        else await loadSubtitleUrlToPlayer(art, candidate)
        return item.html
      }
    }] : []), {
      html: '字幕偏移',
      tooltip: '0s',
      range: [0, -5, 10, 0.1],
      onChange(item: SettingOption) {
        art.subtitleOffset = item.range
        const instance = getJassubInstance(art)
        if (instance) instance.timeOffset = item.range
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
    onSelect: (selector: any, element: HTMLElement, event: Event) => {
      const item = selector as selectorItem
      if (art.subtitle.show) {
        if (!item.file_id) {
          art.notice.show = ''
          loadSubtitleUrlToPlayer(art, item).then(() => item.html).catch((error) => {
            console.error('加载字幕失败:', error)
            art.notice.show = `加载${item.name || item.html}字幕失败`
          })
        } else {
          loadOnlineSub(art, item).then((result) => {
            return result
          })
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
  if (pageVideo.drive_id === 'media_server') return
  await AliFile.ApiUpdateVideoTime(
    pageVideo.user_id,
    pageVideo.drive_id,
    pageVideo.file_id,
    ArtPlayerRef.currentTime
  )
  updateContinueWatching()
}

const findMediaItemByFileId = (fileId: string): MediaLibraryItem | undefined => {
  for (const item of mediaStore.mediaItems) {
    if (item.driveFiles?.some(file => file.id === fileId)) {
      return item
    }
    const season = item.seasons?.find(s =>
      s.episodes?.some(ep => ep.driveFiles?.some(file => file.id === fileId))
    )
    if (season) {
      const episode = season.episodes?.find(ep => ep.driveFiles?.some(file => file.id === fileId))
      if (episode) {
        return {
          ...item,
          id: `${item.id}_${season.seasonNumber}_${episode.episodeNumber}`
        }
      }
    }
  }
  return undefined
}

const updateContinueWatching = () => {
  const fileId = pageVideo.file_id
  const item = findMediaItemByFileId(fileId)
  if (!item) return
  const duration = ArtPlayerRef?.duration || 0
  const progress = duration > 0 ? ArtPlayerRef.currentTime / duration : 0
  item.watchProgress = Math.max(0, Math.min(1, progress))
  item.lastWatched = new Date()
  mediaStore.addToContinueWatching(item)
}

const handleHideClick = async () => {
  if (pageVideo.drive_id === 'media_server') {
    await sendMediaServerStopReport(ArtPlayerRef?.currentTime || 0)
  }
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
  if (pageVideo.drive_id === 'media_server') {
    void sendMediaServerStopReport(ArtPlayerRef?.currentTime || 0)
  }
  if (onlineSubData.dataUrl) {
    URL.revokeObjectURL(onlineSubData.dataUrl)
  }
  onlineSubData.name = ''
  onlineSubData.data = ''
  onlineSubData.ext = ''
  cleanupMultipleSubtitleBlobs()
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

:deep(#artPlayer .JASSUB) {
  position: absolute !important;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

:deep(#artPlayer .JASSUB canvas) {
  pointer-events: none;
}

.danmaku-modal {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    radial-gradient(circle at 34% 18%, rgba(255, 255, 255, .035), transparent 26%),
    linear-gradient(135deg, #1b1b1b 0%, #242424 48%, #181818 100%);
  color: #f1f1f1;
}

.danmaku-full-header {
  position: relative;
  display: flex;
  height: 72px;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, .12);
}

.danmaku-close-button {
  position: absolute;
  left: 32px;
  top: 18px;
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .7);
  color: #242424;
  cursor: pointer;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.danmaku-close-button:hover {
  background: rgba(255, 255, 255, .9);
}

.danmaku-full-title {
  color: #f2f2f2;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0;
}

.danmaku-full-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 28px;
  padding: 36px;
}

.danmaku-full-content-episodes {
  padding-top: 34px;
}

.danmaku-searchbar {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 210px;
  gap: 24px;
  align-items: center;
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 22px;
  background: rgba(255, 255, 255, .045);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
}

.danmaku-search-input,
.danmaku-api-select,
.danmaku-search-button {
  min-width: 0;
}

.danmaku-api-select :deep(.arco-select-view-single) {
  height: 48px;
  border: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, .08);
  color: #f1f1f1;
  font-size: 18px;
  font-weight: 800;
}

.danmaku-input-wrap {
  position: relative;
  display: flex;
  height: 80px;
  align-items: center;
  border-radius: 12px;
  background: rgba(0, 0, 0, .28);
}

.danmaku-search-button-icon {
  position: relative;
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 4px solid currentColor;
  border-radius: 50%;
}

.danmaku-search-icon {
  margin-left: 34px;
  color: rgba(255, 255, 255, .7);
}

.danmaku-search-icon::after,
.danmaku-search-button-icon::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  transform: translate(15px, 18px) rotate(45deg);
}

.danmaku-search-input {
  flex: 1;
}

.danmaku-search-input :deep(.arco-input-wrapper) {
  height: 80px;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.danmaku-search-input :deep(.arco-input) {
  color: #f1f1f1;
  font-size: 24px;
  font-weight: 800;
}

.danmaku-search-input :deep(.arco-input::placeholder) {
  color: rgba(255, 255, 255, .36);
}

.danmaku-search-button {
  height: 104px;
  border: 0;
  border-radius: 999px;
  background: #f7f7f7;
  color: #060606;
  font-size: 24px;
  font-weight: 900;
}

.danmaku-search-button :deep(.arco-btn-content) {
  display: flex;
  align-items: center;
  gap: 18px;
}

.danmaku-search-button-icon {
  width: 20px;
  height: 20px;
  border-width: 4px;
}

.danmaku-search-tip {
  margin: 4px 8px 8px;
  color: rgba(255, 255, 255, .58);
  font-size: 18px;
  font-weight: 700;
}

.danmaku-result-shell,
.danmaku-episode-shell {
  flex: 1;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 28px;
  background: rgba(0, 0, 0, .08);
  padding: 42px 40px;
}

.danmaku-modal-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow: auto;
}

.danmaku-result-row {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 36px;
  width: 100%;
  min-height: 128px;
  align-items: center;
  gap: 28px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 22px;
  padding: 24px 36px 24px 28px;
  background: rgba(255, 255, 255, .045);
  color: #f0f0f0;
  text-align: left;
  cursor: pointer;
  transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
}

.danmaku-result-row:hover {
  background: rgba(255, 255, 255, .07);
  border-color: rgba(255, 255, 255, .14);
  transform: translateY(-1px);
}

.danmaku-result-row.is-active {
  border-color: rgba(64, 128, 255, .8);
}

.danmaku-result-icon {
  display: flex;
  width: 80px;
  height: 80px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, .06);
  color: rgba(255, 255, 255, .68);
}

.danmaku-video-glyph {
  position: relative;
  display: block;
  width: 42px;
  height: 30px;
  border: 4px solid currentColor;
  border-radius: 4px;
}

.danmaku-video-glyph::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 6px;
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-left: 11px solid currentColor;
}

.danmaku-video-glyph::after {
  content: '';
  position: absolute;
  left: 10px;
  bottom: -14px;
  width: 20px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
}

.danmaku-result-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.danmaku-result-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.2;
}

.danmaku-result-meta {
  overflow: hidden;
  color: rgba(255, 255, 255, .58);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
}

.danmaku-result-arrow {
  color: #3f83ff;
  font-size: 56px;
  font-weight: 300;
  line-height: 1;
}

.danmaku-back-button {
  align-self: flex-start;
  min-width: 190px;
  height: 56px;
  border: 0;
  border-radius: 999px;
  padding: 0 24px;
  background: rgba(255, 255, 255, .07);
  color: #f1f1f1;
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
}

.danmaku-back-button:hover {
  background: rgba(255, 255, 255, .12);
}

.danmaku-episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  align-content: flex-start;
  gap: 16px;
  height: 100%;
  overflow: auto;
  padding: 52px 24px;
}

.danmaku-episode-card {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 20px;
  padding: 24px;
  background: rgba(255, 255, 255, .035);
  color: #f1f1f1;
  cursor: pointer;
  text-align: center;
}

.danmaku-episode-card:hover {
  background: rgba(255, 255, 255, .065);
  border-color: rgba(255, 255, 255, .16);
}

.danmaku-episode-number {
  font-size: 25px;
  font-weight: 900;
}

.danmaku-episode-title {
  max-width: 100%;
  color: rgba(255, 255, 255, .62);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
}

.danmaku-empty {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, .5);
  font-size: 20px;
  font-weight: 800;
}

:global(.danmaku-search-modal) {
  background: transparent;
}

:global(.danmaku-search-modal .arco-modal-header) {
  display: none;
}

:global(.danmaku-search-modal-body) {
  height: 100vh;
  padding: 0 !important;
  background: transparent;
}

:global(.danmaku-search-modal .arco-modal-close-btn) {
  display: none;
}

:global(.danmaku-search-modal .arco-modal-footer) {
  display: none;
}

@media (max-width: 900px) {
  .danmaku-searchbar {
    grid-template-columns: 1fr;
  }

  .danmaku-search-button {
    height: 72px;
  }

  .danmaku-result-row {
    grid-template-columns: 56px minmax(0, 1fr) 24px;
    min-height: 100px;
    gap: 16px;
    padding: 18px;
  }

  .danmaku-result-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }

  .danmaku-result-title {
    font-size: 18px;
  }

  .danmaku-result-meta {
    font-size: 15px;
  }
}
</style>

<style lang="less">
.danmaku-search-modal {
  overflow: hidden;
  background:
    radial-gradient(circle at 34% 18%, rgba(255, 255, 255, .035), transparent 26%),
    linear-gradient(135deg, #1b1b1b 0%, #242424 48%, #181818 100%);

  .arco-modal-header,
  .arco-modal-close-btn,
  .arco-modal-footer {
    display: none;
  }
}

.danmaku-search-modal-body {
  height: min(620px, calc(100vh - 96px));
  overflow: hidden;
  padding: 0 !important;
  background: transparent;
}

.danmaku-modal {
  display: flex;
  height: min(620px, calc(100vh - 96px));
  overflow: hidden;
  flex-direction: column;
  background:
    radial-gradient(circle at 34% 18%, rgba(255, 255, 255, .035), transparent 26%),
    linear-gradient(135deg, #1b1b1b 0%, #242424 48%, #181818 100%);
  color: #f1f1f1;
}

.danmaku-full-header {
  position: relative;
  display: flex;
  height: 56px;
  flex: 0 0 56px;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, .12);
}

.danmaku-close-button {
  position: absolute;
  left: 18px;
  top: 14px;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .7);
  color: #242424;
  cursor: pointer;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.danmaku-full-title {
  color: #f2f2f2;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0;
}

.danmaku-full-content {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px 24px;
}

.danmaku-searchbar {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 116px;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 16px;
  background: rgba(255, 255, 255, .045);
}

.subtitle-searchbar {
  grid-template-columns: 150px minmax(0, 1fr) 116px;
}

.danmaku-api-select .arco-select-view-single {
  height: 44px;
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 6px;
  background: rgba(255, 255, 255, .04);
  color: #f1f1f1;
  font-size: 16px;
  font-weight: 600;
}

.danmaku-input-wrap {
  position: relative;
  display: flex;
  height: 44px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 6px;
  background: rgba(0, 0, 0, .28);
}

.danmaku-search-icon,
.danmaku-search-button-icon {
  position: relative;
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.danmaku-search-button-icon::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transform: translate(11px, 12px) rotate(45deg);
}

.danmaku-search-input {
  min-width: 0;
  flex: 1;
  width: 100%;
}

.danmaku-search-input .arco-input-wrapper {
  height: 42px;
  padding-left: 16px;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.danmaku-search-input .arco-input {
  color: #f1f1f1;
  font-size: 16px;
  font-weight: 600;
}

.danmaku-search-input .arco-input::placeholder {
  color: rgba(255, 255, 255, .36);
}

.danmaku-search-button {
  min-width: 0;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: #111;
  font-size: 16px;
  font-weight: 700;
}

.danmaku-search-button .arco-btn-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.danmaku-search-button-icon {
  width: 16px;
  height: 16px;
  border-width: 3px;
}

.danmaku-search-tip {
  margin: 0 8px;
  color: rgba(255, 255, 255, .58);
  font-size: 14px;
  font-weight: 700;
}

.danmaku-result-shell,
.danmaku-episode-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 28px;
  background: rgba(0, 0, 0, .08);
  padding: 20px;
}

.danmaku-modal-list {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.danmaku-result-row {
  display: grid;
  width: 100%;
  min-height: 82px;
  grid-template-columns: 52px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  padding: 14px 20px 14px 16px;
  background: rgba(255, 255, 255, .045);
  color: #f0f0f0;
  text-align: left;
  cursor: pointer;
}

.danmaku-result-icon {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, .06);
  color: rgba(255, 255, 255, .68);
}

.danmaku-video-glyph {
  position: relative;
  display: block;
  width: 28px;
  height: 20px;
  border: 3px solid currentColor;
  border-radius: 4px;
}

.danmaku-video-glyph::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 4px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid currentColor;
}

.danmaku-video-glyph::after {
  content: '';
  position: absolute;
  left: 7px;
  bottom: -10px;
  width: 14px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
}

.subtitle-doc-glyph {
  position: relative;
  display: block;
  width: 28px;
  height: 34px;
  border: 3px solid currentColor;
  border-radius: 4px;
}

.subtitle-doc-glyph::before,
.subtitle-doc-glyph::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
}

.subtitle-doc-glyph::before {
  top: 10px;
}

.subtitle-doc-glyph::after {
  top: 19px;
}

.danmaku-result-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.danmaku-result-title {
  overflow: hidden;
  color: #f0f0f0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 900;
}

.danmaku-result-meta {
  overflow: hidden;
  color: rgba(255, 255, 255, .58);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 800;
}

.danmaku-result-arrow {
  color: #3f83ff;
  font-size: 38px;
  font-weight: 300;
  line-height: 1;
}

.subtitle-download-arrow {
  color: #3f83ff;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.danmaku-back-button {
  align-self: flex-start;
  min-width: 150px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  padding: 0 24px;
  background: rgba(255, 255, 255, .07);
  color: #f1f1f1;
  cursor: pointer;
  font-size: 16px;
  font-weight: 900;
}

.danmaku-episode-grid {
  display: grid;
  height: 100%;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  align-content: flex-start;
  gap: 16px;
  overflow: auto;
  padding: 24px 12px;
}

.danmaku-episode-card {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, .035);
  color: #f1f1f1;
  cursor: pointer;
  text-align: center;
}

.danmaku-episode-number {
  font-size: 18px;
  font-weight: 900;
}

.danmaku-episode-title {
  color: rgba(255, 255, 255, .62);
  font-size: 14px;
  font-weight: 800;
}

.danmaku-empty {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, .5);
  font-size: 15px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .danmaku-searchbar {
    grid-template-columns: 1fr;
  }

  .danmaku-search-button {
    height: 72px;
  }
}
</style>

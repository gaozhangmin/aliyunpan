import { defineStore } from 'pinia'
import DebugLog from '../utils/debuglog'
import { getUserDataPath } from '../utils/electronhelper'
import { useAppStore } from '../store'
import PanDAL from '../pan/pandal'
import { existsSync, readFileSync, writeFileSync } from 'fs'

declare type ProxyType = 'none' | 'http' | 'https' | 'socks4' | 'socks4a' | 'socks5' | 'socks5h'
declare type VideoQuality = 'Origin' | 'QHD' | 'FHD' | 'HD' | 'SD' | 'LD'

export interface SettingState {
  // 应用设置
  uiTheme: string
  uiImageMode: string
  uiExitOnClose: boolean
  uiLaunchAutoCheckUpdate: boolean
  uiLaunchAutoSign: boolean
  uiLaunchStart: boolean
  uiLaunchStartShow: boolean
  uiUpdateProxyEnable: boolean
  uiUpdateProxyUrl: string

  // 账户设置
  uiEnableOpenApiType: string
  uiOpenApiClientId: string
  uiOpenApiClientSecret: string

  // 安全设置
  securityEncType: string
  securityPassword: string
  securityPasswordConfirm: boolean
  securityEncFileName: boolean
  securityEncFileNameHideExt: boolean
  securityFileNameAutoDecrypt: boolean
  securityPreviewAutoDecrypt: boolean

  securityHideBackupDrive: boolean
  securityHideResourceDrive: boolean
  securityHidePicDrive: boolean

  // 在线预览
  uiVideoQuality: VideoQuality
  uiVideoQualityTips: boolean
  uiVideoQualityLastSelect: boolean
  uiVideoPlayer: string
  uiVideoEnablePlayerList: boolean
  uiVideoPlayerExit: boolean
  uiVideoPlayerHistory: boolean
  uiVideoPlayerParams: string
  uiVideoSubtitleMode: string
  uiVideoPlayerPath: string

  uiAutoColorVideo: boolean
  uiAutoPlaycursorVideo: boolean

  uiXBTNumber: number
  uiXBTWidth: number

  // 网盘设置
  uiShowPanPath: boolean
  uiShowPanMedia: boolean
  uiShowPanRootFirst: string
  uiFolderSize: boolean
  uiFileOrderDuli: string
  uiTimeFolderFormate: string
  uiTimeFolderIndex: number
  uiShareDays: string
  uiSharePassword: string
  uiShareFormate: string
  uiFileListOrder: string
  uiFileListMode: string
  uiFileColorArray: { key: string; title: string }[]

  // 下载文件
  downSavePath: string
  downSavePathDefault: boolean
  downSavePathFull: boolean
  downSaveBreakWeiGui: boolean
  downFileMax: number
  downThreadMax: number
  downGlobalSpeed: number
  downGlobalSpeedM: string

  // 上传文件
  uploadFileMax: number
  uploadGlobalSpeed: number
  uploadGlobalSpeedM: string

  // 上传下载综合设置
  downAutoShutDown: number
  downSaveShowPro: boolean
  downSmallFileFirst: boolean
  downUploadBreakFile: boolean
  downUploadWhatExist: string
  downIngoredList: string[]
  downFinishAudio: boolean
  downAutoStart: boolean

  // webdav
  webDavEnable: boolean
  webDavAutoEnable: boolean
  webDavHost: string
  webDavPort: number
  webDavListCache: number
  webDavStrategy: string

  // 高级选项
  debugDirSize: string
  debugCacheSize: string
  debugFileListMax: number
  debugFavorListMax: number
  debugDowningListMax: number
  debugDownedListMax: number
  debugFolderSizeCacheHour: number
  debugProxyHost: string
  debugProxyPort: string
  // 自动填写 分享链接提取码
  yinsiLinkPassword: boolean
  yinsiZipPassword: boolean

  // 网络代理
  proxyUseProxy: boolean
  proxyType: ProxyType
  proxyHost: string
  proxyPort: number
  proxyUserName: string
  proxyPassword: string

  // 远程Aria
  ariaSavePath: string
  ariaUrl: string
  ariaPwd: string
  ariaHttps: boolean
  ariaState: string
  ariaLoading: boolean
}

const setting: SettingState = {
  // 应用设置
  uiTheme: 'system',
  uiImageMode: 'fill',
  uiExitOnClose: false,
  uiLaunchAutoCheckUpdate: false,
  uiLaunchAutoSign: false,
  uiLaunchStart: false,
  uiLaunchStartShow: false,
  uiUpdateProxyEnable: false,
  uiUpdateProxyUrl: 'https://mirror.ghproxy.com',

  // 账户设置
  uiEnableOpenApiType: 'inline',
  uiOpenApiClientId: '',
  uiOpenApiClientSecret: '',

  // 安全设置
  securityEncType: 'aesctr',
  securityPassword: '',
  securityPasswordConfirm: false,
  securityEncFileName: true,
  securityEncFileNameHideExt: false,
  securityFileNameAutoDecrypt: true,
  securityPreviewAutoDecrypt: true,

  securityHideBackupDrive: false,
  securityHideResourceDrive: false,
  securityHidePicDrive: false,

  // 在线预览
  uiVideoQuality: 'Origin',
  uiVideoQualityTips: false,
  uiVideoQualityLastSelect: true,
  uiVideoPlayer: 'web',
  uiVideoEnablePlayerList: false,
  uiVideoPlayerExit: false,
  uiVideoPlayerHistory: false,
  uiVideoPlayerParams: '',
  uiVideoSubtitleMode: 'auto',
  uiVideoPlayerPath: '',

  uiAutoPlaycursorVideo: true,
  uiAutoColorVideo: true,

  uiXBTNumber: 36,
  uiXBTWidth: 960,

  // 网盘设置
  uiShowPanPath: true,
  uiShowPanMedia: false,
  uiShowPanRootFirst: 'all',
  uiFolderSize: true,
  uiFileOrderDuli: 'null',
  uiTimeFolderFormate: 'yyyy-MM-dd HH-mm-ss',
  uiTimeFolderIndex: 1,
  uiShareDays: 'always',
  uiSharePassword: 'random',
  uiShareFormate: '「NAME」URL\n提取码: PWD',
  uiFileListOrder: 'name asc',
  uiFileListMode: 'list',
  uiFileColorArray: [
    { key: '#df5659', title: '鹅冠红' },
    { key: '#9c27b0', title: '兰花紫' },
    { key: '#42a5f5', title: '晴空蓝' },
    { key: '#00bc99', title: '竹叶青' },
    { key: '#4caf50', title: '宝石绿' },
    { key: '#ff9800', title: '金盏黄' }
  ],

  // 下载文件
  downSavePath: '',
  downSavePathDefault: true,
  downSavePathFull: true,
  downSaveBreakWeiGui: true,
  downFileMax: 5,
  downThreadMax: 4,
  downGlobalSpeed: 0,
  downGlobalSpeedM: 'MB',

  // 上传文件
  uploadFileMax: 5,
  uploadGlobalSpeed: 0,
  uploadGlobalSpeedM: 'MB',

  // 上传下载综合设置
  downAutoShutDown: 0,
  downSaveShowPro: true,
  downSmallFileFirst: false,
  downUploadBreakFile: false,
  downUploadWhatExist: 'refuse',
  downIngoredList: ['thumbs.db', 'desktop.ini', '.ds_store', '.td', '~', '.downloading'],
  downFinishAudio: true,
  downAutoStart: true,

  // webdav
  webDavEnable: false,
  webDavAutoEnable: false,
  webDavHost: '127.0.0.1',
  webDavPort: 8888,
  webDavListCache: 10,
  webDavStrategy: 'redirect',

  // 高级选项
  debugCacheSize: '',
  debugDirSize: '',
  debugFileListMax: 3000,
  debugFavorListMax: 500,
  debugDowningListMax: 1000,
  debugDownedListMax: 5000,
  debugFolderSizeCacheHour: 72,
  debugProxyHost: '127.0.0.1',
  debugProxyPort: '6666',
  // 自动填写 分享链接提取码
  yinsiLinkPassword: false,
  yinsiZipPassword: false,

  // 网络代理
  proxyUseProxy: false,
  proxyType: 'none',
  proxyHost: '',
  proxyPort: 0,
  proxyUserName: '',
  proxyPassword: '',

  // 远程Aria
  ariaSavePath: '',
  ariaUrl: '',
  ariaPwd: '',
  ariaHttps: false,
  ariaState: 'local',
  ariaLoading: false
}

function _loadSetting(val: any) {
  console.log('_loadSetting', val)
  // 应用设置
  setting.uiTheme = defaultValue(val.uiTheme, ['system', 'light', 'dark'])
  setting.uiImageMode = defaultValue(val.uiImageMode, ['fill', 'width', 'web'])
  setting.uiExitOnClose = defaultBool(val.uiExitOnClose, false)
  setting.uiLaunchAutoCheckUpdate = defaultBool(val.uiLaunchAutoCheckUpdate, false)
  setting.uiLaunchAutoSign = defaultBool(val.uiLaunchAutoSign, false)
  setting.uiLaunchStart = defaultBool(val.uiLaunchStart, false)
  setting.uiLaunchStartShow = defaultBool(val.uiLaunchStartShow, false)
  setting.uiUpdateProxyEnable = defaultBool(val.uiUpdateProxyEnable, false)
  setting.uiUpdateProxyUrl = defaultString(val.uiUpdateProxyUrl, 'https://mirror.ghproxy.com')

  // 账户设置
  setting.uiEnableOpenApiType = defaultValue(val.uiEnableOpenApiType, ['inline', 'custom'])
  setting.uiOpenApiClientId = defaultString(val.uiOpenApiClientId, '')
  setting.uiOpenApiClientSecret = defaultString(val.uiOpenApiClientSecret, '')

  // 安全设置
  setting.securityEncType = defaultValue(val.securityEncType, ['aesctr', 'rc4md5'])
  setting.securityPassword = defaultString(val.securityPassword, '')
  setting.securityPasswordConfirm = defaultBool(val.securityPasswordConfirm, false)
  setting.securityEncFileName = defaultBool(val.securityEncFileName, true)
  setting.securityEncFileNameHideExt = defaultBool(val.securityEncFileNameHideExt, false)
  setting.securityFileNameAutoDecrypt = defaultBool(val.securityFileNameAutoDecrypt, true)
  setting.securityPreviewAutoDecrypt = defaultBool(val.securityPreviewAutoDecrypt, true)
  setting.securityHideBackupDrive = defaultBool(val.securityHideBackupDrive, false)
  setting.securityHideResourceDrive = defaultBool(val.securityHideResourceDrive, false)
  setting.securityHidePicDrive = defaultBool(val.securityHidePicDrive, false)

  // 在线预览
  setting.uiVideoQuality = defaultValue(val.uiVideoQuality, ['Origin', 'QHD', 'FHD', 'HD', 'SD', 'LD'])
  setting.uiVideoQualityTips = defaultBool(val.uiVideoQualityTips, false)
  setting.uiVideoQualityLastSelect = defaultBool(val.uiVideoQualityLastSelect, true)
  setting.uiVideoPlayer = defaultValue(val.uiVideoPlayer, ['web', 'other'])
  setting.uiVideoEnablePlayerList = defaultBool(val.uiVideoEnablePlayerList, false)
  setting.uiVideoPlayerExit = defaultBool(val.uiVideoPlayerExit, false)
  setting.uiVideoPlayerHistory = defaultBool(val.uiVideoPlayerHistory, false)
  setting.uiVideoPlayerParams = defaultString(val.uiVideoPlayerParams, '')
  setting.uiVideoSubtitleMode = defaultValue(val.uiVideoSubtitleMode, ['close', 'auto', 'select'])
  setting.uiVideoPlayerPath = defaultString(val.uiVideoPlayerPath, '')
  setting.uiAutoPlaycursorVideo = defaultBool(val.uiAutoPlaycursorVideo, true)
  setting.uiAutoColorVideo = defaultBool(val.uiAutoColorVideo, true)

  setting.uiXBTNumber = defaultValue(val.uiXBTNumber, [36, 24, 36, 48, 60, 72])
  setting.uiXBTWidth = defaultValue(val.uiXBTWidth, [960, 720, 960, 1080, 1280])

  // 网盘设置
  setting.uiShowPanPath = defaultBool(val.uiShowPanPath, true)
  setting.uiShowPanMedia = defaultBool(val.uiShowPanMedia, false)
  setting.uiShowPanRootFirst = defaultValue(val.uiShowPanRootFirst, ['all', 'backup', 'resource'])
  setting.uiFolderSize = defaultBool(val.uiFolderSize, true)
  setting.uiFileOrderDuli = defaultString(val.uiFileOrderDuli, 'null')
  setting.uiTimeFolderFormate = defaultString(val.uiTimeFolderFormate, 'yyyy-MM-dd HH-mm-ss').replace('mm-dd', 'MM-dd').replace('HH-MM', 'HH-mm')
  setting.uiTimeFolderIndex = defaultNumber(val.uiTimeFolderIndex, 1)
  setting.uiShareDays = defaultValue(val.uiShareDays, ['always', 'week', 'month'])
  setting.uiSharePassword = defaultValue(val.uiSharePassword, ['random', 'last', 'nopassword'])
  setting.uiShareFormate = defaultString(val.uiShareFormate, 'NAME URL 提取码：PWD')
  setting.uiFileListOrder = defaultValue(val.uiFileListOrder, ['updated_at desc', 'name asc', 'name desc', 'updated_at asc', 'updated_at desc', 'size asc', 'size desc'])
  setting.uiFileListMode = defaultValue(val.uiFileListMode, ['list', 'image', 'bigimage'])
  if (val.uiFileColorArray && val.uiFileColorArray.length >= 6) setting.uiFileColorArray = val.uiFileColorArray

  // 下载文件
  setting.downSavePath = defaultString(val.downSavePath, '')
  setting.downSavePathDefault = defaultBool(val.downSavePathDefault, true)
  setting.downSavePathFull = defaultBool(val.downSavePathFull, true)
  setting.downSaveBreakWeiGui = defaultBool(val.downSaveBreakWeiGui, true)
  setting.downFileMax = defaultValue(val.downFileMax, [5, 1, 2, 3, 4, 5])
  setting.downThreadMax = defaultValue(val.downThreadMax, [4, 1, 2, 4, 8, 16, 24, 32])
  setting.downGlobalSpeed = defaultNumberSub(val.downGlobalSpeed, 0, 0, 999)
  setting.downGlobalSpeedM = defaultValue(val.downGlobalSpeedM, ['MB', 'KB'])

  // 上传文件
  setting.uploadFileMax = defaultValue(val.uploadFileMax, [5, 1, 3, 5, 10, 20, 30, 50])
  setting.uploadGlobalSpeed = defaultNumberSub(val.uploadGlobalSpeed, 0, 0, 999)
  setting.uploadGlobalSpeedM = defaultValue(val.uploadGlobalSpeedM, ['MB', 'KB'])

  // 上传下载综合设置
  setting.downAutoShutDown = 0
  setting.downSaveShowPro = defaultBool(val.downSaveShowPro, true)
  setting.downSmallFileFirst = defaultBool(val.downSmallFileFirst, false)
  setting.downUploadBreakFile = defaultBool(val.downUploadBreakFile, false)
  setting.downUploadWhatExist = defaultValue(val.downUploadWhatExist, ['ignore', 'overwrite', 'auto_rename', 'refuse'])
  setting.downIngoredList = val.downIngoredList && val.downIngoredList.length > 0 ? val.downIngoredList : ['thumbs.db', 'desktop.ini', '.ds_store', '.td', '~', '.downloading']
  setting.downFinishAudio = defaultBool(val.downFinishAudio, true)
  setting.downAutoStart = defaultBool(val.downAutoStart, true)

  // webdav
  setting.webDavEnable = defaultBool(val.webDavEnable, false)
  setting.webDavAutoEnable = defaultBool(val.webDavAutoEnable, false)
  setting.webDavHost = defaultString(val.webDavHost, '127.0.0.1')
  setting.webDavPort = defaultNumber(val.webDavPort, 12000)
  setting.webDavListCache = defaultNumber(val.webDavListCache, 10)
  setting.webDavStrategy = defaultValue(val.webDavStrategy, ['redirect', 'proxy'])

  // 高级选项
  setting.debugDirSize = defaultString(val.debugDirSize, '')
  setting.debugCacheSize = defaultString(val.debugCacheSize, '')
  setting.debugFileListMax = defaultNumberSub(val.debugFileListMax, 3000, 3000, 10000)
  setting.debugFavorListMax = defaultNumberSub(val.debugFavorListMax, 500, 100, 3000)
  setting.debugDowningListMax = 1000
  setting.debugDownedListMax = defaultNumberSub(val.debugDownedListMax, 5000, 1000, 50000)
  setting.debugFolderSizeCacheHour = defaultValue(val.debugFolderSizeCacheHour, [72, 2, 8, 24, 48, 72])
  setting.debugProxyHost = defaultString(val.debugProxyHost, '127.0.0.1')
  setting.debugProxyPort = defaultString(val.debugProxyPort, '6666')
  // 自动填写 分享链接提取码
  setting.yinsiLinkPassword = defaultBool(val.yinsiLinkPassword, false)
  setting.yinsiZipPassword = defaultBool(val.yinsiZipPassword, false)

  // 网络代理
  setting.proxyUseProxy = defaultBool(val.proxyUseProxy, false)
  setting.proxyType = defaultValue(val.proxyType, ['none', 'http', 'https', 'socks5', 'socks5h'])
  setting.proxyHost = defaultString(val.proxyHost, '')
  setting.proxyPort = defaultNumber(val.proxyPort, 0)
  setting.proxyUserName = defaultString(val.proxyUserName, '')
  setting.proxyPassword = defaultString(val.proxyPassword, '')

  // 远程Aria
  setting.ariaSavePath = defaultString(val.ariaSavePath, '')
  if (setting.ariaSavePath.indexOf('/') < 0 && setting.ariaSavePath.indexOf('\\') < 0) setting.ariaSavePath = ''
  setting.ariaUrl = defaultString(val.ariaUrl, '')
  if (setting.ariaUrl.indexOf(':') < 0) setting.ariaUrl = ''
  setting.ariaPwd = defaultString(val.ariaPwd, '')
  setting.ariaHttps = defaultBool(val.ariaHttps, false)
  setting.ariaState = defaultValue(val.ariaState, ['local', 'remote'])
  setting.ariaLoading = false
}

let settingstr = ''


export function LoadSetting() {
  try {
    const settingConfig = getUserDataPath('setting.config')
    if (settingConfig && existsSync(settingConfig)) {
      settingstr = readFileSync(settingConfig, 'utf-8')
      const val = JSON.parse(settingstr)
      _loadSetting(val)
      useAppStore().toggleTheme(setting.uiTheme)
    } else {
      SaveSetting()
    }
  } catch {
    SaveSetting()
  }
  return setting
}

function defaultValue(val: any, check: any[]) {
  if (val && check.includes(val)) return val
  return check[0]
}

function defaultString(val: any, check: string) {
  if (val && typeof val == 'string') return val
  return check
}

function defaultBool(val: any, check: boolean) {
  if (typeof val == 'boolean') return val
  return check
}

function defaultNumber(val: any, check: number) {
  if (typeof val == 'number') return val
  return check
}

function defaultNumberSub(val: any, check: number, min: number, max: number) {
  if (typeof val == 'number') {
    if (val < min) return min
    if (val > max) return max
    return val
  }
  return check
}


function SaveSetting() {
  try {
    const saveStr = JSON.stringify(setting)
    // console.log('SaveSetting', saveStr)
    if (saveStr != settingstr) {
      const settingConfig = getUserDataPath('setting.config')
      writeFileSync(settingConfig, saveStr, 'utf-8')
      settingstr = saveStr
    }
  } catch (err: any) {
    DebugLog.mSaveDanger('SaveSettingToJson', err)
  }
}

const useSettingStore = defineStore('setting', {
  state: (): SettingState => LoadSetting(),
  getters: {
    AriaIsLocal(state: SettingState): boolean {
      return state.ariaState == 'local'
    }
  },
  actions: {
    async updateStore(partial: Partial<SettingState>) {
      if (partial.uiTimeFolderFormate) {
        partial.uiTimeFolderFormate = partial.uiTimeFolderFormate
          .replace('mm-dd', 'MM-dd').replace('HH-MM', 'HH-mm')
      }
      this.$patch(partial)
      if (Object.hasOwn(partial, 'uiLaunchStart')) {
        window.WebToElectron({ cmd: { launchStart: this.uiLaunchStart, launchStartShow: this.uiLaunchStartShow } })
      }
      if (Object.hasOwn(partial, 'uiShowPanMedia')
        || Object.hasOwn(partial, 'uiFolderSize')
        || Object.hasOwn(partial, 'uiFileOrderDuli')) {
        await PanDAL.aReLoadOneDirToShow('', 'refresh', false)
      }
      if (Object.hasOwn(partial, 'proxyUseProxy')) {
        this.WebSetProxy()
      }
      SaveSetting()
      useAppStore().toggleTheme(setting.uiTheme)
      window.MainProxyHost = setting.debugProxyHost
      window.MainProxyPort = setting.debugProxyPort
      window.WinMsgToUpload({ cmd: 'SettingRefresh' })
      window.WinMsgToDownload({ cmd: 'SettingRefresh' })
    },
    updateFileColor(key: string, title: string) {
      if (!key) return
      const arr = setting.uiFileColorArray.concat()
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].key == key) arr[i].title = title
      }
      this.$patch({ uiFileColorArray: arr })
      SaveSetting()
    },
    getProxy() {
      if (!this.proxyType || this.proxyType == 'none') return undefined
      if (!this.proxyHost) return undefined

      if (this.proxyType.startsWith('http')) {
        const auth = this.proxyUserName && this.proxyPassword ? this.proxyUserName + ':' + this.proxyPassword : ''
        return this.proxyType + '://' + (auth ? auth + '@' : '') + this.proxyHost + ':' + this.proxyPort
      }
      return {
        hostname: this.proxyHost,
        port: this.proxyPort,
        protocol: this.proxyType,
        username: this.proxyUserName,
        password: this.proxyPassword
      }
    },
    WebSetProxy() {
      let proxy = ''
      if (this.proxyUseProxy) {
        if (this.proxyType && this.proxyType !== 'none' && this.proxyHost && this.proxyPort) {
          const auth = this.proxyUserName && this.proxyPassword ? this.proxyUserName + ':' + this.proxyPassword : ''
          proxy = this.proxyType + '://' + (auth ? auth + '@' : '') + this.proxyHost + ':' + this.proxyPort
        }
      }
      window.WebSetProxy({ proxyUrl: proxy })
    }
  }
})

export default useSettingStore

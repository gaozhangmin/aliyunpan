import { AppWindow, createMainWindow, createTray } from './core/window'
import { app, ipcMain, session } from 'electron'
import is from 'electron-is'
import fixPath from 'fix-path'
import { release } from 'os'
import { getResourcesPath, getStaticPath } from './utils/mainfile'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { EventEmitter } from 'node:events'
import exception from './core/exception'
import ipcEvent from './core/ipcEvent'

type UserToken = {
  access_token: string;
  open_api_access_token: string;
  user_id: string;
  tokenfrom?: string;
  refresh: boolean
}

const DEFAULT_DOWN_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) aDrive/4.12.0 Chrome/108.0.5359.215 Electron/22.3.24 Safari/537.36'

export default class launch extends EventEmitter {
  private userToken: UserToken = {
    access_token: '',
    open_api_access_token: '',
    user_id: '',
    refresh: false
  }
  private pendingOAuthUrl: string | null = null

  constructor() {
    super()
    this.init()
  }

  init() {
    this.start()
    if (is.mas()) return
    const gotSingleLock = app.requestSingleInstanceLock()
    if (!gotSingleLock) {
      app.exit()
    } else {
      app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (commandLine && commandLine.join(' ').indexOf('exit') >= 0) {
          this.hasExitArgv(commandLine)
          return
        }
        const oauthUrl = this.extractOAuthUrl(commandLine)
        if (oauthUrl) {
          this.dispatchOAuthUrl(oauthUrl)
          return
        }
        if (AppWindow.mainWindow && AppWindow.mainWindow.isDestroyed() == false) {
          if (AppWindow.mainWindow.isMinimized()) {
            AppWindow.mainWindow.restore()
          }
          AppWindow.mainWindow.show()
          AppWindow.mainWindow.focus()
        }
      })
    }
  }

  start() {
    exception.handler()
    this.setInitArgv()
    this.loadUserData()
    this.handleEvents()
    this.handleAppReady()
  }

  setInitArgv() {
    fixPath()
    if (release().startsWith('6.1')) {
      app.disableHardwareAcceleration()
    }
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-web-security')
    app.commandLine.appendSwitch('disable-renderer-backgrounding')
    app.commandLine.appendSwitch('disable-site-isolation-trials')
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,BlockInsecurePrivateNetworkRequests')
    app.commandLine.appendSwitch('ignore-connections-limit', 'bj29-enet.cn-beijing.data.alicloudccp.com,bj29-hz.cn-hangzhou.data.alicloudccp.com,bj29.cn-beijing.data.alicloudccp.com,alicloudccp.com,api.aliyundrive.com,aliyundrive.com,api.alipan.com,alipan.com')
    app.commandLine.appendSwitch('ignore-certificate-errors')
    app.commandLine.appendSwitch('proxy-bypass-list', '*')
    app.commandLine.appendSwitch('no-proxy-server')
    app.commandLine.appendSwitch('wm-window-animations-disabled')
    app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport')
    app.commandLine.appendSwitch('force_high_performance_gpu')

    app.name = 'aliyunxby'
    if (is.windows()) {
      app.setAppUserModelId('com.github.gaozhangmin')
    }
    this.hasExitArgv(process.argv)
  }

  hasExitArgv(args) {
    if (args && args.join(' ').indexOf('exit') >= 0) {
      app.exit()
    }
  }

  loadUserData() {
    const userData = getResourcesPath('userdir.config')
    try {
      if (existsSync(userData)) {
        const configData = readFileSync(userData, 'utf-8')
        if (configData) app.setPath('userData', configData)
      }
    } catch {
    }
  }

  handleEvents() {
    ipcEvent.handleEvents()
    this.handleUserToken()
    this.handleAppActivate()
    this.handleAppWillQuit()
    this.handleAppWindowAllClosed()
    this.handleProtocolCallback()
  }

  handleAppReady() {
    app
      .whenReady()
      .then(() => {
        this.registerProtocol()
        try {
          const localVersion = getResourcesPath('localVersion')
          if (localVersion && existsSync(localVersion)) {
            const version = readFileSync(localVersion, 'utf-8')
            if (app.getVersion() > version) {
              writeFileSync(localVersion, app.getVersion(), 'utf-8')
            }
          } else {
            writeFileSync(localVersion, app.getVersion(), 'utf-8')
          }
        } catch (err) {
        }
        session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
          const shouldGieeReferer = details.url.indexOf('gitee.com') > 0
          const shouldBaidu = /baidu|baidupcs|bdstatic|bcebos/i.test(details.url)
          const should115 = /(^https?:\/\/[^/]*115\.com\/)|(^https?:\/\/[^/]*anxia\.com\/)/i.test(details.url)
          const shouldBiliBili = details.url.indexOf('bilibili.com') > 0
          const shouldQQTv = details.url.indexOf('v.qq.com') > 0 || details.url.indexOf('video.qq.com') > 0
          const shouldAliPanOrigin =   details.url.indexOf('.aliyundrive.com') > 0 || details.url.indexOf('.alipan.com') > 0
          const shouldAliReferer = !shouldQQTv && !shouldBiliBili && !shouldGieeReferer && (!details.referrer || details.referrer.trim() === '' || /(\/localhost:)|(^file:\/\/)|(\/127.0.0.1:)/.exec(details.referrer) !== null)
          const shouldToken = shouldAliPanOrigin && details.url.includes('download')
          const shouldOpenApiToken = details.url.includes('adrive/v1.0') || details.url.includes('adrive/v1.1')

          cb({
            cancel: false,
            requestHeaders: {
              ...details.requestHeaders,
              ...(shouldGieeReferer && {
                Referer: 'https://gitee.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldAliPanOrigin && {
                Origin: 'https://www.aliyundrive.com',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldAliReferer && {
                Referer: 'https://www.aliyundrive.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldBiliBili && {
                Referer: 'https://www.bilibili.com/',
                Cookie: 'buvid_fp=4e5ab1b80f684b94efbf0d2f4721913e;buvid3=0679D9AB-1548-ED1E-B283-E0114517315E63379infoc;buvid4=990C4544-0943-1FBF-F13C-4C42A4EA97AA63379-024020214-83%2BAINcbQP917Ye0PjtrCg%3D%3D;',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldQQTv && {
                Referer: 'https://m.v.qq.com/',
                Origin: 'https://m.v.qq.com',
                'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldBaidu && {
                Referer: 'https://pan.baidu.com/',
                Origin: 'https://pan.baidu.com',
                'user-agent': 'pan.baidu.com'
              }),
              ...(should115 && {
                ...(this.userToken.tokenfrom === '115' && this.userToken.access_token
                  ? { Authorization: `Bearer ${this.userToken.access_token}` }
                  : {}),
                'user-agent': DEFAULT_DOWN_AGENT
              }),
              ...(shouldToken && {
                Authorization: this.userToken.access_token,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              ...(shouldOpenApiToken && {
                Authorization: this.userToken.open_api_access_token,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
              }),
              'X-Canary': 'client=windows,app=adrive,version=v4.12.0',
              'Accept-Language': 'zh-CN,zh;q=0.9'
            }
          })
        })
        session.defaultSession.loadExtension(getStaticPath('crx'), { allowFileAccess: true }).then(() => {
          createMainWindow()
          createTray()
          if (this.pendingOAuthUrl) {
            this.dispatchOAuthUrl(this.pendingOAuthUrl)
            this.pendingOAuthUrl = null
          }
        })
      })
      .catch((err: any) => {
        console.log(err)
      })
  }

  handleUserToken() {
    ipcMain.on('WebUserToken', (event, data) => {
      if (data.login) {
        this.userToken = data
      } else if (this.userToken.user_id == data.user_id) {
        this.userToken = data
        // ShowError('WebUserToken', 'update' + data.name)
      } else {
        // ShowError('WebUserToken', 'nothing' + data.name)
      }
    })
  }

  handleAppActivate() {
    app.on('activate', () => {
      if (!AppWindow.mainWindow || AppWindow.mainWindow.isDestroyed()) createMainWindow()
      else {
        if (AppWindow.mainWindow.isMinimized()) AppWindow.mainWindow.restore()
        AppWindow.mainWindow.show()
        AppWindow.mainWindow.focus()
      }
    })
  }

  handleAppWillQuit() {
    app.on('will-quit', () => {
      try {
        if (AppWindow.appTray) {
          AppWindow.appTray.destroy()
          AppWindow.appTray = undefined
        }
      } catch {

      }
    })
  }

  handleAppWindowAllClosed() {
    app.on('window-all-closed', () => {
      if (is.macOS()) {
        AppWindow.appTray?.destroy()
      } else {
        app.quit() // 未测试应该使用哪一个
      }
    })
  }

  private registerProtocol() {
    const protocol = 'xbyboxplayer-oauth'
    if (is.windows() && process.defaultApp && process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(protocol, process.execPath, [process.argv[1]])
    } else {
      app.setAsDefaultProtocolClient(protocol)
    }
  }

  private handleProtocolCallback() {
    app.on('open-url', (event, url) => {
      event.preventDefault()
      if (url) this.dispatchOAuthUrl(url)
    })
  }

  private extractOAuthUrl(commandLine?: string[]) {
    if (!commandLine) return ''
    const prefix = 'xbyboxplayer-oauth://'
    return commandLine.find(arg => arg.startsWith(prefix)) || ''
  }

  private dispatchOAuthUrl(url: string) {
    if (!url) return
    if (AppWindow.mainWindow && AppWindow.mainWindow.isDestroyed() === false) {
      AppWindow.mainWindow.webContents.send('cloud123-oauth-callback', url)
      AppWindow.mainWindow.show()
      AppWindow.mainWindow.focus()
    } else {
      this.pendingOAuthUrl = url
    }
  }
}

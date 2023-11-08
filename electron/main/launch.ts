import { AppWindow, createMainWindow, createMenu, createTray } from './core/window'
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
  access_token_v2: string;
  user_id: string;
  refresh: boolean
}

export default class launch extends EventEmitter {
  private userToken: UserToken = {
    access_token: '',
    access_token_v2: '',
    user_id: '',
    refresh: false
  }

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
        } else if (AppWindow.mainWindow && AppWindow.mainWindow.isDestroyed() == false) {
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
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure')
    app.commandLine.appendSwitch('ignore-connections-limit', 'bj29.cn-beijing.data.alicloudccp.com,alicloudccp.com,api.aliyundrive.com,aliyundrive.com')
    app.commandLine.appendSwitch('ignore-certificate-errors')
    app.commandLine.appendSwitch('proxy-bypass-list', '<local>')
    app.commandLine.appendSwitch('wm-window-animations-disabled')

    app.name = 'alixby3'
    if (is.windows()) {
      app.setAppUserModelId('gaozhangmin')
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
  }

  handleAppReady() {
    app
      .whenReady()
      .then(() => {
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
          const should115Referer = details.url.indexOf('.115.com') > 0
          const shouldGieeReferer = details.url.indexOf('gitee.com') > 0
          const shouldAliOrigin = details.url.indexOf('.aliyundrive.com') > 0
          const shouldAliReferer = !should115Referer && !shouldGieeReferer && (!details.referrer || details.referrer.trim() === '' || /(\/localhost:)|(^file:\/\/)|(\/127.0.0.1:)/.exec(details.referrer) !== null)
          const shouldToken = details.url.includes('aliyundrive') && details.url.includes('download')
          const shouldOpenApiToken = details.url.includes('adrive/v1.0')

          cb({
            cancel: false,
            requestHeaders: {
              ...details.requestHeaders,
              ...(should115Referer && {
                Referer: 'http://115.com/s/swn4bs33z88',
                Origin: 'http://115.com'
              }),
              ...(shouldGieeReferer && {
                Referer: 'https://gitee.com/'
              }),
              ...(shouldAliOrigin && {
                Origin: 'https://www.aliyundrive.com'
              }),
              ...(shouldAliReferer && {
                Referer: 'https://www.aliyundrive.com/'
              }),
              ...(shouldToken && {
                Authorization: this.userToken.access_token
              }),
              // ...(shouldOpenApiToken && {
              //   Authorization: this.userToken.access_token_v2
              // }),
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) aDrive/4.1.0 Chrome/108.0.5359.215 Electron/22.3.1 Safari/537.36',
              'X-Canary': 'client=windows,app=adrive,version=v4.1.0',
              'Accept-Language': 'zh-CN,zh;q=0.9'
            }
          })
        })
        session.defaultSession.loadExtension(getStaticPath('crx'), { allowFileAccess: true }).then(() => {
          createMainWindow()
          createMenu()
          createTray()
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
      if (!AppWindow.mainWindow || AppWindow.mainWindow.isDestroyed()){
        createMainWindow()
      } else {
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
}
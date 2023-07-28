import { app, BrowserWindow, Menu, MenuItem, MessageChannelMain, nativeTheme, screen, session, Tray } from 'electron'
// @ts-ignore
import { getAsarPath, getResourcesPath, getStaticPath, getUserDataPath } from '../utils/mainfile'
import fs, { existsSync, readFileSync, writeFileSync } from 'fs'
import is from 'electron-is'
import { ShowErrorAndRelaunch } from './dialog'


export const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36 Edg/102.0.1245.33'
export const Referer = 'https://www.aliyundrive.com/'
export const AppWindow: {
  mainWindow: BrowserWindow | undefined
  uploadWindow: BrowserWindow | undefined
  downloadWindow: BrowserWindow | undefined
  appTray: Tray | undefined
  winWidth: number
  winHeight: number
  winTheme: string
} = {
  mainWindow: undefined,
  uploadWindow: undefined,
  downloadWindow: undefined,
  appTray: undefined,
  winWidth: 0,
  winHeight: 0,
  winTheme: ''
}
export const AppMenu: {
  menuEdit: Electron.Menu | undefined
  menuCopy: Electron.Menu | undefined
} = {
  menuEdit: undefined,
  menuCopy: undefined
}

let timerUpload: NodeJS.Timeout | undefined
const debounceUpload = (fn: any, wait: number) => {
  if (timerUpload) {
    clearTimeout(timerUpload)
  }
  timerUpload = setTimeout(() => {
    fn()
    timerUpload = undefined
  }, wait)
}
let timerDownload: NodeJS.Timeout | undefined
const debounceDownload = (fn: any, wait: number) => {
  if (timerDownload) {
    clearTimeout(timerDownload)
  }
  timerDownload = setTimeout(() => {
    fn()
    timerDownload = undefined
  }, wait)
}
let timerResize: NodeJS.Timeout | undefined
const debounceResize = (fn: any, wait: number) => {
  if (timerResize) clearTimeout(timerResize)
  timerResize = setTimeout(() => {
    fn()
    timerResize = undefined
  }, wait)
}
nativeTheme.on('updated', () => {
  if (AppWindow.mainWindow && !AppWindow.mainWindow.isDestroyed())
    AppWindow.mainWindow.webContents.send('setTheme', {
      dark: nativeTheme.shouldUseDarkColors
    })
})

export function createMainWindow() {
  Menu.setApplicationMenu(null)
  try {
    const configJson = getUserDataPath('config.json')
    if (existsSync(configJson)) {
      const configData = JSON.parse(readFileSync(configJson, 'utf-8'))
      AppWindow.winWidth = configData.width
      AppWindow.winHeight = configData.height
    }
  } catch {
  }
  try {
    const themeJson = getUserDataPath('theme.json')
    if (existsSync(themeJson)) {
      const themeData = JSON.parse(readFileSync(themeJson, 'utf-8'))
      AppWindow.winTheme = themeData.theme
    }
  } catch {
  }
  if (AppWindow.winWidth <= 0) {
    try {
      const size = screen.getPrimaryDisplay().workAreaSize
      let width = size.width * 0.677
      const height = size.height * 0.866
      if (width > AppWindow.winWidth) AppWindow.winWidth = width
      if (size.width >= 970 && width < 970) width = 970
      if (AppWindow.winWidth > 1080) AppWindow.winWidth = 1080
      if (height > AppWindow.winHeight) AppWindow.winHeight = height
      if (AppWindow.winHeight > 720) AppWindow.winHeight = 720
    } catch {
      AppWindow.winWidth = 970
      AppWindow.winHeight = 600
    }
  }
  AppWindow.mainWindow = createElectronWindow(AppWindow.winWidth, AppWindow.winHeight, true, 'main', AppWindow.winTheme)

  AppWindow.mainWindow.on('resize', () => {
    debounceResize(function() {
      try {
        if (AppWindow.mainWindow && AppWindow.mainWindow.isMaximized() == false && AppWindow.mainWindow.isMinimized() == false && AppWindow.mainWindow.isFullScreen() == false) {
          const s = AppWindow.mainWindow!.getSize()
          const configJson = getUserDataPath('config.json')
          writeFileSync(configJson, `{"width":${s[0].toString()},"height": ${s[1].toString()}}`, 'utf-8')
        }
      } catch {
      }
    }, 3000)
  })

  AppWindow.mainWindow.on('close', (event) => {
    if (is.macOS()) {
      // donothing
    } else {
      event.preventDefault()
      AppWindow.mainWindow?.hide()
    }
  })

  AppWindow.mainWindow.on('closed', (event: any) => {
    app.quit()
  })

  AppWindow.mainWindow.on('ready-to-show', function() {
    AppWindow.mainWindow!.webContents.send('setPage', { page: 'PageMain' })
    AppWindow.mainWindow!.webContents.send('setTheme', { dark: nativeTheme.shouldUseDarkColors })
    AppWindow.mainWindow!.setTitle('阿里云盘小白羊')
    if (is.windows() && process.argv && process.argv.join(' ').indexOf('--openAsHidden') < 0) {
      AppWindow.mainWindow!.show()
    } else if (is.macOS() && !app.getLoginItemSettings().wasOpenedAsHidden) {
      AppWindow.mainWindow!.show()
    }
    if (is.linux()) {
      AppWindow.mainWindow!.show()
    }
    creatUploadPort()
    creatDownloadPort()
  })

  AppWindow.mainWindow.webContents.on('render-process-gone', function(event, details) {
    if (details.reason == 'crashed' || details.reason == 'oom' || details.reason == 'killed') {
      ShowErrorAndRelaunch('(⊙o⊙)？小白羊遇到错误崩溃了', details.reason)
    }
  })

  createUpload()
  createDownload()
}

export function createMenu() {
  AppMenu.menuEdit = new Menu()
  AppMenu.menuEdit.append(new MenuItem({ label: '剪切', role: 'cut' }))
  AppMenu.menuEdit.append(new MenuItem({ label: '复制', role: 'copy' }))
  AppMenu.menuEdit.append(new MenuItem({ label: '粘贴', role: 'paste' }))
  AppMenu.menuEdit.append(new MenuItem({ label: '删除', role: 'delete' }))
  AppMenu.menuEdit.append(new MenuItem({ label: '全选', role: 'selectAll' }))
  AppMenu.menuCopy = new Menu()
  AppMenu.menuCopy.append(new MenuItem({ label: '复制', role: 'copy' }))
  AppMenu.menuCopy.append(new MenuItem({ label: '全选', role: 'selectAll' }))
}


export function createTray() {
  const trayMenuTemplate = [
    {
      label: '显示主界面',
      click: function () {
        if (AppWindow.mainWindow && AppWindow.mainWindow.isDestroyed() == false) {
          if (AppWindow.mainWindow.isMinimized()) AppWindow.mainWindow.restore()
          AppWindow.mainWindow.show()
          AppWindow.mainWindow.focus()
        } else {
          createMainWindow()
        }
      }
    },
    {
      label: '彻底退出并停止下载',
      click: function () {
        if (AppWindow.mainWindow) {
          AppWindow.mainWindow.destroy()
          AppWindow.mainWindow = undefined
        }
        app.quit()
      }
    }
  ]

  const icon = getStaticPath('icon_256x256.ico')
  AppWindow.appTray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate(trayMenuTemplate)
  AppWindow.appTray.setToolTip('阿里云盘小白羊')
  AppWindow.appTray.setContextMenu(contextMenu)
  AppWindow.appTray.on('click', () => {
    if (AppWindow.mainWindow && AppWindow.mainWindow.isDestroyed() == false) {
      if (AppWindow.mainWindow.isMinimized()) AppWindow.mainWindow.restore()
      AppWindow.mainWindow.show()
      AppWindow.mainWindow.focus()
    } else {
      createMainWindow()
    }
  })
}

export function createElectronWindow(width: number, height: number, center: boolean, page: string, theme: string, devTools: boolean = true) {
  const win = new BrowserWindow({
    show: false,
    width: width,
    height: height,
    minWidth: width > 680 ? 680 : width,
    minHeight: height > 500 ? 500 : height,
    center: center,
    icon: getStaticPath('icon_256x256.ico'),
    useContentSize: true,
    frame: false,
    transparent: false,
    hasShadow: width > 680,
    autoHideMenuBar: true,
    backgroundColor: theme && theme == 'dark' ? '#23232e' : '#ffffff',
    webPreferences: {
      spellcheck: false,
      devTools: true,
      webviewTag: true,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false,
      backgroundThrottling: false,
      enableWebSQL: true,
      disableBlinkFeatures: 'OutOfBlinkCors,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
      preload: getAsarPath('dist/electron/preload/index.js')
    }
  })


  win.removeMenu()
  if (is.dev()) {
    const url = `http://localhost:${process.env.VITE_DEV_SERVER_PORT}`
    win.loadURL(url, { userAgent: ua, httpReferrer: Referer })
  } else {
    win.loadURL('file://' + getAsarPath('dist/' + page + '.html'), {
      userAgent: ua,
      httpReferrer: Referer
    })
  }

  if (is.dev() && devTools) {
    if (width < 100) win.setSize(800, 600)
    win.show()
    win.webContents.openDevTools({ mode: 'bottom' })
  } else {
    win.webContents.on('devtools-opened', () => {
      if (win && win.webContents.getType() === 'webview') {
        win.webContents.closeDevTools()
      }
    })
  }
  win.webContents.on('before-input-event', (_, input: Electron.Input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key === 'F12') {
      win.webContents.isDevToolsOpened()
        ? win.webContents.closeDevTools()
        : win.webContents.openDevTools({ mode: 'undocked' })
    }
  })
  win.webContents.on('did-create-window', (childWindow) => {
    if (is.windows()) {
      childWindow.setMenu(null)
    }
  })
  return win
}

function creatUploadPort() {
  debounceUpload(function () {
    if (AppWindow.mainWindow && AppWindow.uploadWindow && AppWindow.uploadWindow.isDestroyed() == false) {
      const { port1, port2 } = new MessageChannelMain()
      AppWindow.mainWindow.webContents.postMessage('setUploadPort', undefined, [port1])
      AppWindow.uploadWindow.webContents.postMessage('setPort', undefined, [port2])
    }
  }, 1000)
}

function creatDownloadPort() {
  debounceDownload(function() {
    if (AppWindow.mainWindow && AppWindow.downloadWindow && AppWindow.downloadWindow.isDestroyed() == false) {
      const { port1, port2 } = new MessageChannelMain()
      AppWindow.mainWindow.webContents.postMessage('setDownloadPort', undefined, [port1])
      AppWindow.downloadWindow.webContents.postMessage('setPort', undefined, [port2])
    }
  }, 1000)
}


function createUpload() {
  if (AppWindow.uploadWindow && AppWindow.uploadWindow.isDestroyed() == false) return
  AppWindow.uploadWindow = createElectronWindow(10, 10, false, 'main', 'dark', false)

  AppWindow.uploadWindow.on('ready-to-show', function() {
    creatUploadPort()
    AppWindow.uploadWindow!.webContents.send('setPage', { page: 'PageWorker', data: { type: 'upload' } })
    AppWindow.uploadWindow!.setTitle('阿里云盘小白羊上传进程')
  })

  AppWindow.uploadWindow.webContents.on('render-process-gone', function(event, details) {
    if (details.reason == 'crashed' || details.reason == 'oom' || details.reason == 'killed' || details.reason == 'integrity-failure') {
      try {
        AppWindow.uploadWindow?.destroy()
      } catch {
      }
      AppWindow.uploadWindow = undefined
      createUpload()
    }
  })
  AppWindow.uploadWindow.hide()
}

function createDownload() {
  if (AppWindow.downloadWindow && AppWindow.downloadWindow.isDestroyed() == false) return
  AppWindow.downloadWindow = createElectronWindow(10, 10, false, 'main', 'dark', false)

  AppWindow.downloadWindow.on('ready-to-show', function() {
    creatDownloadPort()
    AppWindow.downloadWindow!.webContents.send('setPage', { page: 'PageWorker', data: { type: 'download' } })
    AppWindow.downloadWindow!.setTitle('阿里云盘小白羊下载进程')
  })

  AppWindow.downloadWindow.webContents.on('render-process-gone', function(event, details) {
    if (details.reason == 'crashed' || details.reason == 'oom' || details.reason == 'killed' || details.reason == 'integrity-failure') {
      try {
        AppWindow.downloadWindow?.destroy()
      } catch {
      }
      AppWindow.downloadWindow = undefined
      createDownload()
    }
  })

  AppWindow.downloadWindow.webContents.closeDevTools()
  AppWindow.downloadWindow.hide()
}
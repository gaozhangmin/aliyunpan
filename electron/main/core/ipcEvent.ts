import { AppWindow, createElectronWindow, Referer, ua } from './window'
import path from 'path'
import is from 'electron-is'
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import { existsSync, writeFileSync } from 'fs'
import { exec, execFile, spawn, SpawnOptions } from 'child_process'
import { ShowError } from './dialog'
// @ts-ignore
import {getResourcesPath, getStaticPath, getUserDataPath} from '../utils/mainfile'
import { portIsOccupied } from '../utils'

export default class ipcEvent {
  private constructor() {
  }

  static handleEvents() {
    this.handleWebToElectron()
    this.handleWebToElectronCB()
    this.handleWebShowOpenDialogSync()
    this.handleWebShowSaveDialogSync()
    this.handleWebShowItemInFolder()
    this.handleWebPlatformSync()
    this.handleWebSpawnSync()
    this.handleWebExecSync()
    this.handleWebSaveTheme()
    this.handleWebClearCookies()
    this.handleWebGetCookies()
    this.handleWebSetCookies()
    this.handleWebClearCache()
    this.handleWebReload()
    this.handleWebRelaunch()
    this.handleWebRelaunchAria()
    this.handleWebRelaunchAlist()
    this.handleWebResetAlistPwd()
    this.handleWebSetProgressBar()
    this.handleWebShutDown()
    this.handleWebSetProxy()
    this.handleWebOpenWindow()
    this.handleWebOpenUrl()
  }

  private static handleWebToElectron() {
    ipcMain.on('WebToElectron', async (event, data) => {
      let mainWindow = AppWindow.mainWindow
      if (data.cmd && data.cmd === 'close') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
      } else if (data.cmd && data.cmd === 'exit') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
          mainWindow = undefined
        }
        try {
          app.exit()
        } catch {
        }
      } else if (data.cmd && data.cmd === 'minsize') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
      } else if (data.cmd && data.cmd === 'maxsize') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
          } else {
            mainWindow.maximize()
          }
        }
      } else if (data.cmd && (Object.hasOwn(data.cmd, 'launchStart')
        || Object.hasOwn(data.cmd, 'launchStartShow'))) {
        const launchStart = data.cmd.launchStart
        const launchStartShow = data.cmd.launchStartShow
        const appName = path.basename(process.execPath)
        // 设置开机自启
        const settings: Electron.Settings = {
          openAtLogin: launchStart,
          path: process.execPath
        }
        // 显示主窗口
        if (is.macOS()) {
          settings.openAsHidden = !launchStartShow
        } else {
          settings.args = [
            '--processStart', `${appName}`,
            '--process-start-args', `"--hidden"`
          ]
          !launchStartShow && settings.args.push('--openAsHidden')
        }
        app.setLoginItemSettings(settings)
      } else {
        event.sender.send('ElectronToWeb', 'mainsenddata')
      }
    })
  }

  private static handleWebToElectronCB() {
    ipcMain.on('WebToElectronCB', (event, data) => {
      const mainWindow = AppWindow.mainWindow
      if (data.cmd && data.cmd === 'maxsize') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
            event.returnValue = 'unmaximize'
          } else {
            mainWindow.maximize()
            event.returnValue = 'maximize'
          }
        }
      } else {
        event.returnValue = 'backdata'
      }
    })
  }

  private static handleWebShowOpenDialogSync() {
    ipcMain.on('WebShowOpenDialogSync', (event, config) => {
      dialog.showOpenDialog(AppWindow.mainWindow!, config).then((result) => {
        event.returnValue = result.filePaths
      })
    })
  }

  private static handleWebShowSaveDialogSync() {
    ipcMain.on('WebShowSaveDialogSync', (event, config) => {
      dialog.showSaveDialog(AppWindow.mainWindow!, config).then((result) => {
        event.returnValue = result.filePath || ''
      })
    })
  }

  private static handleWebShowItemInFolder() {
    ipcMain.on('WebShowItemInFolder', (event, fullPath) => {
      for (let i = 0; i < 5; i++) {
        if (existsSync(fullPath)) break
        if (fullPath.lastIndexOf(path.sep) > 0) {
          fullPath = fullPath.substring(0, fullPath.lastIndexOf(path.sep))
        } else return
      }
      if (fullPath.length > 2) shell.showItemInFolder(fullPath)
    })
  }

  private static handleWebPlatformSync() {
    ipcMain.on('WebPlatformSync', (event) => {
      const asarPath = app.getAppPath()
      const appPath = app.getPath('userData')
      event.returnValue = {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        execPath: process.execPath,
        appPath: appPath,
        asarPath: asarPath,
        argv0: process.argv0
      }
    })
  }

  private static handleWebSpawnSync() {
    ipcMain.on('WebSpawnSync', (event, data) => {
      try {
        const options: SpawnOptions = {
          shell: true,
          stdio: 'ignore',
          windowsVerbatimArguments: true,
          ...data.options
        }
        const argsToStr = (args: string) => is.windows() ? `"${args}"` : `'${args}'`
        if ((is.windows() || is.macOS()) && !existsSync(data.command)) {
          event.returnValue = { error: '找不到文件' + data.command }
          ShowError('找不到文件', data.command)
        } else {
          let command
          if (is.macOS()) {
            command = `open -a ${argsToStr(data.command)} ${data.command.includes('mpv.app') ? '--args ' : ''}`
          } else {
            command = `${argsToStr(data.command)}`
          }
          const subProcess = spawn(command, data.args, options)
          const isRunning = process.kill(subProcess.pid, 0)
          subProcess.unref()
          event.returnValue = {
            pid: subProcess.pid,
            isRunning: isRunning,
            execCmd: data,
            options: options,
            exitCode: subProcess.exitCode
          }
        }
      } catch (err: any) {
        event.returnValue = { error: err }
      }
    })
  }

  private static handleWebExecSync() {
    ipcMain.on('WebExecSync', (event, data) => {
      try {
        const cmdArguments = []
        cmdArguments.push(data.command)
        if (data.args) cmdArguments.push(...data.args)
        const finalCmd = cmdArguments.join(' ')
        exec(finalCmd, (err: any) => {
          event.returnValue = err
        })
        event.returnValue = ''
      } catch (err: any) {
        event.returnValue = { error: err }
      }
    })
  }

  private static handleWebSaveTheme() {
    ipcMain.on('WebSaveTheme', (event, data) => {
      try {
        const themeJson = getUserDataPath('theme.json')
        writeFileSync(themeJson, `{"theme":"${data.theme || ''}"}`, 'utf-8')
      } catch {
      }
    })
  }

  private static handleWebClearCookies() {
    ipcMain.on('WebClearCookies', (event, data) => {
      session.defaultSession.clearStorageData(data)
    })
  }

  private static handleWebGetCookies() {
    ipcMain.handle('WebGetCookies', async (event, data) => {
      return await session.defaultSession.cookies.get(data)
    })
  }

  private static handleWebSetCookies() {
    ipcMain.on('WebSetCookies', (event, data) => {
      for (let i = 0, maxi = data.length; i < maxi; i++) {
        const cookie = {
          url: data[i].url,
          name: data[i].name,
          value: data[i].value,
          domain: '.' + data[i].url.substring(data[i].url.lastIndexOf('/') + 1),
          secure: data[i].url.indexOf('https://') == 0,
          expirationDate: data[i].expirationDate
        }
        session.defaultSession.cookies.set(cookie).catch((err: any) => console.error(err))
      }
    })
  }

  private static handleWebClearCache() {
    ipcMain.on('WebClearCache', (event, data) => {
      if (data.cache) {
        session.defaultSession.clearCache()
        session.defaultSession.clearAuthCache()
      } else {
        session.defaultSession.clearStorageData(data)
      }
    })
  }

  private static handleWebReload() {
    ipcMain.on('WebReload', (event, data) => {
      if (AppWindow.mainWindow && !AppWindow.mainWindow.isDestroyed()) AppWindow.mainWindow.reload()
    })
  }

  private static handleWebRelaunch() {
    ipcMain.on('WebRelaunch', (event, data) => {
      app.relaunch()
      try {
        app.exit()
      } catch {
      }
    })
  }

  private static handleWebRelaunchAria() {
    ipcMain.handle('WebRelaunchAria', async (event, data) => {
      try {
        const enginePath: string = getStaticPath('engine')
        const confPath: string = path.join(enginePath, 'aria2.conf')
        const ariaPath: string = is.windows() ? 'aria2c.exe' : 'aria2c'
        const basePath: string = path.join(enginePath, is.dev() ? path.join(process.platform, process.arch) : '')
        const ariaFilePath: string = path.join(basePath, ariaPath)
        if (!existsSync(ariaFilePath)) {
          ShowError('找不到Aria程序文件', ariaFilePath)
          return 0
        }
        const argsToStr = (args: any) => is.windows() ? `"${args}"` : `'${args}'`
        const listenPort = await portIsOccupied(16800)
        const options: SpawnOptions = {
          shell: true,
          stdio: is.dev() ? 'pipe' : 'ignore',
          windowsHide: false,
          windowsVerbatimArguments: true
        }
        const args = [
          `--stop-with-process=${argsToStr(process.pid)}`,
          `--conf-path=${argsToStr(confPath)}`,
          `--rpc-listen-port=${argsToStr(listenPort)}`,
          '-D'
        ]
        spawn(`${argsToStr(ariaFilePath)}`, args, options)
        return listenPort
      } catch (e: any) {
        console.log(e)
      }
      return 0
    })
  }
  private static handleWebRelaunchAlist() {
    ipcMain.handle('WebRelaunchAlist', async (event, data) => {
      try {
        const enginePath: string = getStaticPath('engine')
        const alistPath = is.windows() ? 'alist.exe' : 'alist'
        const basePath: string = path.join(enginePath, is.dev() ? path.join(process.platform, process.arch) : '')
        const alistFilePath: string = path.join(basePath, alistPath)
        const alistDataPath = getUserDataPath('alist-data')
        if (!existsSync(alistFilePath)) {
          ShowError('找不到alist程序文件', alistFilePath)
          return 0
        }
        const argsToStr = (args: any) => is.windows() ? `"${args}"` : `'${args}'`

        const alistArgs = [
          'server',
          '--data ' + `${argsToStr(alistDataPath)}`
        ]
        const options = {
          shell: true,
          windowsVerbatimArguments: true
        }
        console.log(`${argsToStr(alistFilePath + ' server')}`)
        execFile(`${argsToStr(alistFilePath)}`, alistArgs, options,
          async (error, stdout, stderr) => {
          if (error) {
            console.log(`启动AList失败 : ${error}`)
            return 0
          }
        })
        return 0
      } catch (e: any) {
        console.log(e)
      }
      return 0
    })
  }

  private static handleWebResetAlistPwd() {
    ipcMain.handle('WebResetAlistPwd', async (event, data) => {
      try {
        const enginePath: string = getStaticPath('engine')
        const alistPath = is.windows() ? 'alist.exe' : 'alist'
        const basePath: string = path.join(enginePath, is.dev() ? path.join(process.platform, process.arch) : '')
        const alistFilePath: string = path.join(basePath, alistPath)
        const alistDataPath = getUserDataPath('alist-data')
        if (!existsSync(alistFilePath)) {
          ShowError('找不到alist程序文件', alistFilePath)
          return 0
        }

        const argsToStr = (args: any) => is.windows() ? `"${args}"` : `'${args}'`
        const password = data.cmd

        const alistArgs = [
          'admin set ' + `${argsToStr(password)}`,
          '--data ' + `${argsToStr(alistDataPath)}`
        ]
        console.log(`修改AList密码 : `, password)
        const options = {
          shell: true,
          windowsVerbatimArguments: true
        }
        execFile(`${argsToStr(alistFilePath)}`, alistArgs, options,
          async (error, stdout, stderr) => {
            if (error) {
              console.log(`修改AList密码失败 : ${error}`)
            } else {
              console.log(`修改AList密码成功 : ${stdout}`)
            }
          })
      } catch (e: any) {
        console.log(e)
      }
    })
  }

  private static handleWebSetProgressBar() {
    ipcMain.on('WebSetProgressBar', (event, data) => {
      if (AppWindow.mainWindow && !AppWindow.mainWindow.isDestroyed()) {
        if (data.pro) {

          AppWindow.mainWindow.setProgressBar(data.pro, { mode: data.mode || 'normal' })
        } else AppWindow.mainWindow.setProgressBar(-1)
      }
    })
  }

  private static handleWebShutDown() {
    ipcMain.on('WebShutDown', (event, data) => {
      if (is.macOS()) {
        const shutdownCmd = 'osascript -e \'tell application "System Events" to shut down\''
        exec(shutdownCmd, (err: any) => {
          if (data.quitApp) {
            try {
              app.exit()
            } catch {
            }
          }
          if (err) {
            // donothing
          }
        })
      } else {
        const cmdArguments = ['shutdown']
        if (is.linux()) {
          if (data.sudo) {
            cmdArguments.unshift('sudo')
          }
          cmdArguments.push('-h')
          cmdArguments.push('now')
        }
        if (is.windows()) {
          cmdArguments.push('-s')
          cmdArguments.push('-f')
          cmdArguments.push('-t 0')
        }

        const finalcmd = cmdArguments.join(' ')

        exec(finalcmd, (err: any) => {
          if (data.quitApp) {
            try {
              app.exit()
            } catch {
            }
          }
          if (err) {
            // donothing
          }
        })
      }
    })
  }

  private static handleWebSetProxy() {
    ipcMain.on('WebSetProxy', (event, data) => {
      // if (data.proxyUrl) app.commandLine.appendSwitch('proxy-server', data.proxyUrl)
      // else app.commandLine.removeSwitch('proxy-server')
      console.log(JSON.stringify(data))
      if (data.proxyUrl) {
        session.defaultSession.setProxy({ proxyRules: data.proxyUrl })
      } else {
        session.defaultSession.setProxy({})
      }
    })
  }

  private static handleWebOpenWindow() {
    ipcMain.on('WebOpenWindow', (event, data) => {
      const win = createElectronWindow(AppWindow.winWidth, AppWindow.winHeight, true, 'main2', data.theme)
      win.on('ready-to-show', function() {
        win.webContents.send('setPage', data)
        win.setTitle('预览窗口')
        win.show()
      })
    })
  }

  private static handleWebOpenUrl() {
    ipcMain.on('WebOpenUrl', (event, data) => {
      const win = new BrowserWindow({
        show: false,
        width: AppWindow.winWidth,
        height: AppWindow.winHeight,
        center: true,
        minWidth: 680,
        minHeight: 500,
        icon: getStaticPath('icon_256x256.ico'),
        useContentSize: true,
        frame: true,
        hasShadow: true,
        autoHideMenuBar: true,
        backgroundColor: data.theme && data.theme == 'dark' ? '#23232e' : '#ffffff',
        webPreferences: {
          spellcheck: false,
          devTools: is.dev(),
          sandbox: false,
          webSecurity: false,
          allowRunningInsecureContent: true,
          backgroundThrottling: false,
          enableWebSQL: false,
          disableBlinkFeatures: 'OutOfBlinkCors,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure'
        }
      })

      win.on('ready-to-show', function() {
        win.setTitle('预览窗口')
        win.show()
      })

      win.loadURL(data.PageUrl, {
        userAgent: ua,
        httpReferrer: Referer
      })
    })
  }
}

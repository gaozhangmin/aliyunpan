import { AppWindow, createElectronWindow, Referer, ua } from './window'
import path from 'path'
import is from 'electron-is'
import { app, BrowserWindow, dialog, ipcMain, Menu, powerSaveBlocker, session, shell } from 'electron'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { exec, execFile, spawn, SpawnOptions } from 'child_process'
import os from 'os'
import { ShowError } from './dialog'
import { getStaticPath, getUserDataPath } from '../utils/mainfile'
import { portIsOccupied } from '../utils'
import { registerDownloadHandlers } from '../download/ipcHandlers'
import { registerMediaImageCacheIpc } from '../mediaImageCache'
import { createHash } from 'crypto'

let psbId: any

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function pathToFileUrl(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, '/')
  return 'file://' + (normalized.startsWith('/') ? normalized : '/' + normalized)
}

function findSoffice(): string {
  const candidates = [
    process.env.LIBREOFFICE_PATH || '',
    process.env.SOFFICE_PATH || '',
    is.macOS() ? '/Applications/LibreOffice.app/Contents/MacOS/soffice' : '',
    is.windows() ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' : '',
    is.windows() ? 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe' : '',
    '/usr/bin/libreoffice',
    '/usr/local/bin/libreoffice',
    '/opt/homebrew/bin/libreoffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
    '/opt/homebrew/bin/soffice'
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  const names = is.windows() ? ['soffice.exe', 'libreoffice.exe'] : ['soffice', 'libreoffice']
  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  for (const dir of pathDirs) {
    for (const name of names) {
      const candidate = path.join(dir, name)
      if (existsSync(candidate)) return candidate
    }
  }
  return ''
}

function convertOfficeFileToPdf(soffice: string, inputPath: string, outDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const userInstall = path.join(outDir, 'lo-profile').replace(/\\/g, '/')
    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      `-env:UserInstallation=file://${userInstall}`,
      '--convert-to',
      'pdf',
      '--outdir',
      outDir,
      inputPath
    ]
    execFile(soffice, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || stdout || err.message || '').trim() || 'LibreOffice 转换失败'))
      } else {
        resolve()
      }
    })
  })
}

export default class ipcEvent {
  private constructor() {
  }

  static handleEvents() {
    this.handleWebToElectron()
    this.handleWebToElectronCB()
    this.handleShowContextMenu()
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
    this.handleWebSetProgressBar()
    this.handleWebShutDown()
    this.handleWebSetProxy()
    this.handleOfficePreviewConvertToPdf()
    this.handleWebOpenWindow()
    this.handleWebOpenUrl()
    this.handleExportCliTokens()
    this.handleInstallCli()
    if (app.isPackaged) {
      this.installCli(true).catch((err: any) => {
        console.warn('Auto install BoxPlayer CLI failed', err?.message || err)
      })
    }
    registerDownloadHandlers()
    registerMediaImageCacheIpc()
  }

  private static handleWebToElectron() {
    ipcMain.on('WebToElectron', async (event, data) => {
      let mainWindow = AppWindow.mainWindow
      if (data.cmd && data.cmd === 'close') {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
      } else if (data.cmd && data.cmd === 'relaunch') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
          mainWindow = undefined
        }
        try {
          app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })
          app.exit(0)
        } catch {
        }
      } else if (data.cmd && data.cmd === 'exit') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
          mainWindow = undefined
        }
        try {
          app.exit(0)
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
      } else if (data.cmd && data.cmd === 'preventSleep') {
        if (data.flag) {
          if (psbId && powerSaveBlocker.isStarted(psbId)) {
            return
          }
          psbId = powerSaveBlocker.start('prevent-app-suspension')
        } else {
          if (typeof psbId === 'undefined' || !powerSaveBlocker.isStarted(psbId)) {
            return
          }
          powerSaveBlocker.stop(psbId)
          psbId = undefined
        }
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

  private static handleShowContextMenu() {
    ipcMain.on('show-context-menu', (event, params) => {
      const { showCut, showCopy, showPaste } = params
      const window = BrowserWindow.fromWebContents(event.sender)
      // 制作右键菜单
      let template: Array<Electron.MenuItemConstructorOptions> = [
        // 设置选项是否可见
        { role: 'selectAll', label: '全选' },
        { role: 'copy', label: '复制', visible: showCopy },
        { role: 'cut', label: '剪切', visible: showCut },
        { role: 'paste', label: '粘贴', visible: showPaste },
        { role: 'undo', label: '撤销' }
      ]
      // 显示菜单
      const contextMenu = Menu.buildFromTemplate(template)
      contextMenu.popup({ window })
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
          subProcess.unref()
          event.returnValue = {
            pid: subProcess.pid,
            subProcess: subProcess,
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
        const fileAllocation = is.macOS() ? 'none' : (is.windows() ? 'falloc' : 'trunc')
        const args = [
          `--stop-with-process=${argsToStr(process.pid)}`,
          `--conf-path=${argsToStr(confPath)}`,
          `--file-allocation=${argsToStr(fileAllocation)}`,
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

  private static handleOfficePreviewConvertToPdf() {
    ipcMain.handle('OfficePreview:convertToPdf', async (_event, data: { sourceUrl?: string; fileName?: string }) => {
      try {
        const sourceUrl = data?.sourceUrl || ''
        const fileName = path.basename(data?.fileName || 'document')
        if (!sourceUrl) return { ok: false, error: '文档预览地址为空' }
        const soffice = findSoffice()
        if (!soffice) {
          return {
            ok: false,
            error: '未找到 LibreOffice。请安装 LibreOffice 后重试，或继续使用网盘自带预览。'
          }
        }

        const hash = createHash('sha1').update(sourceUrl + fileName).digest('hex')
        const previewRoot = path.join(app.getPath('userData'), 'office-preview')
        const workDir = path.join(previewRoot, hash)
        mkdirSync(workDir, { recursive: true })
        const ext = path.extname(fileName) || '.office'
        const inputPath = path.join(workDir, `source${ext}`)
        const outputPath = path.join(workDir, 'source.pdf')
        if (!existsSync(outputPath)) {
          const response = await fetch(sourceUrl)
          if (!response.ok) return { ok: false, error: `文档下载失败：${response.status}` }
          const arrayBuffer = await response.arrayBuffer()
          writeFileSync(inputPath, Buffer.from(arrayBuffer))
          await convertOfficeFileToPdf(soffice, inputPath, workDir)
        }
        if (!existsSync(outputPath)) return { ok: false, error: 'LibreOffice 未生成 PDF 文件' }
        return { ok: true, pdfUrl: pathToFileUrl(outputPath) }
      } catch (err: any) {
        return { ok: false, error: err?.message || '文档转换 PDF 失败' }
      }
    })
  }

  private static handleWebOpenWindow() {
    let winWidth = AppWindow.winWidth
    if (winWidth < 1080) winWidth = 1080
    ipcMain.on('WebOpenWindow', (event, data) => {
      const win = createElectronWindow(winWidth, AppWindow.winHeight, true, 'main2', data.theme)
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

  private static handleExportCliTokens() {
    ipcMain.handle('ExportCliTokens', async (_event, data: { accounts: any[] }) => {
      try {
        const cliDir = path.join(os.homedir(), '.clouddrive-cli')
        const tokensPath = path.join(cliDir, 'tokens.json')
        const configPath = path.join(cliDir, 'config.json')
        mkdirSync(cliDir, { recursive: true })

        let existing: { accounts: any[] } = { accounts: [] }
        try {
          const raw = require('fs').readFileSync(tokensPath, 'utf8')
          existing = JSON.parse(raw)
          if (!Array.isArray(existing.accounts)) existing.accounts = []
        } catch {
          existing = { accounts: [] }
        }

        existing.accounts = Array.isArray(data.accounts) ? data.accounts : []

        let config: { defaults: Record<string, string> } = { defaults: {} }
        try {
          const raw = readFileSync(configPath, 'utf8')
          config = JSON.parse(raw)
          if (!config.defaults || typeof config.defaults !== 'object') config.defaults = {}
        } catch {
          config = { defaults: {} }
        }

        const accountKeys = new Set(existing.accounts.map((account) => `${account.provider}/${account.accountId}`))
        for (const [provider, accountId] of Object.entries(config.defaults)) {
          if (!accountKeys.has(`${provider}/${accountId}`)) delete config.defaults[provider]
        }
        for (const account of existing.accounts) {
          if (account.provider && account.accountId && !config.defaults[account.provider]) {
            config.defaults[account.provider] = account.accountId
          }
        }

        writeFileSync(tokensPath, JSON.stringify(existing, null, 2) + '\n', { mode: 0o600 })
        writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
        return { ok: true, exported: (data.accounts || []).length, path: tokensPath }
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Export failed' }
      }
    })
  }

  private static handleInstallCli() {
    ipcMain.handle('InstallCli', async () => {
      return this.installCli(false)
    })
  }

  private static async installCli(silent: boolean) {
      try {
        const cliSrcDir = is.dev()
          ? path.join(app.getAppPath(), 'scripts')
          : path.join(process.resourcesPath, 'cli')
        const nodeExe = (() => {
          const p = process.execPath.toLowerCase()
          if (p.endsWith('electron') || p.endsWith('electron.exe') || p.includes('electron.app')) return null
          return process.execPath
        })()

        if (is.macOS() || is.linux()) {
          const homeDir = os.homedir()
          const installDir = path.join(homeDir, '.local', 'bin')
          mkdirSync(installDir, { recursive: true })

          for (const name of ['clouddrive-cli', 'clouddrive-mcp']) {
            const scriptFile = path.join(cliSrcDir, `${name}.mjs`)
            if (!existsSync(scriptFile)) {
              return { ok: false, error: `CLI script not found: ${scriptFile}` }
            }
            const linkPath = path.join(installDir, name)
            const wrapper = `#!/bin/sh\nexec node ${shellQuote(scriptFile)} "$@"\n`
            writeFileSync(linkPath, wrapper, { mode: 0o755 })
            try { chmodSync(linkPath, 0o755) } catch { /* ignore */ }
          }

          // 将 ~/.local/bin 写入 shell 配置（如尚未添加）
          const pathLine = `\n# BoxPlayer CLI\nexport PATH="$HOME/.local/bin:$PATH"\n`
          const profiles = ['.zshrc', '.bashrc', '.bash_profile'].map((f) => path.join(homeDir, f))
          let updatedProfile = ''
          for (const p of profiles) {
            try {
              if (existsSync(p)) {
                const content = readFileSync(p, 'utf8')
                if (!content.includes('.local/bin')) {
                  writeFileSync(p, content + pathLine)
                  updatedProfile = path.basename(p)
                  break
                } else {
                  updatedProfile = path.basename(p)
                  break
                }
              }
            } catch { /* ignore */ }
          }

          const hint = updatedProfile
            ? `重启终端（或运行 source ~/.${updatedProfile}）后执行：`
            : `请确保 ~/.local/bin 已加入 PATH，然后执行：`

          return {
            ok: true,
            auto: silent,
            message: `已安装到 ${installDir}\n${hint} clouddrive-cli auth list`,
            paths: [
              path.join(installDir, 'clouddrive-cli'),
              path.join(installDir, 'clouddrive-mcp'),
            ],
          }
        }

        if (is.windows()) {
          const installDir = path.join(os.homedir(), 'AppData', 'Local', 'BoxPlayer', 'bin')
          mkdirSync(installDir, { recursive: true })

          for (const name of ['clouddrive-cli', 'clouddrive-mcp']) {
            const scriptFile = path.join(cliSrcDir, `${name}.mjs`)
            if (!existsSync(scriptFile)) {
              return { ok: false, error: `CLI script not found: ${scriptFile}` }
            }
            const nodeCmd = nodeExe ? nodeExe : 'node'
            const batContent = `@echo off\n"${nodeCmd}" "${scriptFile}" %*\n`
            writeFileSync(path.join(installDir, `${name}.cmd`), batContent)
          }

          const pathKey = 'HKCU\\Environment'
          const currentPath = process.env.PATH || ''
          if (!currentPath.includes(installDir)) {
            const { execSync } = await import('child_process')
            try {
              execSync(`setx PATH "${currentPath};${installDir}"`)
            } catch {
            }
          }

          return {
            ok: true,
            auto: silent,
            message: `已安装到 ${installDir}\n重启终端后运行: clouddrive-cli auth list`,
            paths: [
              path.join(installDir, 'clouddrive-cli.cmd'),
              path.join(installDir, 'clouddrive-mcp.cmd'),
            ],
            note: '如命令不可用，请手动将该目录加入系统 PATH',
          }
        }

        return { ok: false, error: 'Unsupported platform' }
      } catch (e: any) {
        if (e?.code === 'EACCES' || e?.code === 'EPERM') {
          return {
            ok: false,
            error: '权限不足，无法写入命令行安装目录。\n请在设置页手动安装，或确认 ~/.local/bin / %LOCALAPPDATA% 可写。',
            needsElevation: true,
          }
        }
        return { ok: false, error: e?.message || 'Install failed' }
      }
  }
}

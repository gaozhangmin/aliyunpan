import Electron, { ipcRenderer } from 'electron'
import Notification from 'electron-notification'

window.Electron = Electron
process.noAsar = true
window.platform = process.platform

window.WebToElectron = function (data: any) {
  try {
    ipcRenderer.send('WebToElectron', data)
  } catch {}
}

window.WebToElectronCB = function (data: any, callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebToElectronCB', data)
    callback(backData) 
  } catch {}
}

ipcRenderer.on('ElectronToWeb', function (event, arg) {
  
})
ipcRenderer.on('MainSendToken', function (event, arg) {
  try {
    window.postMessage(arg)
  } catch {}
})

// 监听有更新可用的事件
ipcRenderer.on('update-available', () => {
  // 弹出通知框或显示更新提示给用户
  // 例如使用 electron-notification 模块
  const notification = new Notification({
    title: '检测到新版本',
    body: '新的更新可用，请前往"https://github.com/gaozhangmin/aliyunpan_private/releases"' +
        ' 或微信公众号"小白羊网盘"自行下载安装更新',
    // onClick: () => {
    //   // 用户点击通知框时，开始下载更新
    //   autoUpdater.downloadUpdate();
    // }
  });

  notification.show();
});

window.WebSpawnSync = function (data: any, callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebSpawnSync', data) 
    callback(backData) 
  } catch {}
}
window.WebExecSync = function (data: any, callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebExecSync', data) 
    callback(backData) 
  } catch {}
}
window.WebShowOpenDialogSync = function (config: any, callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebShowOpenDialogSync', config)
    callback(backData) 
  } catch {}
}

window.WebShowSaveDialogSync = function (config: any, callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebShowSaveDialogSync', config)
    callback(backData) 
  } catch {}
}
window.WebShowItemInFolder = function (fullPath: string) {
  try {
    ipcRenderer.send('WebShowItemInFolder', fullPath)
  } catch {}
}

window.WebPlatformSync = function (callback: any) {
  try {
    const backData = ipcRenderer.sendSync('WebPlatformSync')
    callback(backData) 
  } catch {}
}

window.WebClearCookies = function (data: any) {
  try {
    ipcRenderer.send('WebClearCookies', data)
  } catch {}
}
window.WebClearCache = function (data: any) {
  try {
    ipcRenderer.send('WebClearCache', data)
  } catch {}
}
window.WebUserToken = function (data: any) {
  try {
    ipcRenderer.send('WebUserToken', data)
  } catch {}
}
window.WebSaveTheme = function (data: any) {
  try {
    ipcRenderer.send('WebSaveTheme', data)
  } catch {}
}

window.WebReload = function (data: any) {
  try {
    ipcRenderer.send('WebReload', data)
  } catch {}
}
window.WebRelaunch = function (data: any) {
  try {
    ipcRenderer.send('WebRelaunch', data)
  } catch {}
}
window.WebRelaunchAria = async function() {
  try {
    return await ipcRenderer.invoke('WebRelaunchAria')
  } catch {
    return 0
  }
}
window.WebSetProgressBar = function (data: any) {
  try {
    ipcRenderer.send('WebSetProgressBar', data) 
  } catch {}
}
window.WebSetCookies = function (cookies: any) {
  try {
    ipcRenderer.send('WebSetCookies', cookies) 
  } catch {}
}

window.WebOpenWindow = function (data: any) {
  try {
    ipcRenderer.send('WebOpenWindow', data)
  } catch {}
}
window.WebOpenUrl = function (data: any) {
  try {
    ipcRenderer.send('WebOpenUrl', data)
  } catch {}
}
window.WebShutDown = function (data: any) {
  try {
    ipcRenderer.send('WebShutDown', data) 
  } catch {}
}
window.WebSetProxy = function (data: { proxyUrl: string }) {
  try {
    ipcRenderer.send('WebSetProxy', data)
  } catch {}
}

window.AutoLanuchAtStartup = function (data: { launchAtStartup: string }) {
  try {
    ipcRenderer.send('AutoLanuchAtStartup', data)
  } catch {}
}

function createRightMenu() {
  window.addEventListener(
    'contextmenu',
    (e) => {
      try {
        if (e) e.preventDefault()
        if (isEleEditable(e.target)) {
          ipcRenderer.send('WebToElectron', { cmd: 'menuedit' })
        } else {
          
          const selectText = window.getSelection()?.toString()
          if (selectText) ipcRenderer.send('WebToElectron', { cmd: 'menucopy' })
        }
      } catch {}
    },
    false
  )
}

function isEleEditable(e: any): boolean {
  if (!e) {
    return false
  }
  
  if ((e.tagName === 'INPUT' && e.type !== 'checkbox') || e.tagName === 'TEXTAREA' || e.contentEditable == 'true') {
    return true
  } else {
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return isEleEditable(e.parentNode)
  }
}

createRightMenu()

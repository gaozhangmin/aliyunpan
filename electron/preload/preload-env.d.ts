/* eslint-disable no-unused-vars */
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production'
    DIST: string
    VITE_PUBLIC: string
    readonly VITE_DEV_SERVER_HOST: string
    readonly VITE_DEV_SERVER_PORT: string
  }
}
declare interface Window {
  Electron: any
  platform: any
  WinMsg: any
  WebToElectron: any
  WebToWindow: any
  WebToElectronCB: any
  WebSpawnSync: any
  WebExecSync: any
  WebShowOpenDialogSync: any
  WebShowSaveDialogSync: any
  WebShowItemInFolder: any
  WebPlatformSync: any
  WebClearCookies: any
  WebClearCache: any
  WebUserToken: any
  WebSaveTheme: any
  WebReload: any
  WebRelaunch: any
  WebRelaunchAria: () => Promise<number>
  WebRelaunchAlist: () => Promise<number>
  WebSetProgressBar: any
  WebResetAlistPwd:any
  WebGetCookies: any
  WebSetCookies: any
  WebOpenWindow: any
  WebOpenUrl: any
  WebShutDown: any
  WebSetProxy: any
}

export {}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    Go: any
    require: any
    Electron: any
    openDatabase: any
    WebRelaunchAria: () => Promise<number>
    platform: string
    WinMsg: any
    postdataFunc: any
    Prism: any
    WebUserToken: any
    WebToElectron: any
    WebToWindow: any
    WebClearCache: any
    WebRelaunch: any
    WebGetCookies: any
    WebSetCookies: any
    WebClearCookies: any
    WebShutDown: any
    WebOpenWindow: any
    WebOpenUrl: any
    WebShowOpenDialogSync: any
    WebExecSync: any
    WebSpawnSync: any
    WebPlatformSync: any
    UploadPort: any
    DownloadPort: any
    MainPort: any
    MainProxyServer: any
    MainProxyHost: any
    MainProxyPort: any
    WinMsgToUpload: any
    WinMsgToDownload: any
    WinMsgToMain: any
    IsMainPage: boolean
    WebSetProxy: any
    speedLimte: number
    WebSetProgressBar: any
  }
}

import { app } from 'electron'
import path  from 'path'
import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'fs'
const DEBUGGING = !app.isPackaged

let NewCopyed = false
let NewSaved = false

export function getAsarPath(fileName: string) {
  if (DEBUGGING) {
    const basePath = path.resolve(app.getAppPath())
    return path.join(basePath, fileName)
  } else {
    const basePath = path.resolve(app.getAppPath())
    const baseNew = path.join(basePath, '..', 'app.new')
    const baseSave = path.join(basePath, '..', 'app.asar')
    if (NewCopyed == false) {
      // 热更新asar
      if (existsSync(baseNew)) {
        try {
          console.log('copyFileSync', baseNew, '-->', baseSave)
          copyFileSync(baseNew, baseSave)
          rmSync(baseNew, { force: true })
          NewCopyed = true
        } catch (err: any) {
          console.log(err)
        }
      }
    }
    if (NewSaved == false) NewSaved = existsSync(baseSave)
    if (NewSaved) return path.join(baseSave, fileName)
    return path.join(basePath, fileName)
  }
}

export function getResourcesPath(fileName: string) {
  let basePath =  path.resolve(app.getAppPath(), '..')
  if (DEBUGGING) basePath = path.resolve(app.getAppPath(), '.')
  if (fileName == 'app.ico' && process.platform !== 'win32') {
    fileName = 'app.png'
  }
  return path.join(basePath, fileName)
}

export function getStaticPath(fileName: string) {
  if (fileName == 'app.ico' && process.platform !== 'win32') {
      fileName = 'app.png'
  }
  let basePath = ''
  if (DEBUGGING) {
    basePath = path.resolve(app.getAppPath(), './static')
  } else {
    basePath = path.resolve(app.getAppPath(), '..')
  }
  return path.join(basePath, fileName)
}

export function getCrxPath() {
    let basePath = getStaticPath('crx')
    try {
      if (!existsSync(basePath)) mkdirSync(basePath)
    } catch {}
    try {
      const manifest = path.join(basePath, 'manifest.json')
      if (!existsSync(manifest)) writeFileSync(manifest, crxmanifest, 'utf-8')
    } catch {}
    try {
      const devtoolshtml = path.join(basePath, 'devtools.html')
      if (!existsSync(devtoolshtml)) writeFileSync(devtoolshtml, crxdevtoolshtml, 'utf-8')
    } catch {}
    try {
      const devtoolsjs = path.join(basePath, 'devtools.js')
      if (!existsSync(devtoolsjs)) writeFileSync(devtoolsjs, crxdevtoolsjs, 'utf-8')
    } catch {}
    return basePath
}

export function getUserDataPath(fileName: string) {
  return path.join(app.getPath('userData'), fileName)
}

export function mkAriaConf(filePath: string) {
  try {
    if (!existsSync(filePath)) writeFileSync(filePath, ariaconf, 'utf-8')
  } catch {}
}

const crxmanifest = `{"manifest_version": 3,"name": "demo","version": "1.0.0","description": "demo","devtools_page": "devtools.html","host_permissions": ["http://*/*", "https://*/*"]}`

const crxdevtoolshtml = `<!DOCTYPE html><html><head></head><body><script type="text/javascript" src="devtools.js"></script></body></html>`

const crxdevtoolsjs = `chrome.devtools.network.onRequestFinished.addListener(function (detail) {
  let url = detail.request.url;

  let isbreak = false;
  if (url.indexOf("api.aliyundrive.com") > 0) isbreak = true; 
  if (url.indexOf("img.aliyundrive.com") > 0) isbreak = true; 
  if (url.indexOf("_tmd_") > 0) isbreak = true; 
  if (url.indexOf(".aliyuncs.com") > 0) isbreak = true; 
  if (url.indexOf(".aliyun.com") > 0) isbreak = true; 
  if (url.indexOf(".taobao.com") > 0) isbreak = true; 
  if (url.indexOf(".mmstat.com") > 0) isbreak = true; 

  if (url.indexOf(".aliyundrive.com") < 0) isbreak = true; 
  if (isbreak) return;

  detail.getContent(function (content, mimeType) {
    try {
      if (typeof content == "string" && content.indexOf('"bizExt"') > 0) {
        let bizExt = "";
        try {
          const data = JSON.parse(content);
          bizExt = data.content?.data?.bizExt || "";
        } catch (e) {
          bizExt = "";
          chrome.devtools.inspectedWindow.eval(
            "console.log('" + JSON.stringify({ url, e, content }) + "')"
          );
        }

        if (!bizExt) {
          try {
            let temp = content.substring(
              content.indexOf('"bizExt"') + '"bizExt"'.length
            );
            temp = temp.substring(temp.indexOf('"') + 1); 
            temp = temp.substring(0, temp.indexOf('"')); 

            if (temp.startsWith("eyJ")) bizExt = temp;
          } catch (e) {
            bizExt = "";
            chrome.devtools.inspectedWindow.eval(
              "console.log('" + JSON.stringify({ url, e, content }) + "')"
            );
          }
        }

        if (bizExt) {
          chrome.devtools.inspectedWindow.eval(
            "console.log('" + JSON.stringify({ bizExt: bizExt }) + "')"
          );
        }
      }
    } catch {}
  });
});


 `

const ariaconf = `# debug, info, notice, warn or error
 log-level=error
 file-allocation=trunc
 user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36
 max-concurrent-downloads=64
 max-connection-per-server=16
 enable-rpc=true
 rpc-allow-origin-all=true
 rpc-listen-all=false
 rpc-secret=S4znWTaZYQi3cpRNb
 rpc-secure=false
 pause-metadata=true
 http-no-cache=true
 disk-cache=32M
 continue=true
 allow-overwrite=true
 auto-file-renaming=false
 max-download-result=1000
 no-netrc=true
 reuse-uri=true
 quiet=true
 disable-ipv6=false
 check-certificate=false
 save-session=
 save-session-interval=0
 follow-metalink=false
 follow-torrent=false
 enable-dht=false
 enable-dht6=false
 bt-enable-lpd=false
 enable-peer-exchange=false
 bt-request-peer-speed-limit=1
 dht-file-path=
 dht-file-path6=
 seed-time=0
 force-save=false
 bt-save-metadata=false
 `

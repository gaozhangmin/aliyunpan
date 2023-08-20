import { B64decode, b64decode, humanSize } from '../utils/format'
import { getPkgVersion } from '../utils/utils'
import axios, { AxiosResponse } from 'axios'
import message from '../utils/message'
import { IShareSiteModel, useServerStore } from '../store'
import { Modal, Button, Space } from '@arco-design/web-vue'
import { h } from 'vue'
import { getAppNewPath, getResourcesPath, getUserDataPath, openExternal } from '../utils/electronhelper'
import ShareDAL from '../share/share/ShareDAL'
import DebugLog from '../utils/debuglog'
import { writeFile, rmSync, existsSync, readFileSync } from 'fs'
import { execFile, SpawnOptions } from 'child_process'
import path from 'path'

const { shell } = require('electron')

export interface IServerRespData {
  state: string
  msg: string

  [k: string]: any
}

export default class ServerHttp {
  static baseApi = b64decode('aHR0cDovLzEyMS41LjE0NC44NDo1MjgyLw==')

  static async PostToServer(postData: any): Promise<IServerRespData> {
    postData.appVersion = getPkgVersion()
    const str = JSON.stringify(postData)
    if (window.postdataFunc) {
      let enstr = ''
      try {
        enstr = window.postdataFunc(str)
        console.log(enstr)
      } catch {
        return { state: 'error', msg: '联网失败' }
      }
      return ServerHttp.Post(enstr).catch(() => {
        return { state: 'error', msg: '网络错误' }
      })
    } else {
      return { state: 'error', msg: '程序错误' }
    }
  }

  static async Post(postData: any, isfirst = true): Promise<IServerRespData> {
    const url = ServerHttp.baseApi + 'xby2'
    return axios
      .post(url, postData, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {}
      })
      .then((response: AxiosResponse) => {
        if (response.status != 200) return { state: 'error', msg: '网络错误' }
        const buff = response.data as ArrayBuffer
        const uint8array = new Uint8Array(buff)
        for (let i = 0, maxi = uint8array.byteLength; i < maxi; i++) {
          uint8array[i] ^= 9 + (i % 200)
        }
        const str = new TextDecoder().decode(uint8array)
        return JSON.parse(str) as IServerRespData
      })
      .catch(() => {
        return { state: 'error', msg: '网络错误' }
      })
      .then((resp) => {
        if (resp.state == 'error' && resp.msg == '网络错误' && isfirst) {
          return ServerHttp.Sleep(2000).then(() => {
            return ServerHttp.Post(postData, false)
          })
        } else return resp
      })
  }

  static Sleep(msTime: number) {
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            success: true,
            time: msTime
          }),
        msTime
      )
    )
  }

  static configUrl = b64decode('aHR0cHM6Ly9naXRlZS5jb20vemhhbm5hby9yZXNvdXJjZS9yYXcvbWFzdGVyL2ltYWdlcy9zaGFyZV9jb25maWcuanNvbg==')
  static updateUrl = b64decode('aHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9nYW96aGFuZ21pbi9hbGl5dW5wYW4vcmVsZWFzZXMvbGF0ZXN0')

  static async CheckConfigUpgrade(): Promise<void> {
    axios
      .get(ServerHttp.configUrl, {
        withCredentials: false,
        responseType: 'json',
        timeout: 30000
      })
      .then(async (response: AxiosResponse) => {
        const content = B64decode(response.data.content)
        const config = JSON.parse(content)
        if (config.SIP) {
          ServerHttp.baseApi = B64decode(config.SIP)
        }
        if (config.SSList) {
          const list: IShareSiteModel[] = []
          for (let i = 0, maxi = config.SSList.length; i < maxi; i++) {
            const item = config.SSList[i]
            const add = { title: item.title, url: item.url, tip: item.tip }
            if (add.url.length > 0) list.push(add)
          }
          ShareDAL.SaveShareSite(list)
        }
        if (config.HELP) {
          useServerStore().mSaveHelpUrl(response.data.HELP)
        }
      })
  }

  static compareVersions(version1: string, version2: string): number {
    // Split version strings into arrays of numbers
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    // Pad the shorter version with zeros to make their lengths equal
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    v1Parts.push(...Array(maxLength - v1Parts.length).fill(0));
    v2Parts.push(...Array(maxLength - v2Parts.length).fill(0));

    // Compare each part of the version numbers
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] > v2Parts[i]) {
        return 1;
      } else if (v1Parts[i] < v2Parts[i]) {
        return -1;
      }
    }

    // Version numbers are equal
    return 0;
  }

  static async CheckUpgrade(showMessage: boolean = true): Promise<void> {
    axios
      .get(ServerHttp.updateUrl, {
        withCredentials: false,
        responseType: 'json',
        timeout: 30000
      })
      .then(async (response: AxiosResponse) => {
        console.log('CheckUpgrade', response)
        if (!response.data || !response.data.assets || !response.data.html_url) {
          showMessage && message.error('获取新版本出错')
          return
        }
        let platform = process.platform
        let tagName = response.data.tag_name  // 版本号
        let assets = response.data.assets     // 文件
        let html_url = response.data.html_url // 详情
        let asarFileUrl = ''
        let updateData = { name: '', url: '', size: 0 }
        for (let asset of assets) {
          const fileData = {
            name: asset.name,
            url: asset.browser_download_url,
            size: asset.size
          }
          if (platform === 'win32'
            && fileData.name.indexOf(process.arch) > 0
            && fileData.name.endsWith('.exe')) {
            updateData = fileData
            break
          } else if (platform === 'darwin'
            && fileData.name.indexOf(process.arch) > 0
            && fileData.name.endsWith('.dmg')) {
            updateData = fileData
            break
          } else if (fileData.name.endsWith('.asar')) {
            asarFileUrl = 'https://ghproxy.com/' + fileData.url
            break
          }
        }
        if (tagName) {
          let configVer = getPkgVersion().replaceAll('v', '').trim()
          if (process.platform !== 'linux') {
            let localVersion = getResourcesPath('localVersion')
            if (localVersion && existsSync(localVersion)) {
              configVer = readFileSync(localVersion, 'utf-8').replaceAll('v', '').trim()
            }
          }
          const remoteVer = tagName.replaceAll('v', '').trim()
          const verInfo = this.dealText(response.data.body as string)
          let verUrl = ''
          if (updateData.url) {
            verUrl = 'https://ghproxy.com/' + updateData.url
          }
          if (this.compareVersions(remoteVer, configVer) > 0) {
            Modal.confirm({
              mask: true,
              alignCenter: true,
              title: () => h('div', {
                innerHTML: `有新版本<span class='vertip'>${tagName}</span>`,
                class: { vermodalhead: true },
                style: { maxWidth: '540px' }
              }),
              content: () => h('div', {
                innerHTML: ' <div style="display: flex; justify-content: center; align-items: center;">\n' +
                  '                          <img src="./images/qrcode_258.jpg" alt="公众号">\n' +
                  '                      </div>\n' +
                  '                      <p style="text-indent: 40px; color: red;">Github需要代理，如果下载失败，请关注公众号从网盘下载</p>' + verInfo,
                class: { vermodal: true }
              }),
              onClose: () => {
                if (updateData.name) {
                  let resourcesPath = getResourcesPath(updateData.name)
                  if (existsSync(resourcesPath)) {
                    rmSync(resourcesPath, { force: true })
                  }
                }
                return true
              },
              footer: () => h(Space, {}, () => [
                h(Button, {
                  innerHTML: '取消',
                  onClick: async () => {
                    if (updateData.name) {
                      let resourcesPath = getResourcesPath(updateData.name)
                      if (existsSync(resourcesPath)) {
                        rmSync(resourcesPath, { force: true })
                      }
                    }
                    try {
                      // @ts-ignore
                      document.querySelector('.arco-overlay-modal').remove()
                    } catch (err) {
                    }
                    return true
                  }
                }),
                h(Button, {
                  type: 'outline',
                  style: asarFileUrl.length == 0 ? '' : 'display: none',
                  innerHTML: platform !== 'linux' && verUrl.length > 0 ? '全量更新' : '详情',
                  onClick: async () => {
                    if (verUrl.length > 0 && platform !== 'linux') {
                      // 下载安装
                      const msgKey = 'download_' + Date.now().toString()
                      await this.AutoDownload(verUrl, html_url, updateData.name, false, msgKey)
                    } else {
                      openExternal(html_url)
                    }
                    return true
                  }
                }),
                h(Button, {
                  type: 'primary',
                  style: asarFileUrl.length > 0 && platform !== 'linux' ? '' : 'display: none',
                  innerHTML: '热更新',
                  onClick: async () => {
                    if (asarFileUrl.length > 0 && platform !== 'linux') {
                      // 下载安装
                      const msgKey = 'download_' + Date.now().toString()
                      const flag = await this.AutoDownload(asarFileUrl, html_url, updateData.name, true, msgKey)
                      // 更新本地版本号
                      if (flag && tagName) {
                        const localVersion = getResourcesPath('localVersion')
                        if (localVersion) {
                          writeFile(localVersion, tagName, async (err)=> {
                            if (err) {
                              return false
                            } else {
                              message.info('热更新完毕，自动重启应用中...', 0, msgKey)
                              await this.Sleep(2000)
                              window.WebRelaunch()
                              return true
                            }
                          })
                        }
                      }
                    }
                    return false
                  }
                })
              ])
            })
          } else if (showMessage ) {
            message.info('已经是最新版 ', 6)
          }
        }
      })
      .catch((err: any) => {
        showMessage && message.info('检查更新失败，请检查网络是否正常')
        DebugLog.mSaveDanger('CheckUpgrade', err)
      })
  }

  static dealText(context: string): string {
    let splitTextArr = context.trim().split(/\r\n/g)
    let resultTextArr: string[] = []
    splitTextArr.forEach((item, i) => {
      let links = item.match(/!?\[.+?\]\(https?:\/\/.+\)/g)
      // 处理链接
      if (links != null) {
        for (let index = 0; index < links.length; index++) {
          const text_link = links[index].match(/[^!\[\(\]\)]+/g)//提取文字和链接
          if (text_link) {
            if (links[index][0] == '!') { //解析图片
              item = item.replace(links[index], '<img src="' + text_link[1] + '" loading="lazy" alt="' + text_link[0] + '" />')
            } else { //解析超链接
              item = item.replace(links[index], `<i>【${text_link[0]}】</i>`)
            }
          }
        }
      }
      if (item.indexOf('- ')) { // 无序列表
        item = item.replace(/.*-\s+(.*)/g, '<strong>$1</strong>')
      }
      if (item.indexOf('* ')) { // 无序列表
        item = item.replace(/.*\*\s+(.*)/g, '<strong>$1</strong>')
      }
      if (item.includes('**')) {
        item = item.replaceAll(/\*\*/g, '')
      }
      if (item.startsWith('# ')) { // 1 级标题（h1）
        resultTextArr.push(`<h1>${item.replace('# ', '')}</h1>`)
      } else if (item.startsWith('## ')) { // 2 级标题（h2）
        resultTextArr.push(`<h2>${item.replace('## ', '')}</h2>`)
      } else if (item.startsWith('### ')) { // 3 级标题（h3）
        resultTextArr.push(`<h3>${item.replace('### ', '')}</h3>`)
      } else if (item.indexOf('---') == 0) {
        resultTextArr.push(item.replace('---', '<hr>'))
      } else { // 普通的段落
        resultTextArr.push(`${item}`)
      }
    })
    return resultTextArr.join('<br>')
  }

  static async AutoDownload(appNewUrl: string, html_url: string, file_name: string, hot: boolean, msgKey: string): Promise<boolean> {
    const resourcesPath = hot ? getAppNewPath() : getUserDataPath(file_name)
    if (!hot && existsSync(resourcesPath)) {
      await this.autoInstallNewVersion(resourcesPath, msgKey)
      return true
    }
    message.loading('新版本正在后台下载中，请耐心等待。。。', 0, msgKey)
    return axios
      .get(appNewUrl, {
        withCredentials: false,
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0'
        }
      })
      .then(async (response: AxiosResponse) => {
        writeFile(resourcesPath, Buffer.from(response.data), (err) => {
          if(err) {
            message.error('下载更新失败，请检查【Resources文件夹】是否有写入权限',5, msgKey)
            return false
          }
        })
        if (!hot) {
          await this.Sleep(2000)
          await this.autoInstallNewVersion(resourcesPath, msgKey)
        }
        return true
      })
      .catch(() => {
        message.error('新版本下载失败，关注公众号从网盘下载', 5)
        rmSync(resourcesPath, { force: true })
        openExternal(html_url)
        return false
      })
  }

  static async autoInstallNewVersion(resourcesPath: string, msgKey: string) {
    // 自动安装
    const options: SpawnOptions = { shell: true, windowsVerbatimArguments: true }
    if (process.platform === 'win32') {
      execFile('\"' + resourcesPath + '\"', options, error => {
        if(error) {
          message.info('安装失败，请前往文件夹手动安装', 5, msgKey)
          const resources = getResourcesPath('')
          shell.openPath(path.join(resources, '/'))
        } else {
          message.info('安装成功，请重新打开', 5, msgKey)
          window.WebToElectron({ cmd: 'exit' })
        }
      })
    } else if (process.platform === 'darwin') {
      execFile('open ' + '\"' + resourcesPath + '\"', options, error => {
        if(error) {
          message.info('安装失败，请前往文件夹手动安装', 5, msgKey)
          const resources = getResourcesPath('')
          shell.openPath(path.join(resources, '/'))
        } else {
          message.info('请手动移动到应用程序目录，完成安装', 5, msgKey)
          window.WebToElectron({ cmd: 'exit' })
        }
      })
    }
  }
}






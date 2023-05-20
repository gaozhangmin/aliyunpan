import { B64decode, b64decode, humanSize } from '../utils/format'
import axios, { AxiosProgressEvent, AxiosResponse } from 'axios'
import Config from '../utils/config'
import message from '../utils/message'
import { IShareSiteModel, useServerStore } from '../store'
import { Modal } from '@arco-design/web-vue'
import { h } from 'vue'
import { getResourcesPath, openExternal } from '../utils/electronhelper'
import ShareDAL from '../share/share/ShareDAL'
import DebugLog from '../utils/debuglog'
import { writeFileSync, rmSync, existsSync } from 'fs'
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
    postData.appVersion = Config.appVersion
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

  static configUrl = b64decode('aHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9nYW96aGFuZ21pbi9zdGF0aWNSZXNvdXJjZS9jb250ZW50cy9pbWFnZXMvc2hhcmVfY29uZmlnLmpzb24=')
  static updateUrl = b64decode('aHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9nYW96aGFuZ21pbi9hbGl5dW5wYW4vcmVsZWFzZXMvbGF0ZXN0')
  static showVer = false

  static async CheckConfigUpgrade(): Promise<void> {
    axios
      .get(ServerHttp.configUrl, {
        withCredentials: false,
        responseType: 'json',
        timeout: 30000
      })
      .then(async (response: AxiosResponse) => {
        const content = B64decode(response.data.content)
        const contentJson = JSON.parse(content);
        console.log('CheckConfigUpgrade', contentJson)
        if (contentJson.SIP) {
          const SIP = B64decode(contentJson.SIP)
          if (SIP.length > 0) ServerHttp.baseApi = SIP
        }
        if (contentJson.SSList) {
          const list: IShareSiteModel[] = []
          for (let i = 0, maxi = contentJson.SSList.length; i < maxi; i++) {
            const item = contentJson.SSList[i]
            const add = { title: item.title, url: item.url, tip: item.tip }
            if (add.url.length > 0) list.push(add)
          }
          ShareDAL.SaveShareSite(list)
        }
        if (contentJson.HELP) {
          useServerStore().mSaveHelpUrl(contentJson.HELP)
        }
      })
  }

  static async CheckUpgrade(): Promise<void> {
    axios
      .get(ServerHttp.updateUrl, {
        withCredentials: false,
        responseType: 'json',
        timeout: 30000
      })
      .then(async (response: AxiosResponse) => {
        console.log('CheckUpgrade', response)
        if (!response.data || !response.data.assets || !response.data.html_url) {
          message.error('获取新版本出错')
          return
        }
        let tagName = response.data.tag_name
        let assets = response.data.assets
        let html_url = response.data.html_url
        let updateData = { name: '', url: '', size: 0 }
        for (let asset of assets) {
          const fileData = { name: asset.name, url: asset.browser_download_url, size: asset.size }
          if (process.platform === 'win32' && fileData.name.indexOf('Setup') > 0) {
            updateData = fileData
            break
          } else if (process.platform === 'darwin'
            && fileData.name.indexOf(process.arch) > 0
            && fileData.name.indexOf('dmg') > 0) {
            updateData = fileData
            break
          }
        }
        if (tagName) {
          const localVer = Config.appVersion.replaceAll('v', '').replaceAll('.', '').trim()
          const remoteVer = tagName.replaceAll('v', '').replaceAll('.', '').trim()
          const fileSize = humanSize(updateData.size)
          const verInfo = this.dealText(response.data.body as string)
          const verUrl = 'https://ghproxy.com/' + updateData.url || ''

          const v1Int = parseInt(localVer), v2Int = parseInt(remoteVer)
          if (v2Int > v1Int) {
            if (!ServerHttp.showVer) {
              ServerHttp.showVer = true
              Modal.confirm({
                okText: process.platform !== 'linux' ? '更新' : '详情',
                cancelText: '取消',
                title: () => h('div', {
                  innerHTML: `检测到新版本<span class="vertip">${tagName}${process.platform !== 'linux' ? '【' + fileSize + '】' : ''}</span>`,
                  class: { vermodalhead: true },
                  style: { maxWidth: '540px' }
                }),
                mask: true,
                maskClosable: false,
                escToClose: false,
                alignCenter: true,
                simple: true,
                onOk: async () => {
                  if (verUrl.length > 0 && process.platform !== 'linux') {
                    // 下载安装
                    await this.AutoDownload(verUrl, updateData.name)
                    return
                  } else {
                    // 打开详情
                    openExternal(html_url)
                  }
                },
                onCancel: async ()=> {
                  if (updateData.name) {
                    let resourcesPath = getResourcesPath(updateData.name)
                    if (existsSync(resourcesPath)) {
                      rmSync(resourcesPath, { force: true })
                      return true
                    }
                  }
                },
                onClose: () => ServerHttp.showVer = false,
                content: () => h('div', {
                  innerHTML: ' <div style="display: flex; justify-content: center; align-items: center;">\n' +
                    '                          <img src="/images/qrcode_258.jpg" alt="公众号">\n' +
                    '                      </div>\n' +
                    '                      <p style="text-indent: 40px; color: red;">Github需要代理，如果下载失败，请关注公众号从网盘下载</p>' + verInfo,
                  class: { vermodal: true }
                })
              })
            }
          } else if (v2Int == v1Int) {
            message.info('已经是最新版 ' + tagName, 6)
          } else if (v2Int < v1Int) {
            message.info('您的本地版本 ' + Config.appVersion + ' 已高于服务器版本 ' + tagName, 6)
          }
        }
      })
      .catch((err: any) => {
        DebugLog.mSaveDanger('CheckUpgrade', err)
      })
  }

  static dealText(context: string): string {
    let splitTextArr = context.trim().split(/\r\n/g)
    let resultTextArr: string[] = []
    splitTextArr.forEach((item, i) => {
      if (item != '') {
        console.log("item", item)
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
      }

    })
    return resultTextArr.join('<br>')
  }

  static async AutoDownload(appNewUrl: string, file_name: string): Promise<boolean> {
    let resourcesPath = getResourcesPath(file_name)
    if (existsSync(resourcesPath)) {
      this.autoInstallNewVersion(resourcesPath)
      return true
    }
    message.info('新版本正在后台下载中，请耐心等待。。。。',  10)
    return axios
      .get(appNewUrl, {
        withCredentials: false,
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0'
        },
      })
      .then((response: AxiosResponse) => {
        writeFileSync(resourcesPath, Buffer.from(response.data))
        this.Sleep(2000)
        message.info('新版本下载成功, 正在安装',  10)
        this.autoInstallNewVersion(resourcesPath)
        return true
      })
      .catch(() => {
        message.error('新版本下载失败，请前往Github下载最新版本', 6)
        rmSync(resourcesPath, { force: true })
        return false
      })
  }

  static autoInstallNewVersion(resourcesPath: string) {
    // 自动安装
    const options: SpawnOptions = { shell: true, windowsVerbatimArguments: true }
    if (process.platform === 'win32') {
      console.log("resourcesPath", resourcesPath)
      execFile('\"' + resourcesPath + '\"' + ' /S', options, error => {
        if(error) {
          message.info('安装失败，请前往文件夹手动安装', 5)
          const resources = getResourcesPath('')
          shell.openPath(path.join(resources, '/'))
        } else {
          message.info('安装成功，请重新打开', 5)
        }
      })
    } else if (process.platform === 'darwin') {
      execFile('open ' + '\"' + resourcesPath + '\"', options, error => {
        if(error) {
          message.info('安装失败，请前往文件夹手动安装', 5)
          const resources = getResourcesPath('')
          shell.openPath(path.join(resources, '/'))
        } else {
          message.info('请手动移动到应用程序目录，完成安装', 5)
        }
      })
    } else if (process.platform === 'linux') {
      const resources = getResourcesPath('')
      message.info('Linux不支持自动安装，请文件夹手动安装: ' + resources, 5)
      shell.openPath(path.join(resources, '/'))
    }

  }
}
import { useSettingStore } from '../store'
import Db from './db'
import http, { Agent as HttpAgent, IncomingMessage, Server, ServerResponse } from 'http'
import https, { Agent as HttpsAgent } from 'https'
import AliFile from '../aliapi/file'
import os from 'os'
import { GetExpiresTime } from './utils'
import DebugLog from './debuglog'
import { message } from 'ant-design-vue'

// 默认maxFreeSockets=256
const httpsAgent = new HttpsAgent({ keepAlive: true })
const httpAgent = new HttpAgent({ keepAlive: true })

export interface IRawUrl {
  drive_id: string
  file_id: string
  url: string
  size: number
  qualities: {
    html: string
    quality: string
    height: number
    width: number
    label: string
    value: string
    url: string
  }[]
  subtitles: {
    language: string
    url: string
  }[]
}

interface FileInfo {
  user_id: string
  drive_id?: string
  file_id?: string
  file_size?: number
  encType?: string

  [key: string]: string | number | undefined
}

export function getIPAddress() {
  let ipv4 = ''
  const interfaces = os.networkInterfaces()
  for (const dev in interfaces) {
    let device = interfaces[dev]
    if (device) {
      device.forEach((details, alias) => {
        if (dev.includes('以太网') || dev == 'WLAN') {
          if (details.family == 'IPv4' && !details.internal
            && details.address.startsWith('192.168')) {
            ipv4 = details.address
            return
          }
        }
      })
    }
  }
  // console.log(ipv4)
  return ipv4 || '127.0.0.1'
}

export function getProxyUrl(info: FileInfo) {
  let { debugProxyHost, debugProxyPort } = useSettingStore()
  let proxyUrl = `http://${debugProxyHost}:${debugProxyPort}/proxy`
  let params = Object.keys(info).filter(v => info[v])
    .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(info[key]!!)}`)
  return `${proxyUrl}?${params.join('&')}`
}

export function getRedirectUrl(info: FileInfo) {
  let { debugProxyHost, debugProxyPort } = useSettingStore()
  let redirectUrl = `http://${debugProxyHost}:${debugProxyPort}/redirect`
  let params = Object.keys(info).filter(v => info[v])
    .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(info[key]!!)}`)
  return `${redirectUrl}?${params.join('&')}`
}

export async function getRawUrl(
  user_id: string,
  drive_id: string,
  file_id: string,
  weifa: boolean = false,
  preview_type: string = '',
  quality: string = ''
): Promise<string | IRawUrl> {
  let data: any = {
    drive_id: drive_id,
    file_id: file_id,
    url: '',
    size: 0,
    qualities: [],
    subtitles: []
  }
  let { uiVideoQuality, uiVideoPlayer, securityPreviewAutoDecrypt } = useSettingStore()
  // 违规视频也使用转码播放
  if (preview_type) {
    if (weifa || preview_type === 'video' || (preview_type === 'other' && quality != 'Origin')) {
      let previewData = await AliFile.ApiVideoPreviewUrlOpenApi(user_id, drive_id, file_id)
      if (typeof previewData != 'string') {
        Object.assign(data, previewData)
        if (quality && quality != 'Origin') {
          data.url = data.qualities.find((q: any) => q.quality === quality)?.url || data.qualities[0].url
        }
      }
    } else if (preview_type === 'audio') {
      let audioData = await AliFile.ApiAudioPreviewUrl(user_id, drive_id, file_id)
      if (typeof audioData != 'string') {
        data.url = audioData.url
      }
    }
  }
  // 违规文件无法获取地址
  if ((!weifa && !data.url) || uiVideoPlayer == 'web') {
    let downUrl = await AliFile.ApiFileDownloadUrl(user_id, drive_id, file_id, 14400)
    if (typeof downUrl != 'string') {
      if (getUrlFileName(downUrl.url).includes('wma')) {
        return '不支持预览的加密音频格式'
      }
      if (preview_type) {
        data.qualities.unshift({ quality: 'Origin', html: '原画', label: '原画', value: '', url: downUrl.url })
      }
      data.url = downUrl.url
      data.size = downUrl.size
    } else {
      return data
    }
  }
  return data
}

export function getUrlFileName(url: string) {
  let fileNameMatch = decodeURIComponent(url).match(/filename\*?=[^=;]*;?''([^&]+)/)
  if (fileNameMatch && fileNameMatch[1]) {
    return fileNameMatch[1]
  }
  return ''
}

export async function createProxyServer(port: number) {
  const url = require('url')
  const proxyServer: Server = http.createServer(async (clientReq: IncomingMessage, clientRes: ServerResponse) => {
    const { pathname, query } = url.parse(clientReq.url, true)
    const { user_id, drive_id, file_id, file_size, encType, password, weifa, quality, proxy_url } = query
    console.info('proxy query: ', query)
    if (pathname === '/proxy') {
      let proxyInfo: any = await Db.getValueObject('ProxyInfo')
      let proxyUrl = proxy_url || (proxyInfo && proxyInfo.proxy_url || '') || ''
      let { uiVideoQuality, securityEncType, securityFileNameAutoDecrypt } = useSettingStore()
      let selectQuality = quality || uiVideoQuality
      let needRefreshUrl = proxyInfo && (file_id != proxyInfo.file_id || proxyInfo.expires_time <= Date.now())
      let changeVideoQuality = proxyInfo && proxyInfo.videoQuality && (selectQuality !== proxyInfo.videoQuality)
      let subtitle_url = ''
      if (!proxyUrl || needRefreshUrl || changeVideoQuality) {
        // 获取地址
        let data = await getRawUrl(user_id, drive_id, file_id, weifa, 'other', selectQuality)
        console.error('proxy getRawUrl', data)
        if (typeof data != 'string' && data.url) {
          let subtitleData = data.subtitles.find((sub: any) => sub.language === 'chi') || data.subtitles[0]
          subtitle_url = subtitleData && subtitleData.url || ''
          proxyUrl = data.url
          proxyInfo = undefined
        }
      }
      console.warn('proxyUrl', proxyUrl)
      if (!proxyUrl) {
        clientRes.writeHead(404, { 'Content-Type': 'text/plain' })
        clientRes.end()
        await Db.deleteValueObject('ProxyInfo')
        return
      } else if (!proxyInfo) {
        let info: FileInfo = {
          user_id, drive_id, file_id, file_size, encType,
          videoQuality: selectQuality,
          expires_time: GetExpiresTime(proxyUrl),
          proxy_url: proxyUrl,
          subtitle_url: subtitle_url
        }
        await Db.saveValueObject('ProxyInfo', info)
      }
      // 转码文件302重定向
      if (proxyUrl.includes('.aliyuncs.com')) {
        clientRes.writeHead(302, { 'Location': proxyUrl })
        clientRes.end()
        return
      }
      console.warn('proxy.range', clientReq.headers.range)
      // 是否需要解密
      let decryptTransform: any = null
      delete clientReq.headers.host
      delete clientReq.headers.referer
      delete clientReq.headers.authorization
      await new Promise((resolve, reject) => {
        // 处理请求，让下载的流量经过代理服务器
        const httpRequest = ~proxyUrl.indexOf('https') ? https : http
        const agentServer = httpRequest.request(proxyUrl, {
          method: clientReq.method,
          headers: clientReq.headers,
          rejectUnauthorized: false,
          agent: ~proxyUrl.indexOf('https') ? httpsAgent : httpAgent
        }, (httpResp: any) => {
          console.error('httpResp.headers', httpResp.statusCode, httpResp.headers)
          clientRes.statusCode = httpResp.statusCode
          for (const key in httpResp.headers) {
            clientRes.setHeader(key, httpResp.headers[key])
          }
          if (clientRes.statusCode % 300 < 5) {
            // 可能出现304，redirectUrl = undefined
            const redirectUrl = httpResp.headers.location || '-'
            if (decryptTransform) {
              // Referer
              httpResp.headers.location = getProxyUrl({
                user_id, drive_id, file_id, password, weifa,
                file_size, encType, quality, proxy_url
              })
            }
            console.log('302 redirectUrl:', redirectUrl)
          } else if (httpResp.headers['content-range'] && httpResp.statusCode === 200) {
            // 文件断点续传下载
            clientRes.statusCode = 206
          } else if (httpResp.statusCode === 403) {
            resolve(true)
            decryptTransform && decryptTransform.destroy()
            clientRes.end()
            return
          }
          httpResp.on('end', () => resolve(true))
          if (decryptTransform) {
            httpResp.pipe(decryptTransform).pipe(clientRes)
          } else {
            httpResp.pipe(clientRes)
          }
        })
        clientReq.pipe(agentServer)
        // 关闭解密流
        agentServer.on('close', async () => {
          decryptTransform && decryptTransform.destroy()
        })
        agentServer.on('error', (e: Error) => {
          clientRes.end()
          console.log('proxyServer socket error: ' + e)
        })
        // 重定向的请求 关闭时 关闭被重定向的请求
        clientRes.on('close', async () => {
          agentServer.destroy()
        })
      })
      clientReq.on('error', (e: Error) => {
        console.log('client socket error: ' + e)
      })
    }
  })
  proxyServer.listen(port)
  proxyServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      proxyServer.close()
      proxyServer.removeAllListeners('error')
      DebugLog.mSaveDanger(`端口：${port}已被占用，请前往【高级选项->刷新端口】`)
      message.error(`端口：${port}已被占用，请前往【高级选项->刷新端口】`, 5)
    }
  })
  return proxyServer
}
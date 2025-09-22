import { EventEmitter } from 'node:events'
import thunky from 'thunky'
import { dlnaHelpers, MediaRendererOptions, parseTime, UpnpMediaRendererClient } from 'upnp-client-ts'
import mime from 'mime-types'
import { DeviceInfo } from './dlna'
import path from 'path'
import { ClearFileName } from '../../utils/filehelper'


interface Option extends MediaRendererOptions {
  title?: string;
  type?: string;
  subtitles?: string[];
}

class Player extends EventEmitter {
  private device: DeviceInfo
  private MAX_VOLUME: number = 100
  private upnpClient: any

  constructor(device: DeviceInfo) {
    super()
    this.device = device
  }

  private connect(cb: any) {
    let that = this
    let connect = thunky(function reconnect(cb) {
      const client = new UpnpMediaRendererClient(that.device.xml)
      client.on('error', (err) => {
        that.emit('error', err)
      })
      client.on('status', (status: any) => {
        that.emit('status', status)
      })
      client.on('loading', (loading) => {
        that.emit('loading', loading)
      })
      client.on('close', () => {
        connect = thunky(reconnect)
      })
      that.upnpClient = client
      cb(null, client)
    })
    connect(cb)
  }

  private request(serviceId: string, actionName: string, params: Record<string, string | number>, cb: any) {
    this.upnpClient
      .callAction(serviceId, actionName, params)
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  private escapeSpecialChars = (value: string) => {
    return ClearFileName(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove all accents from characters
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/’/g, '\'')
      .replace(/\s+/g, '')
      .replace(path.extname(value), '')
      .replace(/[<>"/\\|?* '&%$^`,;=()![\]\-~#]+/g, '')
      .replaceAll('.', '')
      .replaceAll('-', '')
  }

  private callBack = (err: any, res: any) => {
  }

  play(url: string, opts: Option = {}, cb: any = this.callBack) {
    if (!url) {
      return this.resume()
    }
    this.connect((err: any, client: UpnpMediaRendererClient) => {
      if (err) return cb(err)
      let contentType = opts.type || mime.lookup(url) || 'video/mp4'
      let type = 'video'
      if (opts.type) {
        if (opts.type.includes('application/octet-stream')) {
          type = 'video'
        } else {
          type = opts.type.split('/')[0] || 'video'
        }
      }
      const media: any = {
        autoplay: opts.autoplay || true,
        contentType: contentType,
        dlnaFeatures: opts.dlnaFeatures ||
          `${dlnaHelpers.getDlnaSeekModeFeature('none')};` +
          `${dlnaHelpers.getDlnaTranscodeFeature(true)};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_SENDER_PACED};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_TIME_BASED_SEEK};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_BYTE_BASED_SEEK};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_PLAY_CONTAINER};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_S0_INCREASE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_SN_INCREASE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_RTSP_PAUSE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_STREAMING_TRANSFER_MODE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_INTERACTIVE_TRANSFERT_MODE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_BACKGROUND_TRANSFERT_MODE};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_CONNECTION_STALL};` +
          `${dlnaHelpers.flagByteCodes.DLNA_ORG_FLAG_DLNA_V15};` +
          `${dlnaHelpers.defaultFlags.DLNA_STREAMING_BYTE_BASED_FLAGS};` +
          `${dlnaHelpers.defaultFlags.DLNA_STREAMING_TIME_BASED_FLAGS};` +
          `${dlnaHelpers.defaultFlags.DLNA_ORIGIN_FLAGS};`,
        metadata: opts.metadata || {
          title: this.escapeSpecialChars(opts.title || ''),
          type: type,
          subtitlesUrl: opts.subtitles && opts.subtitles.length ? opts.subtitles[0] : null
        }
      }
      console.log('play.opts', opts)
      console.log('play.media', media)
      client.load(url, media)
        .then((res: any) => cb(null, res))
        .catch((err: any) => cb(err, null))
    })
  }

  next(cb: any = this.callBack) {
    this.upnpClient.next()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  previous(cb: any = this.callBack) {
    this.upnpClient.previous()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  seek(time: number, cb: any = this.callBack) {
    this.upnpClient.seek(time)
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  getDuration(cb: any = this.callBack) {
    this.upnpClient.getDuration()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  getMediaInfo(cb: any = this.callBack) {
    this.upnpClient.getMediaInfo()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  getPositionInfo(cb: any = this.callBack) {
    this.upnpClient.getPositionInfo()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  getPosition(cb: any = this.callBack) {
    this.upnpClient.getPosition()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  getVolume(cb: any = this.callBack) {
    this.upnpClient.getVolume()
      .then((res: any) => cb(null, res))
      .catch((err: any) => cb(err, null))
  }

  volume(vol: number, cb: any = this.callBack) {
    const params = {
      InstanceID: this.upnpClient.instanceId,
      Channel: 'Master',
      DesiredVolume: (this.MAX_VOLUME * vol) | 0
    }
    this.request('RenderingControl', 'SetVolume', params, cb)
  }

  pause() {
    this.upnpClient.pause()
  }

  resume() {
    this.upnpClient.play()
  }

  stop() {
    this.upnpClient.stop()
  }

  status(cb: any = this.callBack) {
    Promise.all([
      new Promise((resolve, reject) => {
        this.getPositionInfo((err: any, res: any) => {
          if (err) return reject(err)
          const position = parseTime(res.AbsTime) || parseTime(res.RelTime)
          resolve(position)
        })
      }),
      new Promise((resolve, reject) => {
        this.getVolume((err: any, volume: number) => {
          if (err) return reject(err)
          resolve(volume)
        })
      })
    ]).then((results: any) => {
      let status = {
        currentTime: results[0],
        volume: { level: results[1] / (this.MAX_VOLUME) }
      }
      return cb(null, status)
    }).catch((err: any) => {
      return cb(err, null)
    })
  }

  destroy() {
    if (this.upnpClient) {
      this.upnpClient.removeAllListeners('error')
      this.upnpClient.removeAllListeners('status')
      this.upnpClient.removeAllListeners('loading')
      this.upnpClient.removeAllListeners('loading')
    }
    if (global.gc) global.gc()
  }
}

export default Player
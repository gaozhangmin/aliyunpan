import { EventEmitter } from 'node:events'
import { Client as SSDPClient, SsdpHeaders } from 'node-ssdp'
import dgram from 'dgram'
import Player from './player'
import { XMLParser } from 'fast-xml-parser'

export interface DeviceInfo {
  name: string;
  host: string;
  xml: string;
  info: any;
  emitted?: boolean;
}

class Dlna extends EventEmitter {
  private ssdpClient: any
  private casts: { [name: string]: DeviceInfo } = {}

  constructor() {
    super()
    try {
      this.ssdpClient = new SSDPClient()
    } catch {}
  }

  search() {
    if (!this.ssdpClient) return
    this.ssdpClient.search('urn:schemas-upnp-org:device:MediaRenderer:1')
    this.ssdpClient.on('response', (headers: SsdpHeaders, statusCode: number, info: dgram.RemoteInfo) => {
      if (!headers.LOCATION) return
      fetch(headers.LOCATION).then(res => res.text()).then((body) => {
        let service = new XMLParser({ ignoreAttributes: false }).parse(body)
        console.log('service', service)
        const device = service.root.device
        if (!service.root || !device || !device.friendlyName) return
        const name = device.friendlyName
        const host = info.address
        const xml = headers.LOCATION!!
        if (!this.casts[name]) {
          this.casts[name] = { name: name, host: host, xml: xml, info: device }
          return this.listen(this.casts[name])
        }
        if (this.casts[name] && !this.casts[name].host) {
          this.casts[name].host = host
          this.casts[name].xml = xml
          return this.listen(this.casts[name])
        }
      }).catch(err => {
        console.error(err)
      })
    })
  }

  listen(device: DeviceInfo) {
    if (!device || !device.host || device.emitted) return
    let player = new Player(device)
    this.emit('update', player)
    device.emitted = true
  }

  destroy() {
    this.casts = {}
    this.ssdpClient.stop()
    this.ssdpClient.removeAllListeners('response')
    if (global.gc) global.gc()
  }
}

export default new Dlna()
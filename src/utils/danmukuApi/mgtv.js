import axios from 'axios'
import urlmodule from 'url'
import { content_template, time_to_second } from './utils'

const example_urls = [
  'https://www.mgtv.com/b/336727/8087768.html',
  'https://www.mgtv.com/b/459529/17730031.html' //api lens 90
]

class Mgtv {

  constructor() {
    this.name = '芒果TV'
    this.domain = 'mgtv.com'
    this.title = ''
    this.content = ''
  }

  async resolve(url) {
    const api_video_info = 'https://pcweb.api.mgtv.com/video/info'
    const api_danmaku = 'https://galaxy.bz.mgtv.com/rdbarrage'
    const q = urlmodule.parse(url, true)
    const path = q.pathname.split('/')
    const cid = path.slice(-2)[0]
    const vid = path.slice(-1)[0].split('.')[0]
    const res = await axios.get(api_video_info, { params: { cid, vid } })
    this.title = res.data.data.info.videoName
    const time = res.data.data.info.time

    const step = 60 * 1000
    const end_time = time_to_second(time) * 1000
    let promises = []
    for (let i = 0; i < end_time; i += step) {
      promises.push(axios({ method: 'get', url: api_danmaku, params: { vid, cid, time: i } }))
    }
    return promises
  }

  async parse(promises) {
    let contents = []
    const values = await Promise.all(promises)
    let datas = values.map(value => value.data)
    for (const data of datas) {
      if (data.data.items === null)
        continue
      for (const item of data.data.items) {
        const content = JSON.parse(JSON.stringify(content_template))
        content.time = item.time / 1000
        content.text = item.content
        content.uid = item.uid
        contents.push(content)
      }
    }
    // contents = make_response(contents);
    return contents
  }

  async work(url) {
    const promises = await this.resolve(url)
    // console.log(this.name, 'api lens:', promises.length)
    this.content = await this.parse(promises)
    return {
      title: this.title,
      content: this.content,
      msg: 'ok'
    }
  }
}

export default new Mgtv()

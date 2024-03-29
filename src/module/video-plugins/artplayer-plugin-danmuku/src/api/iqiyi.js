import axios from 'axios'
import pako from 'pako'
import { content_template, time_to_second } from './utils'
import cache from '../../../../../utils/cache'

const example_urls = [
  'https://www.iqiyi.com/v_19rr1lm35o.html', //api lens 11
  'http://www.iqiyi.com/v_1qzx9b00hs4.html?vfm=m_331_dbdy' //api lens 25
]

//资源消耗大 256M内存扛不住
class Iqiyi {
  constructor() {
    this.name = '爱奇艺'
    this.domain = 'iqiyi.com'
    this.title = ''
  }

  async search(keyword, pos) {
    if (cache.has(this.domain + keyword + pos)) {
      return this.handleSearchRes(cache.get(this.domain + keyword + pos), pos)
    }
    const api_search = 'https://search.video.iqiyi.com/o'
    const params = {
      if: 'html5',
      key: keyword,
      pageNum: 1,
      pageSize: 5,
      video_allow_3rd: 0
    }

    const resp = await axios.get(api_search, { params }).catch()
    if (!resp || resp.status !== 200) {
      return {}
    }

    let data = resp.data.data
    // 没有结果
    cache.set(this.domain + keyword + pos, data, 60 * 60 * 2)
    return this.handleSearchRes(data, pos)
  }

  handleSearchRes(data, pos) {
    if ('search result is empty' in data) {
      return {}
    }
    for (let item of data.docinfos) {
      if (this.dropThis(item)) {
        continue
      }
      let videoinfos = item.videoinfos || item.albumDocInfo.videoinfos
      let videoEpisode = videoinfos && videoinfos.find(info => info.itemNumber === pos)
      if (videoEpisode) {
        return {
          url: videoEpisode.itemLink,
          title: videoEpisode.itemTitle
        }
      }
    }
    return {}
  }

  dropThis(item) {
    item = item.albumDocInfo
    if (item.douban_score < 2) {
      return true
    }
    // 经常出现无关内容
    if (item.channel.includes('生活') || item.channel.includes('教育')) {
      return true
    }
    // 没有用的视频
    if (!item.itemTotalNumber) {
      return true
    }
    const title = item.albumTitle
    // 垃圾数据
    if (title.includes('精彩看点') || title.includes('精彩片段') || title.includes('精彩分享')) {
      return true
    }
    return false
  }

  async resolve(url) {
    const res = await axios({
      url: url,
      method: 'get'
    })
    const data = res.data
    const result = data.match(/window.Q.PageInfo.playPageInfo=(.*);/)
    const page_info = JSON.parse(result[1])
    // console.log('page_info:', page_info)

    const duration = time_to_second(page_info.duration)
    this.title = page_info.tvName ? page_info.tvName : page_info.name
    const albumid = page_info.albumId
    const tvid = page_info.tvId.toString()
    const categoryid = page_info.cid
    const page = Math.round(duration / (60 * 5))
    // console.log('tvid', tvid)
    let promises = []
    for (let i = 0; i < page; i++) {
      // 一次拿 5 分钟的弹幕
      const api_url = `https://cmts.iqiyi.com/bullet/${tvid.slice(-4, -2)}/${tvid.slice(-2)}/${tvid}_300_${i + 1}.z`
      const params = {
        rn: '0.0123456789123456',
        business: 'danmu',
        is_iqiyi: 'true',
        is_video_page: 'true',
        tvid: tvid,
        albumid: albumid,
        categoryid: categoryid,
        qypid: '01010021010000000000'
      }
      promises.push(axios({
        method: 'get',
        url: api_url,
        params: params,
        responseType: 'arraybuffer'
      }))
    }
    return promises
  }

  extract(xml, tag) {
    const reg = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g')
    const res = xml.match(reg)
      ?.map(x => x.substring(tag.length + 2, x.length - tag.length - 3))
    return res || []
  }

  xml2json(xml, contents, length) {
    const danmaku = this.extract(xml, 'content')
    const showTime = this.extract(xml, 'showTime')
    const color = this.extract(xml, 'color')
    const font = this.extract(xml, 'font')

    // 控制步长，减小内存占用
    const step = Math.ceil(danmaku.length * length / 10000)
    // console.log(step)
    for (let i = 0; i < danmaku.length; i += step) {
      // console.log(bulletInfo)
      const content = JSON.parse(JSON.stringify(content_template))
      content.time = parseInt(showTime[i]) //showTime
      content.color = color[i].toString(16) //color
      content.text = danmaku[i] //content
      if (font[i] && font[i] === '0') {//font
        if (font[i] === '0') {
          content.fontSize = 25
        } else {
          content.fontSize = parseInt(font[i])
        }
      }
      contents.push(content)
    }
  }

  async parse(promises) {
    //筛选出成功的请求
    let datas = (await Promise.allSettled(promises))
      .filter(x => x.status === 'fulfilled')
      .map(x => x.value.data)

    let contents = []
    for (let i = 0; i < datas.length; i++) {
      const data = datas[i]
      let xml = pako.inflate(data, { to: 'string' })
      this.xml2json(xml, contents, datas.length)
      data[i] = undefined
      xml = undefined
      if (global.gc) {
        global.gc()
      }

    }
    datas = undefined
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

export default new Iqiyi()

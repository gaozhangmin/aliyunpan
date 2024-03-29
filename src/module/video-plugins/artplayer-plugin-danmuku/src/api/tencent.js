import axios from 'axios'
import whacko from 'whacko'
import urlmodule from 'url'
import { v4 } from 'uuid'

import { content_template } from './utils'
import cache from '../../../../../utils/cache'

const example_urls = [
  'https://v.qq.com/x/cover/53q0eh78q97e4d1/x00174aq5no.html',//api lens 50
  'https://v.qq.com/x/cover/mzc00200fph94nw/l00448ijvve.html'//api lens 91
]

class Tencent {

  constructor() {
    this.name = '腾讯视频'
    this.domain = 'v.qq.com'
    this.title = ''
    this.content = ''
    this.error_msg = ''
  }

  async search(keyword, pos) {
    // 缓存搜索结果
    if (cache.has(this.domain + keyword + pos)) {
      return this.handleSearchRes(cache.get(this.domain + keyword + pos), pos)
    }
    const api_search = 'https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp'
    const params = {
      version: '',
      clientType: 1,
      filterValue: 'firstTabid=150',
      uuid: v4().toString().toUpperCase(),
      retry: 0,
      query: keyword,
      pagenum: 0,
      pagesize: 5,
      queryFrom: 4,
      sceneId: 21,
      searchDatakey: '',
      isneedQc: true,
      preQid: '',
      adClientInfo: '',
      extraInfo: {
        isNewMarkLabel: ''
      },
      platform: '23'
    }
    const resp = await axios.post(api_search, params).catch()
    const respData = resp.data
    if (!resp || resp.status !== 200 || !respData.data.normalList) {
      return {}
    }
    let itemList = respData.data.normalList.itemList || []
    if (!itemList || itemList.length === 0) {
      return {}
    }
    // 获取详情地址
    let detailUrl = ''
    for (const item of itemList) {
      if (item.videoInfo && item.videoInfo.playSites) {
        if (item.videoInfo.playSites[0].episodeInfoList) {
          detailUrl = item.videoInfo.playSites[0].episodeInfoList[0].url
          break
        }
      }
    }
    // 通过详情筛选播放地址
    const detailResp = await axios.get(detailUrl)
    const dataMatch = detailResp.data.match(/window.__PINIA__ {0,1}= {0,1}([^<]{1,})</)
    if (!dataMatch) {
      return {}
    }
    const data = new Function(`return ${dataMatch[1]};`)()
    cache.set(this.domain + keyword + pos, data, 60 * 60 * 2)
    return this.handleSearchRes(data, pos)
  }

  handleSearchRes(data, pos) {
    if (data && data.episodeMain && data.episodeMain.listData) {
      let listData = data.episodeMain.listData.filter(Boolean)[0].list[0]
      for (const item of listData) {
        if ((item.index + 1) === pos) {
          return {
            title: item.fullTitle,
            url: `https://v.qq.com/x/cover/${item.cid}/${item.vid}.html`
          }
        }
      }
    }
    return {}
  }

  async resolve(url) {
    const api_danmaku_base = 'https://dm.video.qq.com/barrage/base/'
    const api_danmaku_segment = 'https://dm.video.qq.com/barrage/segment/'
    const q = urlmodule.parse(url, true)
    const path = q.pathname.split('/')
    let vid
    if (q.query.vid) {
      vid = q.query.vid
    } else {
      vid = path.slice(-1)[0].split('.')[0]
    }
    let res = await axios.get(url)
    const $ = whacko.load(res.data, null, false)
    this.title = $('title')[0].children[0].data.split('_')[0]
    // console.log('vid:', vid, 'title:', this.title)
    try {
      res = await axios.get(api_danmaku_base + vid)
    } catch (e) {
      if (e.response.status && e.response.status === 404) {
        this.error_msg = '好像没有弹幕哦'
        return
      } else throw e
    }

    let promises = []
    let list = Object.values(res.data.segment_index)
    for (const item of list) {
      promises.push(axios.get(`${api_danmaku_segment}${vid}/${item.segment_name}`))
    }
    return promises
  }

  async parse(promises) {
    let contents = []
    //筛选出成功的请求
    let datas = (await Promise.allSettled(promises))
      .filter(x => x.status === 'fulfilled')
      .map(x => x.value.data)

    for (const data of datas) {
      for (const item of data.barrage_list) {
        const content = JSON.parse(JSON.stringify(content_template))
        content.time = item.time_offset / 1000
        if (item.content_style && item.content_style.includes('color')) {
          let content_style = JSON.parse(item.content_style)
          if (content_style.color) {
            content.color = content_style.color
          }
          if (content_style.gradient_colors) {
            content.color = content_style.gradient_colors[0]
          }
        }
        content.text = item.content
        contents.push(content)
      }
    }
    // contents = make_response(contents);
    return contents
  }

  async work(url) {
    const promises = await this.resolve(url)
    if (!this.error_msg) {
      // console.log(this.name, 'api lens:', promises.length)
      this.content = await this.parse(promises)
    }
    return {
      title: this.title,
      content: this.content,
      msg: this.error_msg ? this.error_msg : 'ok'
    }
  }
}

export default new Tencent()
import urlmodule from 'url'
import axios from 'axios'
import crypto from 'crypto'
import cache from '../../../../../utils/cache'

const example_urls = [
  'https://www.bilibili.com/video/av170001',
  'https://www.bilibili.com/video/av170001?p=2',
  'https://www.bilibili.com/video/BV17x411w7KC?p=3',
  'https://www.bilibili.com/bangumi/play/ep691614'
]

const mixinKeyEncTab = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52]
// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig) => mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32)

class Bilibili {
  constructor() {
    this.name = 'B站'
    this.domain = 'bilibili.com'
    this.title = ''
    this.error_msg = ''
  }

  // 为请求参数进行 wbi 签名
  encWbi(params, img_key, sub_key) {
    const mixin_key = getMixinKey(img_key + sub_key)
    const curr_time = Math.round(Date.now() / 1000)
    const chr_filter = /[!'()*]/g
    // 添加 wts 字段
    Object.assign(params, { wts: curr_time })
    // 按照 key 重排参数
    const query = Object
      .keys(params)
      .sort()
      .map(key => {
        // 过滤 value 中的 "!'()*" 字符
        const value = params[key].toString().replace(chr_filter, '')
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      })
      .join('&')
    const wbi_sign = crypto.createHash('md5')
      .update(Buffer.from(query + mixin_key))
      .digest('hex') // 计算 w_rid
    return query + '&w_rid=' + wbi_sign
  }

  // 获取最新的 img_key 和 sub_key
  async getWbiKeys() {
    // todo 缓存 img_key 和 sub_key
    const api_nav = 'https://api.bilibili.com/x/web-interface/nav'
    const res = await axios.get(api_nav, {
      withCredentials: true,
      responseType: 'json'
    })
    const { data: { wbi_img: { img_url, sub_url } } } = res.data

    return {
      img_key: img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
      sub_key: sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'))
    }
  }

  async search(keyword, pos) {
    if (cache.has(this.domain + keyword + pos)) {
      return this.handleSearchRes(cache.get(this.domain + keyword + pos), pos)
    }
    const web_keys = await this.getWbiKeys()
    const img_key = web_keys.img_key
    const sub_key = web_keys.sub_key
    const api_search = 'https://api.bilibili.com/x/web-interface/wbi/search/type'
    const params = {
      search_type: 'media_bangumi',
      keyword: keyword,
      page: 1
    }
    const resp = await axios.get(api_search + '?' + this.encWbi(params, img_key, sub_key), {
      responseType: 'json',
      withCredentials: true
    }).catch()
    if (!resp || resp.status !== 200 || resp.data.code !== 0) {
      return {}
    }
    let data = resp.data.data
    cache.set(this.domain + keyword + pos, data, 60 * 60 * 2)
    return this.handleSearchRes(data, pos)
  }

  handleSearchRes(data, pos) {
    if (!data || !data.result || data.result.length === 0) {
      return {}
    }
    let result = data.result.sort((a, b)=> b.media_score.user_count - a.media_score.user_count)
    for (let ep of result[0].eps) {
      if (pos === parseInt(ep.index_title)) {
        return {
          title: ep.long_title,
          url: ep.url
        }
      }
    }
    return {}
  }

  async resolve(url) {
    // 相关API
    const api_video_info = 'https://api.bilibili.com/x/web-interface/view'
    const api_epid_cid = 'https://api.bilibili.com/pgc/view/web/season'
    const q = urlmodule.parse(url, true)
    const path = q.pathname.split('/')
    // 普通投稿视频
    if (url.indexOf('video/') !== -1) {
      // 获取视频分P信息
      const p = q.query.p || 1
      // 判断是否为旧版av号
      let params
      if (url.indexOf('BV') !== -1) {
        params = { 'bvid': path[2] }
      } else {
        params = { 'aid': path[2].substring(2) }
      }
      const response = await axios.get(api_video_info, { params })
      if (response.data.code !== 0) {
        this.error_msg = '获取普通投稿视频信息失败！' + response.data.message
        return
      }
      this.title = response.data.data.title
      const subtitle = response.data.data.pages[p - 1].part
      this.title = this.title + '-' + subtitle
      const cid = response.data.data.pages[p - 1].cid
      return `https://comment.bilibili.com/${cid}.xml`
    } // 番剧
    else if (url.indexOf('bangumi/') !== -1 && url.indexOf('ep') !== -1) {
      const epid = path.slice(-1)[0]
      const params = { 'ep_id': epid.slice(2) }
      const response = await axios.get(api_epid_cid, { params })
      if (response.data.code !== 0) {
        this.error_msg = '获取番剧视频信息失败！'
        return
      }
      let episodes = response.data.result.episodes
      for (let i = 0; i < episodes.length; i++) {
        if (episodes[i].ep_id == params.ep_id) {
          this.title = episodes[i].share_copy
          const cid = episodes[i].cid
          return `https://comment.bilibili.com/${cid}.xml`
        }
      }
    } else {
      this.error_msg = '不支持的B站视频网址，仅支持普通视频(av,bv)、剧集视频(ep)'
    }
    return ''
  }

  async work(url) {
    const danmuUrl = await this.resolve(url)
    return {
      title: this.title,
      url: danmuUrl,
      msg: this.error_msg || 'ok'
    }
  }
}

export default new Bilibili()
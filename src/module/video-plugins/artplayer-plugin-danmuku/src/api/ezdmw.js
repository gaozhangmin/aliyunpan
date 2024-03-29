import cache from '../../../../../utils/cache'
import whacko from 'whacko'
import axios from 'axios'
import urlmodule from 'url'

const example_urls = [
  'https://www.ezdmw.site/Index/bangumi/76634.html',
  'https://www.ezdmw.site/Index/video/80008.html'
]

class ezdmw {
  constructor() {
    this.name = 'E站'
    this.domain = 'ezdmw.site'
    this.title = ''
    this.error_msg = ''
  }

  async search(keyword, pos) {
    // 缓存搜索结果
    if (cache.has(this.domain + keyword + pos)) {
      return this.handleSearchRes(cache.get(this.domain + keyword + pos), pos)
    }
    const api_search = `https://www.ezdmw.site/Index/search_some`
    const params = {
      searchText: keyword,
      hot: true,
      page: 0
    }
    const searchResp = await axios.get(api_search, { params }).catch()
    if (!searchResp || searchResp.status !== 200) {
      return {}
    }
    const searchHtml = whacko.load(searchResp.data, null, false)
    let api_detail_url = ''
    try {
      api_detail_url = searchHtml('.index_centent #some_drama > div')[0].children[0].attribs.href
    } catch {
      return {}
    }
    // 通过详情筛选播放地址
    const detailResp = await axios.get('https://www.ezdmw.site' + api_detail_url)
    const $ = whacko.load(detailResp.data, null, false)
    const data = $('.anthology .circuit_switch1')
      .map((index, element) => element.attribs.href).get().reverse()
    cache.set(this.domain + keyword + pos, data, 60 * 60 * 2)
    return this.handleSearchRes(data, pos)
  }

  handleSearchRes(data, pos) {
    if (data && data.length > 0) {
      for (let index = 0; index < data.length; index++) {
        if ((index + 1) === pos) {
          return {
            title: pos,
            url: `https://www.ezdmw.site${data[index]}`
          }
        }
      }
    }
    return {}
  }

  async resolve(url) {
    let res = await axios.get(url)
    const $ = whacko.load(res.data, null, false)
    const src = $('.iframe')[0].attribs.src
    const { query} = urlmodule.parse(src, true)
    const title = query.title + (query.nk.match(/(\d+)/)[1] || '')
    const danmuUrl = urlmodule.format({
      host: 'https://player.ezdmw.lol',
      pathname: '/index/getData.html',
      query: {
        video_id: query.nk,
        danmu: query.nk,
        json: 'xml',
        sign: query.sign,
        timeAxis: query.timeAxis
      }
    })
    return { url: danmuUrl, title: title}
  }

  async work(url) {
    const danmu = await this.resolve(url)
    return {
      title: danmu.title,
      url: danmu.url,
      msg: this.error_msg || 'ok'
    }
  }
}

export default new ezdmw()
import bilibili from './bilibili'
import ezdmw from './ezdmw'
import iqiyi from './iqiyi'
import mgtv from './mgtv'
import tencent from './tencent'
import youku from './youku'

import axios from 'axios'
import cache from '../../../../../utils/cache'
import { md5Code } from '../../../../../utils/utils'

const list = [bilibili, ezdmw, tencent, iqiyi, youku, mgtv]

export async function searchVideo(keyword, pos) {
  if (!keyword) {
    return { msg: '请输入关键词' }
  }
  // 捕获所有错误并添加日志
  for (let parseHelper of list) {
    if (parseHelper.search) {
      let data = await parseHelper.search(keyword, pos)
      if (data && data.url) {
        return data
      }
    }
  }
  return { msg: '未搜索到，换个关键词（重命名）试试！' }
}

export async function resolveDanmu(url) {
  if (!url) {
    return { msg: '请输入链接' }
  }
  let md5Url = md5Code(url)
  if (cache.has(md5Url)) {
    return cache.get(md5Url)
  }
  // 测试url是否能下载
  try {
    await axios.get(url)
  } catch (e) {
    console.error('error', e)
    return { msg: '传入的链接非法！请检查链接是否能在浏览器正常打开' }
  }
  // 循环找到对应的解析器
  let fc = list.find(item => url.includes(item.domain))
  // 找不到对应的解析器
  if (fc === undefined) {
    return { 'msg': '不支持的视频网址' }
  }
  // 捕获所有错误并添加日志
  try {
    let danmuData = await fc.work(url)
    cache.set(md5Url, danmuData, 60 * 60)
    return danmuData
  } catch (e) {
    console.error('error', e)
    return { msg: '弹幕解析过程中程序报错退出，换条链接试试！' }
  }
}
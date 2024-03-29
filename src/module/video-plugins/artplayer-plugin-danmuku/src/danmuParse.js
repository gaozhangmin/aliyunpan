import { resolveDanmu, searchVideo } from './api'
import axios from 'axios'

export function getMode(key) {
  switch (key) {
    case 1:
    case 2:
    case 3:
      return 0
    case 4:
    case 5:
      return 1
    default:
      return 0
  }
}

export function UniversalDanmuParseFromXml(xmlString, option) {
  if (typeof xmlString !== 'string') return []
  const matches = xmlString.matchAll(/<d (?:.*? )??p="(?<p>.+?)"(?: .*?)?>(?<text>.+?)<\/d>/gs)
  return Array.from(matches)
    .map((match) => {
      const attr = match.groups.p.split(',')
      if (attr.length >= 3) {
        const text = match.groups.text
          .trim()
          .replaceAll('&quot;', '"')
          .replaceAll('&apos;', '\'')
          .replaceAll('&lt;', '<')
          .replaceAll('&gt;', '>')
          .replaceAll('&amp;', '&')

        return {
          text,
          time: Number(attr[0]),
          mode: getMode(Number(attr[1])) || option.mode,
          fontSize: Number(attr[2]) || option.fontSize,
          color: `#${Number(attr[3]).toString(16)}` || option.color,
          timestamp: Number(attr[4]) || 0
        }
      } else {
        return null
      }
    })
    .filter(Boolean)
}

export function UniversalDanmuParseFromSearch({ name, pos }, option) {
  if (name.length === 0) return
  return searchVideo(name, pos).then(async (res) => {
    if (!res.msg) {
      let video_url = res.url
      if (video_url && video_url.includes('so.iqiyi.com/links')) {
        // 获取重定向后的地址
        video_url = await axios.get(video_url.url).then((res) => res.data.match(/URL='(.*)'/)[1])
      }
      if (video_url) {
        return UniversalDanmuParseFromUrl(video_url, option)
      } else {
        return []
      }
    } else {
      throw res.msg
    }
  })
}

export function UniversalDanmuParseFromUrl(url, option) {
  if (url.length === 0) return
  return resolveDanmu(url).then(async (res) => {
    console.log('resolveDanmu', res)
    if (res && res.msg === 'ok') {
      if (res.url) {
        return await fetch(res.url)
          .then((res) => res.text())
          .then((xmlString) => UniversalDanmuParseFromXml(xmlString, option))
      } else if (res.content) {
        return res.content
      } else {
        return []
      }
    } else {
      throw res.msg
    }
  })
}

import axios from 'axios'
// @ts-ignore These parser helpers are local JS modules without declaration files.
import { resolveDanmu, searchVideo } from './danmukuApi'

type DanmukuParseOption = {
  mode?: number
  fontSize?: number | string
  color?: string
}

type SearchDanmukuSource = {
  name: string
  pos: number
}

export function getMode(key: number) {
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

export function universalDanmukuParseFromXml(xmlString: string, option: DanmukuParseOption) {
  if (typeof xmlString !== 'string') return []
  const matches = xmlString.matchAll(/<d (?:.*? )??p="(?<p>.+?)"(?: .*?)?>(?<text>.+?)<\/d>/gs)
  return Array.from(matches)
    .map((match) => {
      const attr = match.groups?.p.split(',') || []
      if (attr.length < 3 || !match.groups?.text) return null
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
        mode: getMode(Number(attr[1])) ?? option.mode,
        fontSize: Number(attr[2]) || option.fontSize,
        color: Number.isFinite(Number(attr[3])) ? `#${Number(attr[3]).toString(16).padStart(6, '0')}` : option.color,
        timestamp: Number(attr[4]) || 0
      }
    })
    .filter(Boolean)
}

export function universalDanmukuParseFromSearch({ name, pos }: SearchDanmukuSource, option: DanmukuParseOption) {
  if (name.length === 0) return
  return searchVideo(name, pos).then(async (res: any) => {
    if (!res.msg) {
      let videoUrl = res.url
      if (videoUrl && videoUrl.includes('so.iqiyi.com/links')) {
        videoUrl = await axios.get(videoUrl).then((res) => res.data.match(/URL='(.*)'/)[1]).catch()
      }
      if (videoUrl) {
        return universalDanmukuParseFromUrl(videoUrl, option)
      } else {
        return []
      }
    } else {
      throw res.msg
    }
  })
}

export function universalDanmukuParseFromUrl(url: string, option: DanmukuParseOption) {
  if (url.length === 0) return
  return resolveDanmu(url).then(async (res: any) => {
    console.log('resolveDanmu', res)
    if (res && res.msg === 'ok') {
      if (res.url) {
        return await fetch(res.url)
          .then((res) => res.text())
          .then((xmlString) => universalDanmukuParseFromXml(xmlString, option))
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

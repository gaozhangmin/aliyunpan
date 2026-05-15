import { extname } from 'node:path'

export const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.ts', '.m2ts',
  '.rmvb', '.rm', '.3gp', '.webm', '.ogv', '.divx', '.xvid',
])

export const SUBTITLE_EXTENSIONS = new Set([
  '.srt', '.ass', '.ssa', '.sub', '.idx', '.vtt', '.sup',
])

export const YEAR_PATTERN = /\b(19\d{2}|20[0-2]\d)\b/

export const JUNK_TOKENS = new Set([
  '1080p', '720p', '480p', '2160p', '4k', 'uhd', 'hd', 'sd',
  'bluray', 'blu-ray', 'bdrip', 'brrip', 'webrip', 'web-dl', 'webdl',
  'hdtv', 'dvdrip', 'dvd', 'hdrip',
  'x264', 'x265', 'h264', 'h265', 'hevc', 'avc', 'xvid', 'divx',
  'aac', 'ac3', 'dts', 'dd5', 'truehd', 'flac', 'mp3',
  'extended', 'theatrical', 'directors', 'cut', 'remastered',
  'proper', 'repack', 'internal', 'limited', 'retail',
  'hdr', 'hdr10', 'dolby', 'vision', 'dv', 'sdr',
  'amzn', 'nf', 'hulu', 'dsnp', 'hmax', 'atvp', 'pcok',
  'yts', 'yify', 'rarbg', 'ettv', 'eztv',
  'chinese', 'english', 'subtitles', 'dubbed', 'subbed',
  '中字', '中英', '双语',
])

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function extractYear(str) {
  const match = str.match(YEAR_PATTERN)
  return match ? parseInt(match[1], 10) : null
}

export function extractEpisodeInfo(str) {
  const m1 = str.match(/[Ss](\d{1,2})[Ee](\d{1,2})/)
  if (m1) return { season: parseInt(m1[1], 10), episode: parseInt(m1[2], 10) }

  const m2 = str.match(/(\d{1,2})x(\d{2})/)
  if (m2) return { season: parseInt(m2[1], 10), episode: parseInt(m2[2], 10) }

  const m3 = str.match(/[Ee][Pp]?\.?\s*(\d{1,3})(?!\d)/)
  if (m3) return { season: null, episode: parseInt(m3[1], 10) }

  const m4 = str.match(/第\s*(\d{1,3})\s*[集话話]/)
  if (m4) return { season: null, episode: parseInt(m4[1], 10) }

  return null
}

export function extractSeasonOnly(str) {
  const m1 = str.match(/[Ss]eason\s*(\d{1,2})/i)
  if (m1) return parseInt(m1[1], 10)
  const m2 = str.match(/第\s*(\d{1,2})\s*季/)
  if (m2) return parseInt(m2[1], 10)
  return null
}

export function findFirstEpisodeMatchIndex(stem) {
  const seMatch = stem.match(/[Ss]\d{1,2}[Ee]\d{1,2}/)
  const xMatch = stem.match(/\d{1,2}x\d{2}/)
  const epMatch = stem.match(/[Ee][Pp]?\.?\s*\d{1,3}/)
  const cnMatch = stem.match(/第\s*\d{1,3}\s*[集话話]/)
  const candidates = [seMatch, xMatch, epMatch, cnMatch].filter(Boolean)
  if (candidates.length === 0) return -1
  return Math.min(...candidates.map((m) => m.index))
}

export function yearStopIndex(stem, year) {
  if (year == null) return null
  const bracketMatch = stem.match(new RegExp(`\\(\\s*${year}\\s*\\)`))
  if (bracketMatch) return bracketMatch.index > 0 ? bracketMatch.index : null
  const bareMatch = stem.search(new RegExp(`\\b${year}\\b`))
  return bareMatch > 0 ? bareMatch : null
}

export function cleanTitle(str, stopIndex) {
  const raw = stopIndex != null && stopIndex > 0 ? str.slice(0, stopIndex) : str
  const cleaned = raw
    .replace(/\(\s*(?:19|20)\d{2}\s*\)/g, '')
    .replace(YEAR_PATTERN, '')
    .replace(/[._\-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const words = cleaned.split(/\s+/)
  const meaningful = words.filter((w) => !JUNK_TOKENS.has(w.toLowerCase()))
  return (meaningful.join(' ').trim()) || cleaned.trim()
}

export function detectMediaType(item) {
  if (item.type === 'folder') return 'folder'
  const ext = extname(item.name || '').toLowerCase()
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (SUBTITLE_EXTENSIONS.has(ext)) return 'subtitle'
  return 'other'
}

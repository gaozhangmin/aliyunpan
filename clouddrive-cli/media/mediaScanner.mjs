import { extname } from 'node:path'
import {
  VIDEO_EXTENSIONS, SUBTITLE_EXTENSIONS, extractYear, extractEpisodeInfo,
  extractSeasonOnly, cleanTitle, findFirstEpisodeMatchIndex, yearStopIndex,
  detectMediaType, pad2,
} from './mediaUtils.mjs'

function seriesKey(title, year) {
  const base = title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, ' ').trim()
  return year ? `${base} (${year})` : base
}

function episodeDupKey(title, year, season, episode) {
  return `${seriesKey(title, year)} s${pad2(season)}e${pad2(episode)}`
}

function parseVideoItem(item) {
  const ext = extname(item.name)
  const stem = item.name.slice(0, -ext.length)
  const epInfo = extractEpisodeInfo(stem)
  const year = extractYear(stem)

  if (epInfo) {
    const season = epInfo.season ?? 1
    const stopIndex = findFirstEpisodeMatchIndex(stem)
    const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
    return { kind: 'episode', title, year, season, episode: epInfo.episode }
  }

  const stopIndex = yearStopIndex(stem, year)
  const title = cleanTitle(stem, stopIndex)
  if (title) return { kind: 'movie', title, year }
  return { kind: 'unknown', title: null, year: null }
}

function parseFolder(item) {
  const season = extractSeasonOnly(item.name)
  if (season != null) return { kind: 'season', season }
  const year = extractYear(item.name)
  const stopIndex = yearStopIndex(item.name, year)
  const title = cleanTitle(item.name, stopIndex)
  if (title) return { kind: 'series_folder', title, year }
  return { kind: 'unknown_folder', title: null, year: null }
}

export function scanMediaItems(items) {
  const movies = []
  const seriesMap = {}
  const seasonFolders = []
  const subtitles = []
  const unrecognized = []
  const dupTracker = {}

  for (const item of items) {
    const fileId = item.fileId || item.file_id || ''
    const mediaType = detectMediaType(item)

    if (mediaType === 'other') {
      unrecognized.push({ fileId, name: item.name, reason: 'Not a recognized media type.' })
      continue
    }

    if (mediaType === 'folder') {
      const parsed = parseFolder(item)
      if (parsed.kind === 'season') {
        seasonFolders.push({ fileId, name: item.name, season: parsed.season })
      } else if (parsed.kind === 'series_folder') {
        const key = seriesKey(parsed.title, parsed.year)
        if (!seriesMap[key]) seriesMap[key] = { title: parsed.title, year: parsed.year, episodes: [], seasonNumbers: new Set(), folderFileId: null }
        seriesMap[key].folderFileId = fileId
      } else {
        unrecognized.push({ fileId, name: item.name, reason: 'Cannot determine folder type.' })
      }
      continue
    }

    if (mediaType === 'subtitle') {
      subtitles.push({ fileId, name: item.name, parentFileId: item.parentFileId || item.parent_file_id || '' })
      continue
    }

    // video
    const parsed = parseVideoItem(item)
    if (parsed.kind === 'movie') {
      movies.push({ fileId, name: item.name, title: parsed.title, year: parsed.year })
    } else if (parsed.kind === 'episode') {
      const key = seriesKey(parsed.title, parsed.year)
      if (!seriesMap[key]) seriesMap[key] = { title: parsed.title, year: parsed.year, episodes: [], seasonNumbers: new Set(), folderFileId: null }
      seriesMap[key].episodes.push({ fileId, name: item.name, season: parsed.season, episode: parsed.episode })
      seriesMap[key].seasonNumbers.add(parsed.season)
      const dupKey = episodeDupKey(parsed.title, parsed.year, parsed.season, parsed.episode)
      if (!dupTracker[dupKey]) dupTracker[dupKey] = []
      dupTracker[dupKey].push({ fileId, name: item.name })
    } else {
      unrecognized.push({ fileId, name: item.name, reason: 'Cannot determine video type (movie or episode).' })
    }
  }

  const series = {}
  for (const [key, s] of Object.entries(seriesMap)) {
    series[key] = {
      title: s.title,
      year: s.year,
      folderFileId: s.folderFileId,
      seasons: [...s.seasonNumbers].sort((a, b) => a - b),
      episode_count: s.episodes.length,
      episodes: s.episodes,
    }
  }

  const suspected_duplicates = Object.entries(dupTracker)
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items }))

  return {
    summary: {
      total_items: items.length,
      movies: movies.length,
      episodes: Object.values(seriesMap).reduce((s, v) => s + v.episodes.length, 0),
      series_count: Object.keys(series).length,
      subtitles: subtitles.length,
      season_folders: seasonFolders.length,
      unrecognized: unrecognized.length,
      suspected_duplicates: suspected_duplicates.length,
    },
    movies,
    series,
    season_folders: seasonFolders,
    subtitles,
    suspected_duplicates,
    unrecognized,
  }
}

function confidenceLevel(parsed) {
  if (parsed.kind === 'unknown') return 'none'
  if (!parsed.title) return 'none'
  if (parsed.kind === 'movie' && parsed.year) return 'high'
  if (parsed.kind === 'movie') return 'medium'
  if (parsed.kind === 'episode' && parsed.year) return 'high'
  if (parsed.kind === 'episode') return 'medium'
  return 'low'
}

function jellyfinName(parsed, ext) {
  if (parsed.kind === 'movie') {
    return parsed.year ? `${parsed.title} (${parsed.year})${ext}` : `${parsed.title}${ext}`
  }
  if (parsed.kind === 'episode') {
    const ep = `S${pad2(parsed.season)}E${pad2(parsed.episode)}`
    const base = parsed.year ? `${parsed.title} (${parsed.year})` : parsed.title
    return `${base} - ${ep}${ext}`
  }
  return null
}

export function matchMediaItems(items) {
  return items.map((item) => {
    const fileId = item.fileId || item.file_id || ''
    const mediaType = detectMediaType(item)

    if (mediaType === 'other') {
      return { fileId, name: item.name, match: { type: 'other', confidence: 'none', reason: 'Not a media type.' } }
    }

    if (mediaType === 'folder') {
      const parsed = parseFolder(item)
      if (parsed.kind === 'season') {
        return { fileId, name: item.name, match: { type: 'season_folder', season: parsed.season, confidence: 'high', jellyfin_name: `Season ${pad2(parsed.season)}` } }
      }
      if (parsed.kind === 'series_folder') {
        const jName = parsed.year ? `${parsed.title} (${parsed.year})` : parsed.title
        return { fileId, name: item.name, match: { type: 'series_folder', title: parsed.title, year: parsed.year, confidence: parsed.year ? 'high' : 'medium', jellyfin_name: jName } }
      }
      return { fileId, name: item.name, match: { type: 'unknown', confidence: 'none', reason: 'Cannot determine folder type.' } }
    }

    if (mediaType === 'subtitle') {
      const ext = extname(item.name)
      const stem = item.name.slice(0, -ext.length)
      const epInfo = extractEpisodeInfo(stem)
      if (epInfo) {
        const season = epInfo.season ?? 1
        const ep = `S${pad2(season)}E${pad2(epInfo.episode)}`
        const stopIndex = findFirstEpisodeMatchIndex(stem)
        const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
        const jName = title ? `${title} - ${ep}${ext}` : `${ep}${ext}`
        return { fileId, name: item.name, match: { type: 'subtitle', season, episode: epInfo.episode, confidence: 'high', jellyfin_name: jName } }
      }
      return { fileId, name: item.name, match: { type: 'subtitle', confidence: 'low', reason: 'No episode info found.' } }
    }

    const ext = extname(item.name)
    const parsed = parseVideoItem(item)
    const confidence = confidenceLevel(parsed)
    const jName = jellyfinName(parsed, ext)

    if (parsed.kind === 'movie') {
      return { fileId, name: item.name, match: { type: 'movie', title: parsed.title, year: parsed.year, confidence, jellyfin_name: jName } }
    }
    if (parsed.kind === 'episode') {
      return { fileId, name: item.name, match: { type: 'episode', title: parsed.title, year: parsed.year, season: parsed.season, episode: parsed.episode, confidence, jellyfin_name: jName } }
    }
    return { fileId, name: item.name, match: { type: 'unknown', confidence: 'none', reason: 'Cannot identify as movie or episode.' } }
  })
}

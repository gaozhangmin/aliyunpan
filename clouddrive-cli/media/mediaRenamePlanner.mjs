import { extname } from 'node:path'
import {
  VIDEO_EXTENSIONS, SUBTITLE_EXTENSIONS, extractYear, extractEpisodeInfo,
  extractSeasonOnly, cleanTitle, findFirstEpisodeMatchIndex, yearStopIndex,
  detectMediaType, pad2,
} from './mediaUtils.mjs'

function planMovieRename(item) {
  const ext = extname(item.name)
  const stem = item.name.slice(0, -ext.length)
  const year = extractYear(stem)
  const episodeInfo = extractEpisodeInfo(stem)
  if (episodeInfo) return null

  const stopIndex = yearStopIndex(stem, year)
  const title = cleanTitle(stem, stopIndex)
  if (!title) {
    return { uncertain: true, reason: 'Could not extract a clean title from filename.' }
  }

  const newName = year ? `${title} (${year})${ext}` : `${title}${ext}`
  return { newName, year, title }
}

function planEpisodeRename(item) {
  const ext = extname(item.name)
  const stem = item.name.slice(0, -ext.length)
  const epInfo = extractEpisodeInfo(stem)
  if (!epInfo) return null

  const year = extractYear(stem)
  const episodePart = epInfo.season != null
    ? `S${pad2(epInfo.season)}E${pad2(epInfo.episode)}`
    : `S01E${pad2(epInfo.episode)}`

  const stopIndex = findFirstEpisodeMatchIndex(stem)
  const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
  if (!title) {
    return { uncertain: true, reason: 'Could not extract a clean series title from filename.' }
  }

  const base = year ? `${title} (${year})` : title
  const newName = `${base} - ${episodePart}${ext}`
  return { newName, title, year, season: epInfo.season ?? 1, episode: epInfo.episode }
}

function planFolderRename(item) {
  const name = item.name
  const year = extractYear(name)
  const season = extractSeasonOnly(name)

  if (season != null) {
    const newName = `Season ${pad2(season)}`
    return { newName, season, isSeason: true }
  }

  const stopIdx = yearStopIndex(name, year)
  const title = cleanTitle(name, stopIdx)
  if (!title) {
    return { uncertain: true, reason: 'Could not extract a clean folder title.' }
  }

  const newName = year ? `${title} (${year})` : title
  return { newName, title, year }
}

function planSubtitleRename(item, siblings) {
  const ext = extname(item.name)
  const stem = item.name.slice(0, -ext.length)
  const epInfo = extractEpisodeInfo(stem)
  if (!epInfo) return null

  const episodePart = epInfo.season != null
    ? `S${pad2(epInfo.season)}E${pad2(epInfo.episode)}`
    : `S01E${pad2(epInfo.episode)}`

  const videoSibling = (siblings || []).find((s) => {
    if (s.type !== 'file') return false
    const sExt = extname(s.name).toLowerCase()
    if (!VIDEO_EXTENSIONS.has(sExt)) return false
    const sEp = extractEpisodeInfo(s.name)
    return sEp && sEp.episode === epInfo.episode && (sEp.season ?? 1) === (epInfo.season ?? 1)
  })

  if (videoSibling) {
    const videoStem = videoSibling.name.slice(0, -extname(videoSibling.name).length)
    const newName = `${videoStem}${ext}`
    return { newName, matchedVideo: videoSibling.name }
  }

  const stopIndex = findFirstEpisodeMatchIndex(stem)
  const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
  if (!title) return { uncertain: true, reason: 'Could not extract subtitle title.' }

  const newName = `${title} - ${episodePart}${ext}`
  return { newName }
}

function buildReason(result, type, mediaType) {
  if (type === 'folder' && result.isSeason) return 'Normalized season folder to "Season XX" format.'
  if (type === 'folder') return `Normalized series/movie folder title${result.year ? ' with year' : ''}.`
  if (mediaType === 'video' && result.episode != null)
    return `Normalized episode filename to SxxExx format (S${pad2(result.season)}E${pad2(result.episode)}).`
  if (mediaType === 'video')
    return `Normalized movie filename${result.year ? ' with year' : ''}.`
  if (mediaType === 'subtitle' && result.matchedVideo)
    return `Matched subtitle to video file: ${result.matchedVideo}`
  return 'Normalized media filename.'
}

export function generateMediaRenamePlan(input) {
  const { provider, accountId, items, style = 'jellyfin' } = input

  if (!provider) throw new Error('provider is required')
  if (!accountId) throw new Error('accountId is required')
  if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array')

  const now = new Date().toISOString()
  const planItems = []
  const skipped = []
  const uncertain = []

  for (const item of items) {
    const fileId = item.fileId || item.file_id
    const parentFileId = item.parentFileId || item.parent_file_id
    const driveId = item.driveId || item.drive_id || ''
    const mediaType = detectMediaType(item)

    if (mediaType === 'other') {
      skipped.push({ fileId, name: item.name, reason: 'Not a recognized media file type.' })
      continue
    }

    let result = null

    if (item.type === 'folder') {
      result = planFolderRename(item)
    } else if (mediaType === 'video') {
      result = planEpisodeRename(item)
      if (!result) result = planMovieRename(item)
    } else if (mediaType === 'subtitle') {
      const siblings = items.filter(
        (s) => (s.parentFileId || s.parent_file_id) === parentFileId && s !== item
      )
      result = planSubtitleRename(item, siblings)
      if (!result) result = planEpisodeRename(item)
      if (!result) result = planMovieRename(item)
    }

    if (!result) {
      skipped.push({ fileId, name: item.name, reason: 'Could not determine media type or naming pattern.' })
      continue
    }

    if (result.uncertain) {
      uncertain.push({ fileId, name: item.name, reason: result.reason })
      continue
    }

    if (result.newName === item.name) {
      skipped.push({ fileId, name: item.name, reason: 'Name already matches target format.' })
      continue
    }

    planItems.push({
      drive_id: driveId,
      file_id: fileId,
      parent_file_id: parentFileId,
      old_name: item.name,
      new_name: result.newName,
      reason: buildReason(result, item.type, mediaType),
    })
  }

  return {
    version: 1,
    operation: 'rename',
    provider,
    account_id: accountId,
    created_at: now,
    style,
    items: planItems,
    skipped,
    uncertain,
  }
}

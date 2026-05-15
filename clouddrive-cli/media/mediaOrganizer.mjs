import { extractYear, extractEpisodeInfo, extractSeasonOnly, cleanTitle,
  findFirstEpisodeMatchIndex, yearStopIndex, detectMediaType, pad2 } from './mediaUtils.mjs'
import { generateMediaRenamePlan } from './mediaRenamePlanner.mjs'
import { extname } from 'node:path'

function parseVideoKind(name) {
  const ext = extname(name)
  const stem = name.slice(0, -ext.length)
  const epInfo = extractEpisodeInfo(stem)
  const year = extractYear(stem)
  if (epInfo) {
    const season = epInfo.season ?? 1
    const stopIndex = findFirstEpisodeMatchIndex(stem)
    const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
    return { kind: 'episode', title: title || name, year, season, episode: epInfo.episode }
  }
  const stopIndex = yearStopIndex(stem, year)
  const title = cleanTitle(stem, stopIndex)
  if (title) return { kind: 'movie', title, year }
  return { kind: 'unknown' }
}

function parseFolderKind(name) {
  const season = extractSeasonOnly(name)
  if (season != null) return { kind: 'season', season }
  const year = extractYear(name)
  const stopIndex = yearStopIndex(name, year)
  const title = cleanTitle(name, stopIndex)
  if (title) return { kind: 'series', title, year }
  return { kind: 'unknown' }
}

function jellyfinMovieDir(title, year) {
  return year ? `${title} (${year})` : title
}

function jellyfinSeriesDir(title, year) {
  return year ? `${title} (${year})` : title
}

function jellyfinSeasonDir(season) {
  return `Season ${pad2(season)}`
}

export function generateOrganizePlan({ provider, accountId, items, style = 'jellyfin', rootFileId = 'root', driveId = '' }) {
  if (!provider) throw new Error('provider is required')
  if (!accountId) throw new Error('accountId is required')
  if (!Array.isArray(items) || items.length === 0) throw new Error('items must be a non-empty array')

  const now = new Date().toISOString()
  const renamePlan = generateMediaRenamePlan({ provider, accountId, items, style })
  const renameMap = {}
  for (const r of renamePlan.items) renameMap[r.file_id] = r.new_name

  const mkdirsSet = new Map()
  const moves = []
  const skipped = [...renamePlan.skipped]
  const uncertain = [...renamePlan.uncertain]

  const moviesTopPath = 'Movies'
  const tvTopPath = 'TV Shows'

  function ensureDir(path, parentFileId, parentPath, step) {
    if (!mkdirsSet.has(path)) mkdirsSet.set(path, { path, parent_file_id: parentFileId || null, parent_path: parentPath || null, step })
  }

  for (const item of items) {
    const fileId = item.fileId || item.file_id || ''
    const parentFileId = item.parentFileId || item.parent_file_id || ''
    const itemDriveId = item.driveId || item.drive_id || driveId
    const mediaType = detectMediaType(item)

    if (mediaType === 'other' || mediaType === 'folder') continue
    if (mediaType === 'subtitle') continue // subtitles move with their parent video

    const finalName = renameMap[fileId] || item.name
    const ext = extname(item.name)

    if (mediaType === 'video') {
      const parsed = parseVideoKind(item.name)

      if (parsed.kind === 'movie') {
        const movieDir = jellyfinMovieDir(parsed.title, parsed.year)
        ensureDir(moviesTopPath, rootFileId, null, 1)
        ensureDir(`${moviesTopPath}/${movieDir}`, null, moviesTopPath, 2)
        moves.push({
          drive_id: itemDriveId,
          file_id: fileId,
          name: finalName,
          type: 'file',
          from_parent_file_id: parentFileId,
          to_path: `${moviesTopPath}/${movieDir}`,
        })
      } else if (parsed.kind === 'episode') {
        const seriesDir = jellyfinSeriesDir(parsed.title, parsed.year)
        const seasonDir = jellyfinSeasonDir(parsed.season)
        ensureDir(tvTopPath, rootFileId, null, 1)
        ensureDir(`${tvTopPath}/${seriesDir}`, null, tvTopPath, 2)
        ensureDir(`${tvTopPath}/${seriesDir}/${seasonDir}`, null, `${tvTopPath}/${seriesDir}`, 3)
        moves.push({
          drive_id: itemDriveId,
          file_id: fileId,
          name: finalName,
          type: 'file',
          from_parent_file_id: parentFileId,
          to_path: `${tvTopPath}/${seriesDir}/${seasonDir}`,
        })
      }
    }
  }

  // move subtitles alongside their video siblings
  for (const item of items) {
    const fileId = item.fileId || item.file_id || ''
    const parentFileId = item.parentFileId || item.parent_file_id || ''
    const itemDriveId = item.driveId || item.drive_id || driveId
    if (detectMediaType(item) !== 'subtitle') continue

    const ext = extname(item.name)
    const stem = item.name.slice(0, -ext.length)
    const epInfo = extractEpisodeInfo(stem)
    const finalName = renameMap[fileId] || item.name

    if (epInfo) {
      const season = epInfo.season ?? 1
      const year = extractYear(stem)
      const stopIndex = findFirstEpisodeMatchIndex(stem)
      const title = cleanTitle(stem, stopIndex >= 0 ? stopIndex : null)
      if (title) {
        const seriesDir = jellyfinSeriesDir(title, year)
        const seasonDir = jellyfinSeasonDir(season)
        moves.push({
          drive_id: itemDriveId,
          file_id: fileId,
          name: finalName,
          type: 'file',
          from_parent_file_id: parentFileId,
          to_path: `${tvTopPath}/${seriesDir}/${seasonDir}`,
        })
      }
    }
  }

  const mkdirs = [...mkdirsSet.values()].sort((a, b) => a.step - b.step || a.path.localeCompare(b.path))

  const movieCount = moves.filter((m) => m.to_path.startsWith(moviesTopPath)).length
  const episodeCount = moves.filter((m) => m.to_path.startsWith(tvTopPath)).length
  const seriesSet = new Set(moves.filter((m) => m.to_path.startsWith(tvTopPath)).map((m) => m.to_path.split('/').slice(0, 2).join('/')))

  return {
    version: 1,
    operation: 'organize',
    provider,
    account_id: accountId,
    style,
    root_file_id: rootFileId,
    drive_id: driveId,
    created_at: now,
    summary: {
      movies: movieCount,
      series: seriesSet.size,
      episodes: episodeCount,
      new_dirs: mkdirs.length,
      renames: renamePlan.items.length,
      moves: moves.length,
    },
    mkdirs,
    renames: renamePlan.items,
    moves,
    skipped,
    uncertain,
  }
}

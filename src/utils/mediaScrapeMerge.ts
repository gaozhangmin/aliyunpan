import type { MediaLibraryItem } from '../types/media'
import { mergeDriveFileSources } from './mediaSourceMembership'
import { preserveManualMediaMetadata } from './mediaMetadataEditor'

export function scrapedMediaId(type: 'movie' | 'tv', tmdbId: number | string): string {
  return `${type}_${tmdbId}`
}

/** Merge a partial scrape with the canonical record, including uncached seasons. */
export function mergeScrapedMedia(existing: MediaLibraryItem, incoming: MediaLibraryItem): MediaLibraryItem {
  if (existing.type !== incoming.type || (existing.tmdbId && incoming.tmdbId && !existing.collectionId && existing.tmdbId !== incoming.tmdbId)) {
    throw new Error(`媒体身份冲突，拒绝覆盖 ${existing.id}`)
  }
  // Old records predate sourceFolderIds. Materialize their original membership
  // before merging a file found through a different source.
  if (existing.folderId) existing = associateScrapedFiles(existing, [], existing.folderId)
  if (incoming.folderId) incoming = associateScrapedFiles(incoming, [], incoming.folderId)
  const seasons = new Map((existing.seasons || []).map(season => [season.seasonNumber, season]))
  for (const season of incoming.seasons || []) {
    const previous = seasons.get(season.seasonNumber)
    const episodes = new Map((previous?.episodes || []).map(episode => [episode.episodeNumber, episode]))
    for (const episode of season.episodes || []) {
      const current = episodes.get(episode.episodeNumber)
      episodes.set(episode.episodeNumber, { ...current, ...episode, driveFiles: mergeDriveFileSources([...(current?.driveFiles || []), ...(episode.driveFiles || [])]) })
    }
    seasons.set(season.seasonNumber, { ...previous, ...season, episodeCount: Math.max(previous?.episodeCount || 0, season.episodeCount || 0), episodes: [...episodes.values()].sort((a, b) => a.episodeNumber - b.episodeNumber) })
  }
  const movies = new Map((existing.collectionMovies || []).map(movie => [movie.tmdbId || movie.id, movie]))
  for (const movie of incoming.collectionMovies || []) {
    const key = movie.tmdbId || movie.id
    const current = movies.get(key)
    movies.set(key, { ...current, ...movie, id: current?.id || movie.id, driveFiles: mergeDriveFileSources([...(current?.driveFiles || []), ...(movie.driveFiles || [])]) })
  }
  const expected = new Map((existing.expectedSeasons || []).map(season => [season.seasonNumber, season]))
  for (const season of incoming.expectedSeasons || []) {
    const current = expected.get(season.seasonNumber)
    expected.set(season.seasonNumber, { ...current, ...season, episodes: season.episodes?.length ? season.episodes : current?.episodes })
  }
  return preserveManualMediaMetadata(existing, {
    ...existing,
    ...incoming,
    certification: incoming.certification || existing.certification,
    networks: incoming.networks?.length ? incoming.networks : existing.networks,
    id: existing.id,
    folderId: existing.folderId || incoming.folderId,
    driveFiles: mergeDriveFileSources([...(existing.driveFiles || []), ...(incoming.driveFiles || [])]),
    seasons: seasons.size ? [...seasons.values()].sort((a, b) => a.seasonNumber - b.seasonNumber) : undefined,
    collectionMovies: movies.size ? [...movies.values()].sort((a, b) => Number(a.year || 0) - Number(b.year || 0)) : undefined,
    expectedSeasons: expected.size ? [...expected.values()].sort((a, b) => a.seasonNumber - b.seasonNumber) : undefined
  })
}

export function associateScrapedFiles(item: MediaLibraryItem, files: MediaLibraryItem['driveFiles'], folderId: string): MediaLibraryItem {
  const attach = (current: MediaLibraryItem['driveFiles'] = []) => mergeDriveFileSources([...current.map(file => ({ ...file, sourceFolderIds: file.sourceFolderIds?.length ? file.sourceFolderIds : item.folderId ? [item.folderId] : [] })), ...files.filter(file => current.some(existing => existing.id === file.id && existing.userId === file.userId && existing.driveId === file.driveId && existing.driveServerId === file.driveServerId)).map(file => ({ ...file, sourceFolderIds: [folderId] }))])
  return { ...item, driveFiles: attach(item.driveFiles), seasons: item.seasons?.map(season => ({ ...season, episodes: season.episodes?.map(episode => ({ ...episode, driveFiles: attach(episode.driveFiles) })) })), collectionMovies: item.collectionMovies?.map(movie => ({ ...movie, driveFiles: attach(movie.driveFiles) })) }
}

import type { MediaLibraryItem, MediaEpisode } from '../types/media'
import { detailSeriesId } from './detailResume'

export function detailCollectionTarget(item: MediaLibraryItem, episode?: Pick<MediaEpisode, 'seasonNumber' | 'episodeNumber' | 'name'> | null) {
  if (item.type === 'tv') {
    if (!episode) return null
    return { id: `${detailSeriesId(item.id)}_${episode.seasonNumber}_${episode.episodeNumber}`, title: `${item.name} · S${episode.seasonNumber}E${episode.episodeNumber} ${episode.name}`.trim() }
  }
  return { id: item.id, title: item.name }
}

export function playlistEntryIds(item: MediaLibraryItem): string[] {
  if (item.type === 'tv') {
    const seasons = [...(item.seasons || [])].sort((a, b) => a.seasonNumber - b.seasonNumber)
    return seasons.flatMap(season => [...(season.episodes || [])]
      .filter(episode => episode.driveFiles?.length)
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .map(episode => `${detailSeriesId(item.id)}_${season.seasonNumber}_${episode.episodeNumber}`))
  }
  if (item.collectionMovies?.length) return item.collectionMovies.map(movie => movie.id)
  return [item.id]
}

export function playlistSelection(playlists: Record<string, string[]>, itemId: string): string[] {
  return Object.keys(playlists).filter(name => playlists[name].includes(itemId))
}

export function applyPlaylistSelection(playlists: Record<string, string[]>, itemId: string, selected: string[], expandedIds: string[] = [itemId]): Record<string, string[]> {
  if (!itemId) return playlists
  const included = new Set(selected)
  const additions = [...new Set(expandedIds)]
  const removed = new Set([itemId, ...additions])
  return Object.fromEntries(Object.entries(playlists).map(([name, ids]) => [name,
    included.has(name) ? [...new Set([...ids, ...additions])] : ids.filter(id => !removed.has(id))]))
}

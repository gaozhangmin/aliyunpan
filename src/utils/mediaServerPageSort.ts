import type { MediaServerBrowseSort, MediaServerSortDirection } from './mediaServerBrowseSort'

export interface MediaServerPageSort {
  sort?: MediaServerBrowseSort
  direction?: MediaServerSortDirection
}

// Keep pagination over one stable ordered result set. Randomizing each server
// request would duplicate/skip items, so shuffle presentation separately.
export function serverPageOrder(options: MediaServerPageSort = {}, fallback = 'SortName'): string {
  const fields: Record<MediaServerBrowseSort, string> = {
    title: 'Name', sortName: 'SortName', premiereDate: 'PremiereDate', createdAt: 'DateCreated',
    addedAt: 'DateCreated', rating: 'CommunityRating', criticRating: 'CriticRating',
    runtimeMinutes: 'Runtime', year: 'ProductionYear', playCount: 'PlayCount', random: 'SortName',
    videoBitrate: 'VideoBitRate', airTime: 'AirTime', studio: 'Studio', artist: 'Artist',
    officialRating: 'OfficialRating', seriesTitle: 'SeriesSortName', seriesDatePlayed: 'SeriesDatePlayed', airOrder: 'AiredEpisodeOrder'
  }
  const field = options.sort ? fields[options.sort] : fallback
  const order = options.direction === 'descending' || (!options.direction && fallback === 'DateCreated') ? 'Descending' : 'Ascending'
  return new URLSearchParams({ SortBy: field === 'SortName' ? field : `${field},SortName`, SortOrder: order }).toString()
}

export function plexPageOrder(options: MediaServerPageSort = {}, fallback = 'titleSort:asc'): string {
  if (!options.sort) return fallback
  const fields: Partial<Record<MediaServerBrowseSort, string>> = {
    title: 'titleSort', sortName: 'titleSort', premiereDate: 'originallyAvailableAt', createdAt: 'addedAt', addedAt: 'addedAt',
    rating: 'rating', criticRating: 'audienceRating', runtimeMinutes: 'duration', year: 'year', playCount: 'viewCount',
    studio: 'studio.titleSort', officialRating: 'contentRating', seriesDatePlayed: 'lastViewedAt'
  }
  return `${fields[options.sort] || 'titleSort'}:${options.direction === 'descending' ? 'desc' : 'asc'}`
}

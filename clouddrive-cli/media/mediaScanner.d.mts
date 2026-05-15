import type { MediaFileItem } from './mediaRenamePlanner.mjs'

export interface MediaScanMovie {
  fileId: string
  name: string
  title: string
  year: number | null
}

export interface MediaScanEpisode {
  fileId: string
  name: string
  season: number
  episode: number
}

export interface MediaScanSeries {
  title: string
  year: number | null
  folderFileId: string | null
  seasons: number[]
  episode_count: number
  episodes: MediaScanEpisode[]
}

export interface MediaScanSubtitle {
  fileId: string
  name: string
  parentFileId: string
}

export interface MediaScanDuplicate {
  key: string
  items: Array<{ fileId: string; name: string }>
}

export interface MediaScanUnrecognized {
  fileId: string
  name: string
  reason: string
}

export interface MediaScanReport {
  summary: {
    total_items: number
    movies: number
    episodes: number
    series_count: number
    subtitles: number
    season_folders: number
    unrecognized: number
    suspected_duplicates: number
  }
  movies: MediaScanMovie[]
  series: Record<string, MediaScanSeries>
  season_folders: Array<{ fileId: string; name: string; season: number }>
  subtitles: MediaScanSubtitle[]
  suspected_duplicates: MediaScanDuplicate[]
  unrecognized: MediaScanUnrecognized[]
}

export interface MediaMatch {
  type: 'movie' | 'episode' | 'subtitle' | 'series_folder' | 'season_folder' | 'unknown' | 'other'
  title?: string
  year?: number | null
  season?: number
  episode?: number
  confidence: 'high' | 'medium' | 'low' | 'none'
  jellyfin_name?: string | null
  reason?: string
}

export interface MediaMatchResult {
  fileId: string
  name: string
  match: MediaMatch
}

export function scanMediaItems(items: MediaFileItem[]): MediaScanReport
export function matchMediaItems(items: MediaFileItem[]): MediaMatchResult[]

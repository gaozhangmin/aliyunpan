import { describe, expect, it, vi } from 'vitest'
import { refreshMediaMetadata } from '../mediaMetadataRefresh'
import { TmdbService } from '../tmdb'
import type { MediaLibraryItem } from '../../types/media'
const item: MediaLibraryItem = { id: 'movie_1', parentId: 'folder', folderId: 'source', type: 'movie', name: 'Old', tmdbId: 1, genres: [], driveFiles: [], addedAt: new Date(), watchProgress: 42 }
describe('metadata-only refresh', () => {
 it('updates by ID while retaining local identity and playback', async () => {
  const service = new TmdbService()
  vi.spyOn(service, 'getMovieByTmdbId').mockResolvedValue({ id: 1, title: 'New', original_title: '', original_language: '', overview: 'Updated', vote_average: 8, credits: {} } as any)
  const result = await refreshMediaMetadata(item, service)
  expect(service.getMovieByTmdbId).toHaveBeenCalledWith(1)
  expect(result).toMatchObject({ id: item.id, name: 'New', folderId: 'source', watchProgress: 42 })
  expect(result.driveFiles).toBe(item.driveFiles)
 })
 it('leaves unmatched items untouched and rejects mismatched identities', async () => {
  const service = new TmdbService()
  const request = vi.spyOn(service, 'getMovieByTmdbId').mockResolvedValue({ id: 2 } as any)
  const unmatched = { ...item, tmdbId: undefined, type: 'unmatched' as const }
  expect(await refreshMediaMetadata(unmatched, service)).toBe(unmatched)
  expect(request).not.toHaveBeenCalled()
  await expect(refreshMediaMetadata(item, service)).rejects.toThrow('TMDB')
 })
 it('refreshes existing episodes without replacing files or adding unseen episodes', async () => {
  const service = new TmdbService()
  vi.spyOn(service, 'getTvByTmdbId').mockResolvedValue({ tv: { id: 1, name: 'Show', networks: [{ id: 213, name: 'Netflix' }] }, current_season: { season_number: 2, name: 'Season 2', episodes: [{ episode_number: 3, name: 'Updated episode' }, { episode_number: 4, name: 'Not local' }] } } as any)
  const tv = { ...item, type: 'tv' as const, seasons: [{ id: 20, seasonNumber: 2, name: 'Old season', episodeCount: 1, episodes: [{ id: 30, seasonNumber: 2, episodeNumber: 3, name: 'Old episode', driveFiles: [] }] }] }
  const result = await refreshMediaMetadata(tv, service)
  expect(result.seasons?.[0].episodes).toHaveLength(1)
  expect(result.seasons?.[0].episodes?.[0]).toMatchObject({ id: 30, name: 'Updated episode' })
  expect(result.seasons?.[0].episodes?.[0].driveFiles).toBe(tv.seasons[0].episodes[0].driveFiles)
 })
})

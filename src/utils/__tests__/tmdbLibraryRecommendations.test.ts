import { describe, expect, it } from 'vitest'
import { matchDailyLibraryRanking, matchLibraryRanking, fetchRankingPages } from '../tmdbLibraryRecommendations'
import type { MediaLibraryItem } from '../../types/media'
const movie = (id: string, tmdbId: number, rating = 10) => ({ id, tmdbId, rating, type: 'movie' } as MediaLibraryItem)
describe('TMDB library recommendations', () => {
  it('requires returned IDs, not high local scores, titles or colliding TV IDs', () => {
    const items = [movie('high-but-absent', 2), movie('ranked', 1, 4), { ...movie('tv', 1), type: 'tv' } as MediaLibraryItem, { ...movie('filename', 0), type: 'unmatched' } as MediaLibraryItem]
    expect(matchLibraryRanking(items, [{ id: 1, type: 'movie' }]).map(x => x.id)).toEqual(['ranked'])
  })
  it('keeps rank order and matches TV and movies separately', () => {
    const items = [movie('movie', 1), { ...movie('tv', 1), type: 'tv' } as MediaLibraryItem]
    expect(matchLibraryRanking(items, [{ id: 1, type: 'tv' }, { id: 1, type: 'movie' }]).map(x => x.id)).toEqual(['tv', 'movie'])
  })
  it('matches grouped collections through members and preserves stored grouping', () => {
    const group = { ...movie('collection', 999), collectionMovies: [movie('member', 5)] } as MediaLibraryItem
    expect(matchLibraryRanking([group], [{ id: 5, type: 'movie' }])).toEqual([group])
    expect(matchLibraryRanking([movie('member', 5), movie('other', 6)], [{ id: 5, type: 'movie' }]).map(x => x.id)).toEqual(['member'])
  })
  it('returns empty for an empty ranking without fallback', () => expect(matchLibraryRanking([movie('high', 5)], [])).toEqual([]))
  it('fills daily picks from a stable rotation when the chart has no local matches', () => {
    const library = [movie('a', 1), movie('b', 2), movie('c', 3)]
    const day = new Date('2026-10-17T00:00:00Z')
    expect(matchDailyLibraryRanking(library, [{ id: 99, type: 'movie' }], day)).toHaveLength(3)
    expect(matchDailyLibraryRanking(library, [{ id: 99, type: 'movie' }], day).map(item => item.id))
      .toEqual(matchDailyLibraryRanking(library, [], day).map(item => item.id))
  })
  it('paginates the actual list, bounds requests, and deduplicates IDs', async () => {
    const urls: string[] = []
    const result = await fetchRankingPages('https://example.test', '/movie/top_rated', 'movie', async url => { urls.push(url); return new Response(JSON.stringify({ results: [{ id: 5 }, { id: urls.length }], total_pages: 20 })) }, 2)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('/movie/top_rated?language=zh-CN&page=1')
    expect(result.map(x => x.id)).toEqual([5, 1, 2])
  })
  it('reports failed responses rather than using local ratings', async () => {
    await expect(fetchRankingPages('', '/trending/movie/day', 'movie', async () => new Response('{}', { status: 503 }))).rejects.toThrow()
    await expect(fetchRankingPages('', '/trending/tv/day', 'tv', async () => new Response('{}'))).rejects.toThrow()
  })
})

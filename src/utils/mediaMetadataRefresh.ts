import type { MediaLibraryItem } from '../types/media'
import { TmdbService, tmdbImageUrl } from './tmdb'

/** Refresh online fields by identity; never rediscover files or change local membership. */
export async function refreshMediaMetadata(item: MediaLibraryItem, service = new TmdbService()): Promise<MediaLibraryItem> {
  if (item.collectionMovies?.length) {
    const collectionMovies = []
    for (const movie of item.collectionMovies) collectionMovies.push({ ...await refreshMediaMetadata(movie, service), type: 'movie' as const })
    return { ...item, collectionMovies }
  }
  if (!item.tmdbId || item.type === 'unmatched') return item
  if (item.type === 'movie') {
    const data = await service.getMovieByTmdbId(item.tmdbId)
    if (!data || Number(data.id) !== item.tmdbId) throw new Error(`TMDB: ${item.name}`)
    return { ...item, name: data.title || item.name, overview: data.overview ?? item.overview,
      posterUrl: tmdbImageUrl(data.poster_path) || item.posterUrl, backdropUrl: tmdbImageUrl(data.backdrop_path) || item.backdropUrl,
      logoUrl: tmdbImageUrl(data.logo_path) || item.logoUrl, releaseDate: data.release_date ?? item.releaseDate,
      year: data.release_date?.slice(0, 4) || item.year, rating: data.vote_average ?? item.rating,
      certification: data.certification || item.certification, genres: data.genres?.map(value => value.name) ?? item.genres,
      credits: data.credits ?? item.credits, productionCountries: data.production_countries?.map(value => value.name) ?? item.productionCountries,
      imdbId: data.imdb_id || item.imdbId, metadataSource: 'tmdb', metadataUpdatedAt: Date.now() }
  }
  const seasons = []
  let result = item
  for (const season of item.seasons?.length ? item.seasons : [undefined]) {
    const data = await service.getTvByTmdbId(item.tmdbId, season?.seasonNumber ?? 1)
    if (!data || Number(data.tv.id) !== item.tmdbId) throw new Error(`TMDB: ${item.name}`)
    const tv = data.tv
    result = { ...result, name: tv.name || item.name, overview: tv.overview ?? item.overview,
      posterUrl: tmdbImageUrl(tv.poster_path) || item.posterUrl, backdropUrl: tmdbImageUrl(tv.backdrop_path) || item.backdropUrl,
      logoUrl: tmdbImageUrl(tv.logo_path) || item.logoUrl, releaseDate: tv.first_air_date ?? item.releaseDate,
      year: tv.first_air_date?.slice(0, 4) || item.year, rating: tv.vote_average ?? item.rating,
      certification: tv.certification || item.certification, genres: tv.genres?.map(value => value.name) ?? item.genres,
      networks: tv.networks?.length ? tv.networks : item.networks, credits: tv.credits ?? item.credits,
      productionCountries: tv.production_countries?.map(value => value.name) ?? item.productionCountries,
      metadataSource: 'tmdb', metadataUpdatedAt: Date.now() }
    if (!season) continue
    const fresh = data.current_season
    if (!fresh || fresh.season_number !== season.seasonNumber) throw new Error(`TMDB: ${item.name} S${season.seasonNumber}`)
    seasons.push({ ...season, name: fresh.name || season.name, overview: fresh.overview ?? season.overview,
      posterPath: fresh.poster_path || season.posterPath, airDate: fresh.air_date ?? season.airDate,
      credits: fresh.credits ?? season.credits, metadataSource: 'tmdb' as const, metadataUpdatedAt: Date.now(),
      episodes: season.episodes?.map(episode => {
        const online = fresh.episodes?.find(value => value.episode_number === episode.episodeNumber)
        return online ? { ...episode, name: online.name || episode.name, overview: online.overview ?? episode.overview,
          rating: online.vote_average ?? episode.rating, stillPath: tmdbImageUrl(online.still_path) || episode.stillPath,
          airDate: online.air_date ?? episode.airDate, runtime: online.runtime ?? episode.runtime, crew: online.crew ?? episode.crew,
          metadataSource: 'tmdb' as const, metadataUpdatedAt: Date.now() } : episode
      }) })
  }
  return { ...result, seasons: item.seasons ? seasons : undefined }
}

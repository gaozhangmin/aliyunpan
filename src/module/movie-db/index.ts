import axios, { AxiosRequestConfig } from 'axios'
import { isObject, isString, merge, omit } from 'lodash'
import { HttpMethod, RequestParams } from './types'
import {
  AccountInfoResponse,
  AccountListsResponse,
  AccountMediaRequest,
  AccountWatchlistRequest,
  AggregateCreditsResponse,
  CertificationsResponse,
  ChangesRequest,
  ChangesResponse,
  ClearListParams,
  CollectionImagesResponse,
  CollectionInfoResponse,
  CollectionRequest,
  CollectionTranslationsResponse,
  Company,
  CompanyAlternativeNamesResponse,
  CompanyImagesResponse,
  ConfigurationResponse,
  CountriesResponse,
  CreateListItemParams,
  CreateListParams,
  CreateListResponse,
  CreditDetailsResponse,
  CreditsResponse,
  DiscoverMovieRequest,
  DiscoverMovieResponse,
  DiscoverTvRequest,
  DiscoverTvResponse,
  Episode,
  EpisodeAccountStatesResponse,
  EpisodeChangesResponse,
  EpisodeCreditsResponse,
  EpisodeExternalIdsResponse,
  EpisodeGroupResponse,
  EpisodeImagesResponse,
  EpisodeRatingRequest,
  EpisodeRequest,
  EpisodeResultsResponse,
  EpisodeTranslationsResponse,
  EpisodeVideosResponse,
  FindRequest,
  FindResponse,
  GenresResponse,
  IdAppendToResponseRequest,
  IdPagedRequestParams,
  IdRequestParams,
  Job,
  KeywordMoviesParams,
  KeywordResponse,
  Language,
  ListsDetailResponse,
  ListsStatusResponse,
  MarkAsFavoriteRequest,
  MovieAccountStateResponse,
  MovieAlternativeTitlesRequest,
  MovieAlternativeTitlesResponse,
  MovieChangesResponse,
  MovieExternalIdsResponse,
  MovieImagesRequest,
  MovieImagesResponse,
  MovieKeywordResponse,
  MovieListsRequest,
  MovieListsResponse,
  MovieNowPlayingRequest,
  MovieNowPlayingResponse,
  MovieRecommendationsRequest,
  MovieRecommendationsResponse,
  MovieReleaseDatesResponse,
  MovieResponse,
  MovieResultsResponse,
  MovieReviewsRequest,
  MovieReviewsResponse,
  MovieTranslationsResponse,
  NetworkResponse,
  PagedRequestParams,
  Person,
  PersonChangesResponse,
  PersonCombinedCreditsResponse,
  PersonExternalIdsResponse,
  PersonImagesResponse,
  PersonMovieCreditsResponse,
  PersonPopularResponse,
  PersonTaggedImagesResponse,
  PersonTranslationsResponse,
  PersonTvCreditsResponse,
  PopularMoviesRequest,
  PopularMoviesResponse,
  PostResponse,
  RatingRequest,
  Review,
  SearchCollectionResponse,
  SearchCompanyResponse,
  SearchKeywordResponse,
  SearchMovieRequest,
  SearchMultiRequest,
  SearchMultiResponse,
  SearchPersonResponse,
  SearchRequest,
  SearchTvRequest,
  ShowAccountStatesResponse,
  ShowAlternativeTitlesResponse,
  ShowChangesResponse,
  ShowContentRatingResponse,
  ShowResponse,
  SimilarMovieResponse,
  Timezone,
  TopRatedMoviesRequest,
  TopRatedMoviesResponse,
  TrendingRequest,
  TrendingResponse,
  TvAggregateCreditsRequest,
  TvEpisodeGroupsResponse,
  TvExternalIdsResponse,
  TvImagesResponse,
  TvKeywordsResponse,
  TvResultsResponse,
  TvReviewsResponse,
  TvScreenTheatricallyResponse,
  TvSeasonAccountStatesResponse,
  TvSeasonChangesResponse,
  TvSeasonExternalIdsResponse,
  TvSeasonImagesResponse,
  TvSeasonRequest,
  TvSeasonResponse,
  TvSimilarShowsResponse,
  TvTranslationsResponse,
  UpcomingMoviesRequest,
  UpcomingMoviesResponse,
  VideosResponse,
  WatchProviderListResponse,
  WatchProviderResponse,
  WatchProvidersParams
} from './request-types'

const PromiseThrottle = require('promise-throttle')

class MovieDb {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly language: string
  private token: any
  private queue: any
  private sessionId: string | undefined

  constructor(apiKey: string,
              baseUrl: string = 'https://api.themoviedb.org/3/',
              language: string = 'zh_CN',
              requestsPerSecondLimit: number = 50) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.language = language
    this.queue = new PromiseThrottle({
      requestsPerSecond: requestsPerSecondLimit,
      promiseImplementation: Promise
    })
  }

  /**
   * Gets an api token using an api key
   *
   * @returns {Promise}
   */
  async requestToken(): Promise<any> {
    if (!this.token || Date.now() > new Date(this.token.expires_at).getTime()) {
      this.token = await this.makeRequest(HttpMethod.Get, 'authentication/token/new')
    }
    return this.token
  }

  /**
   * Gets the session id
   */
  async retrieveSession() {
    const token = await this.requestToken()
    const request = {
      request_token: token.request_token
    }
    const res = await this.makeRequest(HttpMethod.Get, 'authentication/session/new', request)
    this.sessionId = res.session_id
    return this.sessionId
  }

  /**
   * Compiles the data/query data to send with the request
   */
  private getParams(endpoint: string, params: any = {}) {
    // Merge default parameters with the ones passed in
    const compiledParams: any = merge({
      api_key: this.apiKey,
      ...(this.language && { language: this.language }),
      ...(this.sessionId && { session_id: this.sessionId })
    }, params)
    // Some endpoints have an optional account_id parameter (when there's a session).
    // If it's not included, assume we want the current user's id,
    // which is setting it to '{account_id}'
    if (endpoint.includes(':id') && !compiledParams.id && this.sessionId) {
      compiledParams.id = '{account_id}'
    }
    return compiledParams
  }

  /**
   * Compiles the endpoint based on the params
   */
  private getEndpoint(endpoint: string, params: any = {}) {
    return Object.keys(params).reduce((compiled, key) => {
      return compiled.replace(`:${key}`, params[key])
    }, endpoint)
  }

  /**
   * Normalizes a request into a RequestParams object
   */
  private normalizeParams(endpoint: string, params: any = {}) {
    if (isObject(params)) {
      return params
    }
    const matches = endpoint.match(/:[a-z]*/g) || []
    if (matches.length === 1) {
      return matches.reduce((obj: any, match: string) => {
        obj[match.slice(1)] = params
        return obj
      })
    }
    return {}
  }

  private parseSearchParams(params: any) {
    if (isString(params)) {
      return { query: params }
    }
    return params
  }

  /**
   * Performs the request to the server
   */
  private makeRequest(method: string, endpoint: string, params: any = {}, axiosConfig: AxiosRequestConfig = {}) {
    const normalizedParams = this.normalizeParams(endpoint, params)
    // Get the full query/data object
    const fullQuery = this.getParams(endpoint, normalizedParams)
    // Get the params that are needed for the endpoint
    // to remove from the data/params of the request
    const omittedProps = [...(endpoint.match(/:[a-z]*/gi) ?? [])].map((prop) => prop.slice(1))
    // Prepare the query
    const query = omit(fullQuery, omittedProps)
    const request: any = {
      method,
      url: this.baseUrl + this.getEndpoint(endpoint, fullQuery),
      ...(method === HttpMethod.Get && { params: query }),
      ...(method !== HttpMethod.Get && { data: query }),
      ...axiosConfig
    }
    return this.queue.add(async () => (await axios.request(request)).data)
  }

  configuration(axiosConfig?: AxiosRequestConfig): Promise<ConfigurationResponse> {
    return this.makeRequest(HttpMethod.Get, 'configuration', null, axiosConfig)
  }

  countries(axiosConfig?: AxiosRequestConfig): Promise<CountriesResponse> {
    return this.makeRequest(HttpMethod.Get, 'configuration/countries', null, axiosConfig)
  }

  jobs(axiosConfig?: AxiosRequestConfig): Promise<Array<Job>> {
    return this.makeRequest(HttpMethod.Get, 'configuration/jobs', null, axiosConfig)
  }

  languages(axiosConfig?: AxiosRequestConfig): Promise<Array<Language>> {
    return this.makeRequest(HttpMethod.Get, 'configuration/languages', null, axiosConfig)
  }

  primaryTranslations(axiosConfig?: AxiosRequestConfig): Promise<Array<string>> {
    return this.makeRequest(HttpMethod.Get, 'configuration/primary_translations', null, axiosConfig)
  }

  timezones(axiosConfig?: AxiosRequestConfig): Promise<Array<Timezone>> {
    return this.makeRequest(HttpMethod.Get, 'configuration/timezones', null, axiosConfig)
  }

  find(params?: FindRequest, axiosConfig?: AxiosRequestConfig): Promise<FindResponse> {
    return this.makeRequest(HttpMethod.Get, 'find/:id', params, axiosConfig)
  }

  searchCompany(params: string | SearchRequest, axiosConfig?: AxiosRequestConfig): Promise<SearchCompanyResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/company', this.parseSearchParams(params), axiosConfig)
  }

  searchCollection(params: SearchRequest, axiosConfig?: AxiosRequestConfig): Promise<SearchCollectionResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/collection', this.parseSearchParams(params), axiosConfig)
  }

  searchKeyword(params: SearchRequest, axiosConfig?: AxiosRequestConfig): Promise<SearchKeywordResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/keyword', this.parseSearchParams(params), axiosConfig)

  }

  searchMovie(params: SearchMovieRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/movie', this.parseSearchParams(params), axiosConfig)
  }

  searchMulti(params: SearchMultiRequest, axiosConfig?: AxiosRequestConfig): Promise<SearchMultiResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/multi', this.parseSearchParams(params), axiosConfig)
  }

  searchPerson(params: SearchMultiRequest, axiosConfig?: AxiosRequestConfig): Promise<SearchPersonResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/person', this.parseSearchParams(params), axiosConfig)
  }

  searchTv(params: SearchTvRequest, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'search/tv', this.parseSearchParams(params), axiosConfig)
  }

  // Doesn't exist in documentation, may be deprecated
  searchList(params?: string | number | RequestParams, axiosConfig?: AxiosRequestConfig): Promise<any> {
    return this.makeRequest(HttpMethod.Get, 'search/list', params, axiosConfig)
  }

  collectionInfo(params: string | number | CollectionRequest, axiosConfig?: AxiosRequestConfig): Promise<CollectionInfoResponse> {
    return this.makeRequest(HttpMethod.Get, 'collection/:id', params, axiosConfig)
  }

  collectionImages(params: string | number | CollectionRequest, axiosConfig?: AxiosRequestConfig): Promise<CollectionImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'collection/:id/images', params, axiosConfig)
  }

  collectionTranslations(params: string | number | CollectionRequest, axiosConfig?: AxiosRequestConfig): Promise<CollectionTranslationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'collection/:id/translations', params, axiosConfig)
  }

  discoverMovie(params?: DiscoverMovieRequest, axiosConfig?: AxiosRequestConfig): Promise<DiscoverMovieResponse> {
    return this.makeRequest(HttpMethod.Get, 'discover/movie', params, axiosConfig)
  }

  discoverTv(params?: DiscoverTvRequest, axiosConfig?: AxiosRequestConfig): Promise<DiscoverTvResponse> {
    return this.makeRequest(HttpMethod.Get, 'discover/tv', params, axiosConfig)
  }

  trending(params: TrendingRequest, axiosConfig?: AxiosRequestConfig): Promise<TrendingResponse> {
    return this.makeRequest(HttpMethod.Get, 'trending/:media_type/:time_window', params, axiosConfig)
  }

  movieInfo(params: string | number | IdAppendToResponseRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id', params, axiosConfig)
  }

  movieAccountStates(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieAccountStateResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/account_states', params, axiosConfig)
  }

  movieAlternativeTitles(params: string | number | MovieAlternativeTitlesRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieAlternativeTitlesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/alternative_titles', params, axiosConfig)
  }

  movieChanges(params: string | number | ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/changes', params, axiosConfig)
  }

  movieCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<CreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/credits', params, axiosConfig)
  }

  movieExternalIds(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieExternalIdsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/external_ids', params, axiosConfig)
  }

  movieImages(params: string | number | MovieImagesRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/images', params, axiosConfig)
  }

  movieKeywords(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieKeywordResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/keywords', params, axiosConfig)
  }

  movieReleaseDates(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieReleaseDatesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/release_dates', params, axiosConfig)
  }

  movieVideos(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<VideosResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/videos', params, axiosConfig)
  }

  movieWatchProviders(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<WatchProviderResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/watch/providers', params, axiosConfig)
  }

  movieWatchProviderList(params: WatchProvidersParams, axiosConfig?: AxiosRequestConfig): Promise<WatchProviderListResponse> {
    return this.makeRequest(HttpMethod.Get, 'watch/providers/movie', params, axiosConfig)
  }

  movieTranslations(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieTranslationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/translations', params, axiosConfig)
  }

  movieRecommendations(params: string | number | MovieRecommendationsRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieRecommendationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/recommendations', params, axiosConfig)
  }

  movieSimilar(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<SimilarMovieResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/similar', params, axiosConfig)
  }

  movieReviews(params: string | number | MovieReviewsRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieReviewsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/reviews', params, axiosConfig)
  }

  movieLists(params: string | number | MovieListsRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieListsResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/:id/lists', params, axiosConfig)
  }

  movieRatingUpdate(params: RatingRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'movie/:id/rating', params, axiosConfig)
  }

  movieRatingDelete(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Delete, 'movie/:id/rating', params, axiosConfig)
  }

  movieLatest(params?: string | RequestParams, axiosConfig?: AxiosRequestConfig): Promise<MovieResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/latest', isString(params) ? { language: params } : params, axiosConfig)
  }

  movieNowPlaying(params?: MovieNowPlayingRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieNowPlayingResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/now_playing', params, axiosConfig)
  }

  moviePopular(params?: PopularMoviesRequest, axiosConfig?: AxiosRequestConfig): Promise<PopularMoviesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/popular', params, axiosConfig)
  }

  movieTopRated(params?: TopRatedMoviesRequest, axiosConfig?: AxiosRequestConfig): Promise<TopRatedMoviesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/top_rated', params, axiosConfig)
  }

  upcomingMovies(params: UpcomingMoviesRequest, axiosConfig?: AxiosRequestConfig): Promise<UpcomingMoviesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/upcoming', params, axiosConfig)
  }

  tvInfo(params: string | number | IdAppendToResponseRequest, axiosConfig?: AxiosRequestConfig): Promise<ShowResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id', params, axiosConfig)
  }

  tvAccountStates(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<ShowAccountStatesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/account_states', params, axiosConfig)
  }

  tvAlternativeTitles(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<ShowAlternativeTitlesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/alternative_titles', params, axiosConfig)
  }

  tvChanges(params: string | number | ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<ShowChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/changes', params, axiosConfig)
  }

  tvContentRatings(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<ShowContentRatingResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/content_ratings', params, axiosConfig)
  }

  tvCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<CreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/credits', params, axiosConfig)
  }

  tvAggregateCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<AggregateCreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/aggregate_credits', params, axiosConfig)
  }

  episodeGroups(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvEpisodeGroupsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/episode_groups', params, axiosConfig)
  }

  tvExternalIds(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvExternalIdsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/external_ids', params, axiosConfig)
  }

  tvImages(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/images', params, axiosConfig)
  }

  tvKeywords(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvKeywordsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/keywords', params, axiosConfig)
  }

  tvRecommendations(params: string | number | IdPagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/recommendations', params, axiosConfig)
  }

  tvReviews(params: string | number | IdPagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvReviewsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/reviews', params, axiosConfig)
  }

  tvScreenedTheatrically(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvScreenTheatricallyResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/screened_theatrically', params, axiosConfig)
  }

  tvSimilar(params: string | number | IdPagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvSimilarShowsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/similar', params, axiosConfig)
  }

  tvTranslations(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvTranslationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/translations', params, axiosConfig)
  }

  tvVideos(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<VideosResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/videos', params, axiosConfig)
  }

  tvWatchProviders(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<WatchProviderResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/watch/providers', params, axiosConfig)
  }

  tvWatchProviderList(params: WatchProvidersParams, axiosConfig?: AxiosRequestConfig): Promise<WatchProviderListResponse> {
    return this.makeRequest(HttpMethod.Get, 'watch/providers/tv', params, axiosConfig)
  }

  tvRatingUpdate(params: RatingRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'tv/:id/rating', params, axiosConfig)
  }

  tvRatingDelete(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Delete, 'tv/:id/rating', params, axiosConfig)
  }

  tvLatest(params?: RequestParams, axiosConfig?: AxiosRequestConfig): Promise<ShowResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/latest', params, axiosConfig)
  }

  tvAiringToday(params?: PagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/airing_today', params, axiosConfig)
  }

  tvOnTheAir(params?: PagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/on_the_air', params, axiosConfig)
  }

  tvPopular(params?: PagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/popular', params, axiosConfig)
  }

  tvTopRated(params?: PagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/top_rated', params, axiosConfig)
  }

  seasonInfo(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<TvSeasonResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number', params, axiosConfig)
  }

  seasonChanges(params: ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<TvSeasonChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/season/:id/changes', params, axiosConfig)
  }

  seasonAccountStates(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<TvSeasonAccountStatesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/account_states', params, axiosConfig)
  }

  seasonCredits(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<CreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/credits', params, axiosConfig)
  }

  seasonAggregateCredits(params: TvAggregateCreditsRequest, axiosConfig?: AxiosRequestConfig): Promise<CreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/aggregate_credits', params, axiosConfig)
  }

  seasonExternalIds(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<TvSeasonExternalIdsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/external_ids', params, axiosConfig)
  }

  seasonImages(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<TvSeasonImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/images', params, axiosConfig)
  }

  seasonVideos(params: TvSeasonRequest, axiosConfig?: AxiosRequestConfig): Promise<VideosResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/videos', params, axiosConfig)
  }

  episodeInfo(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<Episode> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number', params, axiosConfig)
  }

  episodeChanges(params: string | number | ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/episode/:id/changes', params, axiosConfig)
  }

  episodeAccountStates(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeAccountStatesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/account_states', params, axiosConfig)
  }

  episodeCredits(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeCreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/credits', params, axiosConfig)
  }

  episodeExternalIds(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeExternalIdsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/external_ids', params, axiosConfig)
  }

  episodeImages(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/images', params, axiosConfig)
  }

  episodeTranslations(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeTranslationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/translations', params, axiosConfig)
  }

  episodeRatingUpdate(params: EpisodeRatingRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'tv/:id/season/:season_number/episode/:episode_number/rating', params, axiosConfig)
  }

  episodeRatingDelete(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Delete, 'tv/:id/season/:season_number/episode/:episode_number/rating', params, axiosConfig)
  }

  episodeVideos(params: EpisodeRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeVideosResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/:id/season/:season_number/episode/:episode_number/translations', params, axiosConfig)

  }

  personInfo(params: string | number | IdAppendToResponseRequest, axiosConfig?: AxiosRequestConfig): Promise<Person> {
    return this.makeRequest(HttpMethod.Get, 'person/:id', params, axiosConfig)

  }

  personChanges(params: string | number | ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<PersonChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/changes', params, axiosConfig)

  }

  personMovieCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonMovieCreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/movie_credits', params, axiosConfig)

  }

  personTvCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonTvCreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/tv_credits', params, axiosConfig)

  }

  personCombinedCredits(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonCombinedCreditsResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/combined_credits', params, axiosConfig)

  }

  personExternalIds(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonExternalIdsResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/external_ids', params, axiosConfig)

  }

  personImages(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/images', params, axiosConfig)

  }

  personTaggedImages(params: string | number | IdPagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonTaggedImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/tagged_images', params, axiosConfig)

  }

  personTranslations(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonTranslationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/:id/translations', params, axiosConfig)

  }

  personLatest(params?: RequestParams, axiosConfig?: AxiosRequestConfig): Promise<Person> {
    return this.makeRequest(HttpMethod.Get, 'person/latest', params, axiosConfig)

  }

  personPopular(params?: PagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PersonPopularResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/popular', params, axiosConfig)

  }

  creditInfo(params?: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<CreditDetailsResponse> {
    return this.makeRequest(HttpMethod.Get, 'credit/:id', params, axiosConfig)

  }

  listInfo(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<ListsDetailResponse> {
    return this.makeRequest(HttpMethod.Get, 'list/:id', params, axiosConfig)

  }

  listStatus(params: IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<ListsStatusResponse> {
    return this.makeRequest(HttpMethod.Get, 'list/:id/item_status', params, axiosConfig)

  }

  createList(params: CreateListParams, axiosConfig?: AxiosRequestConfig): Promise<CreateListResponse> {
    return this.makeRequest(HttpMethod.Post, 'list', params, axiosConfig)

  }

  createListItem(params: CreateListItemParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'list/:id/add_item', params, axiosConfig)

  }

  removeListItem(params: CreateListItemParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'list/:id/remove_item', params, axiosConfig)

  }

  clearList(params: ClearListParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'list/:id/clear', params, axiosConfig)

  }

  deleteList(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Delete, 'list/:id', params, axiosConfig)

  }

  genreMovieList(params?: RequestParams, axiosConfig?: AxiosRequestConfig): Promise<GenresResponse> {
    return this.makeRequest(HttpMethod.Get, 'genre/movie/list', params, axiosConfig)

  }

  genreTvList(params?: RequestParams, axiosConfig?: AxiosRequestConfig): Promise<GenresResponse> {
    return this.makeRequest(HttpMethod.Get, 'genre/tv/list', params, axiosConfig)

  }

  keywordInfo(params?: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<KeywordResponse> {
    return this.makeRequest(HttpMethod.Get, 'keyword/:id', params, axiosConfig)

  }

  keywordMovies(params: string | number | KeywordMoviesParams, axiosConfig?: AxiosRequestConfig): Promise<MovieResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'keyword/:id/movies', params, axiosConfig)

  }

  companyInfo(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<Company> {
    return this.makeRequest(HttpMethod.Get, 'company/:id', params, axiosConfig)

  }

  companyAlternativeNames(params: string | number | RequestParams, axiosConfig?: AxiosRequestConfig): Promise<CompanyAlternativeNamesResponse> {
    return this.makeRequest(HttpMethod.Get, 'company/:id/alternative_names', params, axiosConfig)

  }

  companyImages(params: string | number | RequestParams, axiosConfig?: AxiosRequestConfig): Promise<CompanyImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'company/:id/images', params, axiosConfig)

  }

  accountInfo(axiosConfig?: AxiosRequestConfig): Promise<AccountInfoResponse> {
    return this.makeRequest(HttpMethod.Get, 'account', null, axiosConfig)

  }

  accountLists(params: string | number | IdPagedRequestParams, axiosConfig?: AxiosRequestConfig): Promise<AccountListsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/lists', params, axiosConfig)

  }

  accountFavoriteMovies(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/favorite/movies', params, axiosConfig)

  }

  accountFavoriteTv(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/favorite/tv', params, axiosConfig)

  }

  accountFavoriteUpdate(params: MarkAsFavoriteRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'account/:id/favorite', params, axiosConfig)

  }

  accountRatedMovies(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/rated/movies', params, axiosConfig)

  }

  accountRatedTv(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/rated/tv', params, axiosConfig)

  }

  accountRatedTvEpisodes(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<EpisodeResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/rated/tv/episodes', params, axiosConfig)

  }

  accountMovieWatchlist(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<MovieResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/watchlist/movies', params, axiosConfig)

  }

  accountTvWatchlist(params?: string | number | AccountMediaRequest, axiosConfig?: AxiosRequestConfig): Promise<TvResultsResponse> {
    return this.makeRequest(HttpMethod.Get, 'account/:id/watchlist/tv', params, axiosConfig)

  }

  accountWatchlistUpdate(params: AccountWatchlistRequest, axiosConfig?: AxiosRequestConfig): Promise<PostResponse> {
    return this.makeRequest(HttpMethod.Post, 'account/:id/watchlist', params, axiosConfig)

  }

  changedMovies(params?: ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<ChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'movie/changes', params, axiosConfig)

  }

  changedTvs(params?: ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<ChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/changes', params, axiosConfig)

  }

  changedPeople(params?: ChangesRequest, axiosConfig?: AxiosRequestConfig): Promise<ChangesResponse> {
    return this.makeRequest(HttpMethod.Get, 'person/changes', params, axiosConfig)

  }

  movieCertifications(axiosConfig?: AxiosRequestConfig): Promise<CertificationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'certification/movie/list', null, axiosConfig)

  }

  tvCertifications(axiosConfig?: AxiosRequestConfig): Promise<CertificationsResponse> {
    return this.makeRequest(HttpMethod.Get, 'certification/tv/list', null, axiosConfig)

  }

  networkInfo(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<NetworkResponse> {
    return this.makeRequest(HttpMethod.Get, 'network/:id', params, axiosConfig)

  }

  networkAlternativeNames(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<CompanyAlternativeNamesResponse> {
    return this.makeRequest(HttpMethod.Get, 'network/:id/alternative_names', params, axiosConfig)

  }

  networkImages(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<CompanyImagesResponse> {
    return this.makeRequest(HttpMethod.Get, 'network/:id/images', params, axiosConfig)

  }

  review(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<Review> {
    return this.makeRequest(HttpMethod.Get, 'review/:id', params, axiosConfig)

  }

  episodeGroup(params: string | number | IdRequestParams, axiosConfig?: AxiosRequestConfig): Promise<EpisodeGroupResponse> {
    return this.makeRequest(HttpMethod.Get, 'tv/episode_group/:id', params, axiosConfig)

  }
}

export default MovieDb
import { Genre, ProductionCompany, ProductionCountry, RequestParams, Response, SpokenLanguage } from './types'

export interface IdRequestParams extends RequestParams {
  id: string | number;
}

export interface AppendToResponseRequest {
  append_to_response?: string;
}

export interface IdAppendToResponseRequest extends IdRequestParams, AppendToResponseRequest {
}

export interface PagedRequestParams extends RequestParams {
  page?: number;
}

export interface IdPagedRequestParams extends IdRequestParams {
  page?: number;
}

export interface WatchProvidersParams extends RequestParams {
  watch_region?: string;
}

export interface MovieResult {
  poster_path?: string;
  adult?: boolean;
  overview?: string;
  release_date?: string;
  genre_ids?: Array<number>;
  id?: number;
  media_type: 'movie';
  original_title?: string;
  original_language?: string;
  title?: string;
  backdrop_path?: string;
  popularity?: number;
  vote_count?: number;
  video?: boolean;
  vote_average?: number;
}

export interface TvResult {
  poster_path?: string;
  popularity?: number;
  id?: number;
  overview?: string;
  backdrop_path?: string;
  vote_average?: number;
  media_type: 'tv';
  first_air_date?: string;
  origin_country?: Array<string>;
  genre_ids?: Array<number>;
  original_language?: string;
  vote_count?: number;
  name?: string;
  original_name?: string;
}

export interface PersonResult {
  profile_path?: string;
  adult?: boolean;
  id?: number;
  name?: string;
  media_type: 'person';
  popularity?: number;
  known_for?: Array<MovieResult | TvResult>;
}

export interface EpisodeResult extends SimpleEpisode {
  media_type: 'tv_episode';
  runtime?: string;
}

export interface Person {
  birthday?: string | null;
  known_for_department?: string;
  deathday?: null | string;
  id?: number;
  name?: string;
  also_known_as?: string[];
  gender?: number;
  biography?: string;
  popularity?: number;
  place_of_birth?: string | null;
  profile_path?: string | null;
  adult?: boolean;
  imdb_id?: string;
  homepage?: null | string;
}

export interface Image {
  base_url?: string;
  secure_base_url?: string;
  backdrop_sizes?: Array<string>;
  logo_sizes?: Array<string>;
  poster_sizes?: Array<string>;
  profile_sizes?: Array<string>;
  still_sizes?: Array<string>;
}

interface BaseImage {
  aspect_ratio?: number;
  file_path?: string;
  height?: number;
  vote_average?: number;
  vote_count?: number;
  width?: number;
}

export interface Logo extends BaseImage {
  id?: string;
  file_type?: '.svg' | '.png';
}

export interface Backdrop extends BaseImage {
  iso_639_1?: string;
}

export interface Profile extends BaseImage {
  iso_639_1?: string;
}

export interface Poster extends BaseImage {
  iso_639_1?: string;
}

export interface TitleLogo extends BaseImage {
  iso_639_1?: string;
}

export interface Keyword {
  id?: number;
  name?: string;
}

export interface ReleaseDate {
  certification?: string;
  iso_639_1?: string;
  release_date?: string;
  type?: number;
  note?: string;
}

export interface Video {
  id?: string;
  iso_639_1?: string;
  iso_3166_1?: string;
  key?: string;
  name?: string;
  official?: boolean;
  published_at?: string;
  site?: string;
  size?: 360 | 480 | 720 | 1080;
  type?: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes' | 'Bloopers';
}

export interface Translation {
  iso_3166_1?: string;
  iso_639_1?: string;
  name?: string;
  english_name?: string;
  data?: {
    name?: string;
    overview?: string;
    homepage?: string;
  };
}

export interface Company {
  description?: string;
  headquarters?: string;
  homepage?: string;
  id?: number;
  logo_path?: string;
  name?: string;
  origin_country?: string;
  parent_company?: null | object;
}

export interface SimpleEpisode {
  air_date?: string;
  episode_number?: number;
  id?: number;
  name?: string;
  order?: number;
  overview?: string;
  production_code?: string;
  rating?: number;
  season_number?: number;
  show_id?: number;
  still_path?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface Network {
  name?: string;
  id?: number;
  logo_path?: string;
  origin_country?: string;
}

export interface SimpleSeason {
  air_date?: string;
  episode_count?: number;
  id?: number;
  name?: string;
  overview?: string;
  poster_path?: string;
  season_number?: number;
}

export interface SimplePerson {
  id?: number;
  credit_id?: string;
  name?: string;
  gender?: number;
  profile_path?: string;
}

export interface Cast {
  adult?: boolean;
  cast_id?: number;
  character?: string;
  credit_id?: string;
  gender?: number | null;
  id?: number;
  known_for_department?: string;
  name?: string;
  order?: number;
  original_name?: string;
  popularity?: number;
  profile_path?: string | null;
}

export interface Crew {
  adult?: boolean;
  credit_id?: string;
  department?: string;
  gender?: number | null;
  id?: number;
  known_for_department?: string;
  job?: string;
  name?: string;
  original_name?: string;
  popularity?: number;
  profile_path?: string | null;
}

export interface Country {
  iso_3166_1?: string;
  english_name?: string;
}

export interface Language {
  iso_639_1?: string;
  english_name?: string;
  name?: string;
}

export interface Timezone {
  iso_3166_1?: string;
  zones?: string[];
}

export interface Job {
  department?: string;
  jobs?: string[];
}

export interface Episode {
  air_date?: string;
  crew?: Array<Crew>;
  episode_number?: number;
  guest_stars?: GuestStar[];
  name?: string;
  overview?: string;
  id?: number;
  production_code?: string | null;
  season_number?: number;
  still_path?: string | null;
  vote_average?: number;
  vote_count?: number;
}

export declare enum ExternalId {
  ImdbId = 'imdb_id',
  Freebase_Mid = 'freebase_mid',
  FreebaseId = 'freebase_id',
  TvdbId = 'tvdb_id',
  TvrageId = 'tvrage_id',
  FacebookId = 'facebook_id',
  TwitterId = 'twitter_id',
  InstagramId = 'instagram_id'
}

export interface ConfigurationResponse extends Response {
  change_keys: string[];
  images: {
    base_url?: string;
    secure_base_url?: string;
    backdrop_sizes?: string[];
    logo_sizes?: string[];
    poster_sizes?: string[];
    profile_sizes?: string[];
    still_sizes?: string[];
  };
}

export interface MovieList {
  description?: string;
  favorite_count?: number;
  id?: number;
  item_count?: number;
  iso_639_1?: string;
  list_type?: string;
  name?: string;
  poster_path?: null | string;
}

export interface GuestStar {
  id?: number;
  name?: string;
  credit_id?: string;
  character?: string;
  order?: number;
  profile_path?: string | null;
}

export interface Role {
  credit_id?: string;
  character?: string;
  episode_count?: number;
}

export interface AggregateCast {
  adult?: boolean;
  gender?: number;
  id?: number;
  known_for_department?: string;
  name?: string;
  original_name?: string;
  popularity?: number;
  profile_path?: string;
  roles?: Role[];
  total_episode_count?: number;
  order?: number;
}

export interface AggregateJob {
  credit_id?: string;
  job?: string;
  episode_count?: number;
}

export interface AggregateCrew {
  adult?: boolean;
  gender?: number;
  id?: number;
  known_for_department?: string;
  name?: string;
  original_name?: string;
  popularity?: number;
  profile_path?: string;
  jobs?: AggregateJob[];
  department?: string;
  total_episode_count?: number;
}

export interface FindRequest extends RequestParams {
  id: string | number;
  language?: string;
  external_source: ExternalId;
}

export interface PaginatedResponse extends Response {
  page?: number;
  total_results?: number;
  total_pages?: number;
}

export interface FindResponse extends Response {
  movie_results: Array<MovieResult>;
  tv_results: Array<TvResult>;
  person_results: Array<PersonResult>;
  tv_episode_results: Array<EpisodeResult>;
  tv_season_results: Array<object>;
}

export interface SearchRequest extends RequestParams {
  query: string;
  page?: number;
}

export interface SearchCompanyResponse extends PaginatedResponse {
  results?: Array<{
    id?: number;
    logo_path?: string;
    name?: string;
  }>;
}

export interface SearchCollectionResponse extends PaginatedResponse {
  results?: Array<{
    id?: number;
    backdrop_path?: string;
    name?: string;
    poster_path?: string;
  }>;
}

export interface SearchKeywordResponse extends PaginatedResponse {
  results?: Array<{
    id?: number;
    name?: string;
  }>;
}

export interface SearchMovieRequest extends SearchRequest {
  include_adult?: boolean;
  region?: string;
  year?: number;
  primary_release_year?: number;
}

export interface MovieResultsResponse extends PaginatedResponse {
  results?: Array<MovieResult>;
}

export interface SearchMultiRequest extends SearchRequest {
  include_adult?: boolean;
  region?: string;
}

export interface SearchMultiResponse extends PaginatedResponse {
  results?: Array<MovieResult | TvResult | PersonResult>;
}

export interface SearchPersonResponse extends PaginatedResponse {
  results?: Array<PersonResult>;
}

export interface SearchTvRequest extends SearchRequest {
  include_adult?: boolean;
  first_air_date_year?: number;
}

export interface EpisodeResultsResponse extends PaginatedResponse {
  results?: Array<SimpleEpisode>;
}

export interface CollectionRequest extends RequestParams {
  id: number;
}

export interface CollectionInfoResponse extends Response {
  id?: number;
  name?: string;
  overview?: string;
  poster_path?: null;
  backdrop_path?: string;
  parts?: Array<{
    adult?: boolean;
    backdrop_path?: null;
    genre_ids?: number[];
    id?: number;
    original_language?: string;
    original_title?: string;
    overview?: string;
    release_date?: string;
    poster_path?: string;
    popularity?: number;
    title?: string;
    video?: boolean;
    vote_average?: number;
    vote_count?: number;
  }>;
}

export interface CollectionImagesResponse extends Response {
  id?: number;
  backdrops?: Array<Backdrop>;
  posters?: Array<Poster>;
}

export interface CollectionTranslationsResponse extends Response {
  id?: number;
  translations?: Array<Translation>;
}

export interface DiscoverMovieRequest extends RequestParams {
  region?: string;
  sort_by?: 'popularity.asc' | 'popularity.desc' | 'release_date.asc' | 'release_date.desc' | 'revenue.asc' | 'revenue.desc' | 'primary_release_date.asc' | 'primary_release_date.desc' | 'original_title.asc' | 'original_title.desc' | 'vote_average.asc' | 'vote_average.desc' | 'vote_count.asc' | 'vote_count.desc';
  certification_country?: string;
  certification?: string;
  'certification.lte'?: string;
  'certification.gte'?: string;
  include_adult?: boolean;
  include_video?: boolean;
  page?: number;
  primary_release_year?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'release_date.gte'?: string;
  'release_date.lte'?: string;
  with_release_type?: number;
  year?: number;
  'vote_count.gte'?: number;
  'vote_count.lte'?: number;
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  with_cast?: string;
  with_crew?: string;
  with_people?: string;
  with_companies?: string;
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  without_keywords?: string;
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;
  with_original_language?: string;
  with_watch_providers?: string;
  watch_region?: string;
  with_watch_monetization_types?: string;
}

export interface DiscoverMovieResponse extends PaginatedResponse {
  results?: Array<MovieResult>;
}

export interface DiscoverTvRequest extends RequestParams {
  sort_by?: string;
  'air_date.gte'?: string;
  'air_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  first_air_date_year?: number;
  page?: number;
  timezone?: string;
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'vote_count.gte'?: number;
  with_genres?: string;
  with_networks?: string;
  without_genres?: string;
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;
  include_null_first_air_dates?: boolean;
  with_original_language?: string;
  without_keywords?: string;
  screened_theatrically?: boolean;
  with_companies?: string;
  with_keywords?: string;
  with_watch_providers?: string;
  watch_region?: string;
  with_watch_monetization_types?: string;
}

export interface DiscoverTvResponse extends PaginatedResponse {
  results?: Array<TvResult>;
}

export interface TrendingRequest extends RequestParams {
  media_type: 'all' | 'movie' | 'tv' | 'person';
  time_window: 'day' | 'week';
}

export interface TrendingResponse extends PaginatedResponse {
  results?: Array<MovieResult | TvResult | PersonResult>;
}

export interface MovieResponse extends Response {
  adult?: boolean;
  backdrop_path?: string;
  belongs_to_collection?: object;
  budget?: number;
  genres?: Array<Genre>;
  homepage?: string;
  id?: number;
  imdb_id?: string;
  original_language?: string;
  original_title?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string;
  production_companies?: Array<ProductionCompany>;
  production_countries?: Array<ProductionCountry>;
  release_date?: string;
  revenue?: number;
  runtime?: number;
  spoken_languages?: Array<SpokenLanguage>;
  status?: 'Rumored' | 'Planned' | 'In Production' | 'Post Production' | 'Released' | 'Canceled';
  tagline?: string;
  title?: string;
  video?: boolean;
  vote_average?: number;
  vote_count?: number;
}

export interface MovieAccountStateResponse extends Response {
  id?: number;
  favorite?: boolean;
  rated?: object | boolean;
  watchlist?: boolean;
}

export interface MovieAlternativeTitlesRequest extends IdRequestParams {
  country?: string;
}

export interface MovieAlternativeTitlesResponse extends Response {
  id?: number;
  titles?: Array<{
    iso_3166_1?: string;
    title?: string;
    type?: string;
  }>;
}

export interface ChangesRequest extends IdRequestParams {
  start_date?: string;
  end_date?: string;
  page?: number;
}

export interface ChangesResponse extends PaginatedResponse {
  results?: Array<{
    id?: number;
    adult?: boolean | null;
  }>;
}

export interface WatchProviderCountry {
  link?: string;
  rent?: Array<WatchProvider>;
  buy?: Array<WatchProvider>;
  flatrate?: Array<WatchProvider>;
  ads?: Array<WatchProvider>;
  free?: Array<WatchProvider>;
}

export interface WatchProvider {
  display_priority?: number;
  logo_path?: string;
  provider_id?: number;
  provider_name?: string;
}

export interface WatchProviderListResponse {
  results?: Array<WatchProvider>;
}

export interface WatchProviderResponse {
  id?: number;
  results?: {
    AR?: WatchProviderCountry;
    AT?: WatchProviderCountry;
    AU?: WatchProviderCountry;
    BE?: WatchProviderCountry;
    BR?: WatchProviderCountry;
    CA?: WatchProviderCountry;
    CH?: WatchProviderCountry;
    CL?: WatchProviderCountry;
    CO?: WatchProviderCountry;
    CZ?: WatchProviderCountry;
    DE?: WatchProviderCountry;
    DK?: WatchProviderCountry;
    EC?: WatchProviderCountry;
    EE?: WatchProviderCountry;
    ES?: WatchProviderCountry;
    FI?: WatchProviderCountry;
    FR?: WatchProviderCountry;
    GB?: WatchProviderCountry;
    GR?: WatchProviderCountry;
    HU?: WatchProviderCountry;
    ID?: WatchProviderCountry;
    IE?: WatchProviderCountry;
    IN?: WatchProviderCountry;
    IT?: WatchProviderCountry;
    JP?: WatchProviderCountry;
    KR?: WatchProviderCountry;
    LT?: WatchProviderCountry;
    LV?: WatchProviderCountry;
    MX?: WatchProviderCountry;
    MY?: WatchProviderCountry;
    NL?: WatchProviderCountry;
    NO?: WatchProviderCountry;
    NZ?: WatchProviderCountry;
    PE?: WatchProviderCountry;
    PH?: WatchProviderCountry;
    PL?: WatchProviderCountry;
    PT?: WatchProviderCountry;
    RO?: WatchProviderCountry;
    RU?: WatchProviderCountry;
    SE?: WatchProviderCountry;
    SG?: WatchProviderCountry;
    TH?: WatchProviderCountry;
    TR?: WatchProviderCountry;
    US?: WatchProviderCountry;
    VE?: WatchProviderCountry;
    ZA?: WatchProviderCountry;
  };
}

export interface MovieChangesResponse extends Response {
  changes?: Array<{
    key?: string;
    items?: Array<{
      id?: string;
      action?: string;
      time?: string;
      iso_639_1?: string;
      value?: string;
      original_value?: string;
    }>;
  }>;
}

export interface CreditsResponse extends Response {
  id?: number;
  cast?: Array<Cast>;
  crew?: Array<Crew>;
}

export interface AggregateCreditsResponse extends Response {
  cast?: Array<AggregateCast>;
  crew?: Array<AggregateCrew>;
  id?: number;
}

export interface MovieExternalIdsResponse extends Response {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  id?: number;
}

export interface MovieImagesRequest extends IdRequestParams {
  include_image_language?: string;
}

export interface MovieImagesResponse extends Response {
  id?: number;
  backdrops?: Array<Backdrop>;
  posters?: Array<Poster>;
  logos?: Array<TitleLogo>;
}

export interface MovieKeywordResponse extends Response {
  id?: number;
  keywords?: Array<Keyword>;
}

export interface MovieReleaseDatesResponse extends Response {
  id?: number;
  results?: Array<{
    iso_3166_1?: string;
    release_dates?: Array<ReleaseDate>;
  }>;
}

export interface VideosResponse extends Response {
  id?: number;
  results?: Array<Video>;
}

export interface MovieTranslationsResponse extends CollectionTranslationsResponse {
}

export interface MovieRecommendationsRequest extends IdRequestParams {
  page?: string;
}

export interface MovieRecommendationsResponse extends PaginatedResponse {
  results?: Array<MovieResult>;
}

export interface SimilarMovieResponse extends MovieRecommendationsResponse {
}

export interface MovieReviewsRequest extends MovieRecommendationsRequest {
}

export interface MovieReviewsResponse extends PaginatedResponse {
  results?: Array<Review>;
}

export interface MovieListsRequest extends MovieRecommendationsRequest {
}

export interface MovieListsResponse extends PaginatedResponse {
  results?: Array<MovieList>;
}

export interface RatingRequest extends IdRequestParams {
  value: number;
}

export interface PostResponse extends Response {
  status_code?: number;
  status_message?: string;
}

export interface MovieNowPlayingRequest {
  language?: string;
  page?: number;
  region?: string;
}

export interface MovieNowPlayingResponse extends PaginatedResponse {
  results?: Array<MovieResult>;
  dates?: {
    maximum?: string;
    minimum?: string;
  };
}

export interface PopularMoviesRequest extends MovieNowPlayingRequest {
}

export interface PopularMoviesResponse extends DiscoverMovieResponse {
}

export interface TopRatedMoviesRequest extends MovieNowPlayingRequest {
}

export interface TopRatedMoviesResponse extends DiscoverMovieResponse {
}

export interface UpcomingMoviesRequest extends MovieNowPlayingRequest {
  page?: number;
  region?: string;
}

export interface UpcomingMoviesResponse extends MovieNowPlayingResponse {
  results?: Array<MovieResult>;
  dates?: {
    maximum?: string;
    minimum?: string;
  };
}

export interface ShowResponse extends Response {
  backdrop_path?: string | null;
  created_by?: Array<SimplePerson>;
  episode_run_time?: number[];
  first_air_date?: string;
  genres?: Array<Genre>;
  homepage?: string;
  id?: number;
  in_production?: boolean;
  languages?: string[];
  last_air_date?: string;
  last_episode_to_air?: SimpleEpisode;
  name?: string;
  next_episode_to_air?: null;
  networks?: Array<Network>;
  number_of_episodes?: number;
  number_of_seasons?: number;
  origin_country?: string[];
  original_language?: string;
  original_name?: string;
  overview?: string;
  popularity?: number;
  poster_path?: string | null;
  production_companies?: Array<ProductionCompany>;
  production_countries?: Array<ProductionCountry>;
  seasons?: Array<SimpleSeason>;
  spoken_languages?: Array<SpokenLanguage>;
  status?: string;
  tagline?: string;
  type?: string;
  vote_average?: number;
  vote_count?: number;
}

export interface ShowAccountStatesResponse extends Response {
  id?: number;
  favorite?: boolean;
  rated?: object | boolean;
  watchlist?: boolean;
}

export interface ShowAlternativeTitlesResponse extends Response {
  id?: number;
  results?: Array<{
    title?: string;
    iso_3166_1?: string;
    type?: string;
  }>;
}

export interface ShowChangesResponse extends Response {
  id?: number;
  results?: Array<{
    title?: string;
    iso_3166_1?: string;
    type?: string;
  }>;
}

export interface ShowContentRatingResponse extends Response {
  results?: Array<{
    iso_3166_1?: string;
    rating?: string;
  }>;
  id?: number;
}

export interface TvEpisodeGroupsResponse extends Response {
  results?: Array<{
    description?: string;
    episode_count?: number;
    group_count?: number;
    id?: string;
    name?: string;
    network?: null | Network;
  }>;
}

export interface TvExternalIdsResponse extends Response {
  imdb_id?: string | null;
  freebase_mid?: string | null;
  freebase_id?: string | null;
  tvdb_id?: number | null;
  tvrage_id?: number | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  id?: number;
}

export interface TvImagesResponse extends Response {
  backdrops?: Array<Backdrop>;
  id?: number;
  posters?: Array<Poster>;
  logos?: Array<TitleLogo>;
}

export interface TvKeywordsResponse extends Response {
  id?: number;
  results?: Array<Keyword>;
}

export interface TvResultsResponse extends PaginatedResponse {
  results?: Array<TvResult>;
}

export interface TvReviewsResponse extends PaginatedResponse {
  results?: Array<Review>;
}

export interface TvScreenTheatricallyResponse extends Response {
  id?: number;
  results?: Array<{
    id?: number;
    episode_number?: number;
    season_number?: number;
  }>;
}

export interface TvSimilarShowsResponse extends PaginatedResponse {
  results?: Array<TvResult>;
}

export interface TvTranslationsResponse extends Response {
  id?: number;
  translations?: Array<Translation>;
}

export interface TvSeasonRequest extends IdAppendToResponseRequest {
  season_number: number;
}

export interface TvAggregateCreditsRequest {
  id: number;
  season_number: number;
  language?: string;
}

export interface TvSeasonResponse extends Response {
  _id?: string;
  air_date?: string;
  episodes?: Array<Episode>;
  name?: string;
  overview?: string;
  id?: number;
  poster_path?: string | null;
  season_number?: number;
}

export interface TvSeasonChangesResponse extends Response {
  changes?: Array<{
    key?: string;
    items?: Array<{
      id?: string;
      action?: string;
      time?: string;
      value?: string | {
        episode_id?: number;
        episode_number?: number;
      };
      iso_639_1?: string;
      original_value?: string;
    }>;
  }>;
}

export interface TvSeasonAccountStatesResponse extends Response {
  id?: number;
  results?: Array<{
    id?: number;
    episode_number?: number;
    rated?: boolean | {
      value?: number;
    };
  }>;
}

export interface TvSeasonExternalIdsResponse extends Response {
  freebase_mid?: string | null;
  freebase_id?: null | string;
  tvdb_id?: number | null;
  tvrage_id?: null | number;
  id?: number;
}

export interface TvSeasonImagesResponse extends Response {
  id?: number;
  posters?: Array<Poster>;
}

export interface EpisodeRequest extends TvSeasonRequest {
  episode_number: number;
}

export interface EpisodeChangesResponse extends Response {
  changes?: Array<{
    key?: string;
    items?: Array<{
      id?: string;
      action?: string;
      time?: string;
      value?: string;
      iso_639_1?: string;
    }>;
  }>;
}

export interface EpisodeAccountStatesResponse extends Response {
  id?: number;
  rated?: object | boolean;
}

export interface EpisodeCreditsResponse extends CreditsResponse {
  guest_stars?: Array<GuestStar>;
}

export interface EpisodeExternalIdsResponse extends Response {
  imdb_id?: string | null;
  freebase_mid?: string | null;
  freebase_id?: string | null;
  tvdb_id?: number | null;
  tvrage_id?: number | null;
  id?: number;
}

interface EpisodeImage extends BaseImage {
  iso_639_1?: null | string;
}

export interface EpisodeImagesResponse extends Response {
  id?: number;
  stills?: Array<EpisodeImage>;
}

export interface EpisodeTranslationsResponse extends Response {
  id?: number;
  translations?: Array<{
    iso_3166_1?: string;
    iso_639_1?: string;
    name?: string;
    english_name?: string;
    data?: {
      name?: string;
      overview?: string;
    };
  }>;
}

export interface EpisodeRatingRequest extends EpisodeRequest {
  value: number;
}

export interface EpisodeVideosResponse extends Response {
  id?: number;
  results: Array<{
    id?: string;
    iso_639_1?: string;
    iso_3166_1?: string;
    key?: string;
    name?: string;
    site?: string;
    size?: 360 | 480 | 720 | 1080;
    type?: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Opening Credits' | 'Behind the Scenes' | 'Bloopers' | 'Recap';
  }>;
}

export interface PersonChangesResponse extends Response {
  changes: Array<{
    key?: string;
    items?: Array<{
      id?: string;
      action?: string;
      time?: string;
      original_value?: {
        profile?: {
          file_path?: string;
        };
      };
    }>;
  }>;
}

export interface PersonMovieCreditsResponse extends Response {
  id?: number;
  cast?: Array<{
    character?: string;
    credit_id?: string;
    release_date?: string;
    vote_count?: number;
    video?: boolean;
    adult?: boolean;
    vote_average?: number | number;
    title?: string;
    genre_ids?: number[];
    original_language?: string;
    original_title?: string;
    popularity?: number;
    id?: number;
    backdrop_path?: string | null;
    overview?: string;
    poster_path?: string | null;
  }>;
  crew?: Array<{
    id?: number;
    department?: string;
    original_language?: string;
    original_title?: string;
    job?: string;
    overview?: string;
    vote_count?: number;
    video?: boolean;
    poster_path?: string | null;
    backdrop_path?: string | null;
    title?: string;
    popularity?: number;
    genre_ids?: number[];
    vote_average?: number;
    adult?: boolean;
    release_date?: string;
    credit_id?: string;
  }>;
}

export interface PersonTvCreditsResponse extends Response {
  id?: number;
  cast?: Array<{
    credit_id?: string;
    original_name?: string;
    id?: number;
    genre_ids?: number[];
    character?: string;
    name?: string;
    poster_path?: string | null;
    vote_count?: number;
    vote_average?: number;
    popularity?: number;
    episode_count?: number;
    original_language?: string;
    first_air_date?: string;
    backdrop_path?: string | null;
    overview?: string;
    origin_country?: string[];
  }>;
  crew?: Array<{
    id?: number;
    department?: string;
    original_language?: string;
    episode_count?: number;
    job?: string;
    overview?: string;
    origin_country?: string[];
    original_name?: string;
    genre_ids?: number[];
    name?: string;
    first_air_date?: string;
    backdrop_path?: string | null;
    popularity?: number;
    vote_count?: number;
    vote_average?: number;
    poster_path?: string | null;
    credit_id?: string;
  }>;
}

export interface PersonCombinedCreditsResponse extends Response {
  id?: number;
  cast?: Array<{
    id?: number;
    original_language?: string;
    episode_count?: number;
    overview?: string;
    origin_country?: string[];
    original_name?: string;
    genre_ids?: number[];
    name?: string;
    media_type?: string;
    poster_path?: string | null;
    first_air_date?: string;
    vote_average?: number | number;
    vote_count?: number;
    character?: string;
    backdrop_path?: string | null;
    popularity?: number;
    credit_id?: string;
    original_title?: string;
    video?: boolean;
    release_date?: string;
    title?: string;
    adult?: boolean;
  }>;
  crew?: Array<{
    id?: number;
    department?: string;
    original_language?: string;
    episode_count?: number;
    job?: string;
    overview?: string;
    origin_country?: string[];
    original_name?: string;
    vote_count?: number;
    name?: string;
    media_type?: string;
    popularity?: number;
    credit_id?: string;
    backdrop_path?: string | null;
    first_air_date?: string;
    vote_average?: number;
    genre_ids?: number[];
    poster_path?: string | null;
    original_title?: string;
    video?: boolean;
    title?: string;
    adult?: boolean;
    release_date?: string;
  }>;
}

export interface PersonExternalIdsResponse extends Response {
  imdb_id?: string | null;
  facebook_id?: null | string;
  freebase_mid?: string | null;
  freebase_id?: null | string;
  tvrage_id?: number | null;
  twitter_id?: null | string;
  id: number;
  instagram_id?: string | null;
}

export interface PersonImagesResponse extends Response {
  id?: number;
  profiles?: Array<Profile>;
}

interface PersonTaggedImage extends BaseImage {
  id?: string;
  iso_639_1?: null | string;
  image_type?: string;
  media?: MovieResult | TvResult;
}

export interface PersonTaggedImagesResponse extends PaginatedResponse {
  id?: number;
  results?: Array<PersonTaggedImage>;
}

export interface PersonTranslationsResponse extends PaginatedResponse {
  id?: number;
  translations?: Array<{
    iso_639_1?: string;
    iso_3166_1?: string;
    name?: string;
    data?: {
      biography?: string;
    };
    english_name?: string;
  }>;
}

export interface PersonPopularResponse extends PaginatedResponse {
  results?: Array<{
    profile_path?: string;
    adult?: boolean;
    id?: number;
    known_for?: MovieResult | TvResult;
    name?: string;
    popularity?: number;
  }>;
}

export interface CreditDetailsResponse extends Response {
  credit_type?: string;
  department?: string;
  job?: string;
  media?: {
    id?: number;
    name?: string;
    original_name?: string;
    character?: string;
    episodes?: Array<SimpleEpisode>;
    seasons?: Array<{
      air_date?: string;
      poster_path?: string;
      season_number?: number;
    }>;
  };
  media_type?: string;
  id?: string;
  person?: {
    name?: string;
    id?: number;
  };
}

export interface ListsDetailResponse extends Response {
  created_by?: string;
  description?: string;
  favorite_count?: number;
  id?: string;
  items?: Array<MovieResult>;
  item_count?: number;
  iso_639_1?: string;
  name?: string;
  poster_path?: string | null;
}

export interface ListStatusParams extends RequestParams {
  id: string | number;
  movie_id: number;
}

export interface ListsStatusResponse extends Response {
  id?: string;
  item_present?: boolean;
}

export interface CreateListParams extends RequestParams {
  name?: string;
  description?: string;
  language?: string;
}

export interface CreateListResponse extends Response {
  status_message?: string;
  success?: boolean;
  status_code?: number;
  list_id?: number;
}

export interface CreateListItemParams extends IdRequestParams {
  media_id: number;
}

export interface ClearListParams extends IdRequestParams {
  confirm: boolean;
}

export interface GenresResponse extends Response {
  genres?: Array<Genre>;
}

export interface KeywordResponse extends Response {
  id?: number;
  name?: string;
}

export interface KeywordMoviesParams extends IdRequestParams {
  include_adult?: boolean;
}

export interface CompanyAlternativeNamesResponse extends Response {
  id?: number;
  results?: Array<{
    name?: string;
    type?: string;
  }>;
}

export interface CompanyImagesResponse extends Response {
  id?: number;
  logos?: Array<Logo>;
}

export interface AccountInfoResponse extends Response {
  id?: number;
  avatar?: {
    gravatar?: {
      hash?: string;
    };
  };
  iso_639_1?: string;
  iso_3166_1?: string;
  name?: string;
  include_adult?: boolean;
  username?: string;
}

export interface AccountListsResponse extends PaginatedResponse {
  results?: Array<{
    description?: string;
    favorite_count?: number;
    id?: number;
    item_count?: number;
    iso_639_1?: string;
    list_type?: string;
    name?: string;
    poster_path?: null;
  }>;
}

export interface AccountMediaRequest extends PagedRequestParams {
  sort_by?: 'created_at.asc' | 'created_at.desc';
}

export interface MarkAsFavoriteRequest extends IdRequestParams {
  media_type: 'movie' | 'tv';
  media_id: number;
  favorite: boolean;
}

export interface AccountWatchlistRequest extends IdRequestParams {
  media_type: 'movie' | 'tv';
  media_id: number;
  watchlist: boolean;
}

export interface Certification {
  certification?: string;
  meaning?: string;
  order?: number;
}

export interface CertificationsResponse extends Response {
  certifications?: {
    US?: Certification[];
    CA?: Certification[];
    DE?: Certification[];
    GB?: Certification[];
    AU?: Certification[];
    BR?: Certification[];
    FR?: Certification[];
    NZ?: Certification[];
    IN?: Certification[];
  };
}

export type CountriesResponse = Array<Country>;

export interface NetworkResponse extends Response {
  headquarters?: string;
  homepage?: string;
  id?: number;
  name?: string;
  origin_country?: string;
}

export interface Review {
  id?: string;
  author?: string;
  content?: string;
  iso_639_1?: string;
  media_id?: number;
  media_title?: string;
  media_type?: string;
  url?: string;
}

export interface EpisodeGroupResponse extends Response {
  id?: string;
  name?: string;
  description?: string;
  episode_count?: number;
  group_count?: number;
  groups?: Array<{
    id?: string;
    name?: string;
    order?: number;
    locked?: boolean;
    episodes?: Array<SimpleEpisode>;
  }>;
  network?: Network;
  type?: number;
}
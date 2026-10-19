import { MergedCatalogPager } from '../utils/mergedCatalogPager'
import { compareMediaServerItems, type MediaServerBrowseSort } from '../utils/mediaServerBrowseSort'
import { plexPageOrder, type MediaServerPageSort } from '../utils/mediaServerPageSort'
import type { MediaServerConfig } from '../types/mediaServer'
import type {
  MediaServerCardItem,
  MediaServerDownloadInfo,
  MediaServerExternalLink,
  MediaServerHomeData,
  MediaServerHomeLibrarySection,
  MediaServerItemDetail,
  MediaServerLibraryNode,
  MediaServerMediaInfoCard,
  MediaServerPagedCollection,
  MediaServerPagedLibraryPage,
  MediaServerPlaybackInfo,
  MediaServerMusicTrack,
  MediaServerPerson,
  MediaServerSearchData,
  MediaServerSourceOption
} from '../types/mediaServerContent'
import { mediaServerFetch, mediaServerFetchVoid, mediaServerHeaders } from './http'

const PLEX_PAGE_SIZE = 50

interface PlexMediaContainer<T = PlexMetadata> {
  MediaContainer?: {
    size?: number
    totalSize?: number
    librarySectionID?: string | number
    Metadata?: T[]
    Directory?: PlexDirectory[]
    Hub?: PlexHub[]
  }
}

interface PlexHub {
  title?: string
  type?: string
  Metadata?: PlexMetadata[]
  Directory?: PlexDirectory[]
}

interface PlexDirectory {
  key?: string | number
  ratingKey?: string | number
  title?: string
  tag?: string
  type?: string
  childCount?: number
  thumb?: string
  art?: string
}

interface PlexTag {
  id?: string | number
  key?: string | number
  tag?: string
  role?: string
  thumb?: string
}

interface PlexGuid {
  id?: string
}

interface PlexStream {
  id?: string | number
  key?: string
  index?: number
  streamType?: number
  streamTypeID?: number
  type?: string
  codec?: string
  language?: string
  languageCode?: string
  title?: string
  displayTitle?: string
  selected?: boolean | number
  default?: boolean | number
  forced?: boolean | number
  width?: number
  height?: number
  frameRate?: number
  bitrate?: number
  bitDepth?: number
  colorSpace?: string
  chromaLocation?: string
  profile?: string
  level?: number
  channels?: number
  audioChannelLayout?: string
  samplingRate?: number
}

interface PlexPart {
  id?: string | number
  key?: string
  file?: string
  size?: number
  duration?: number
  Stream?: PlexStream[]
}

interface PlexMedia {
  id?: string | number
  duration?: number
  bitrate?: number
  width?: number
  height?: number
  videoCodec?: string
  audioCodec?: string
  videoResolution?: string
  Part?: PlexPart[]
}

interface PlexMetadata {
  ratingKey?: string
  key?: string
  guid?: string
  type?: string
  title?: string
  titleSort?: string
  summary?: string
  tagline?: string
  year?: number
  originallyAvailableAt?: string
  addedAt?: number
  updatedAt?: number
  duration?: number
  rating?: number
  audienceRating?: number
  Rating?: Array<{ type?: string; value?: number }>
  userRating?: number
  viewCount?: number
  viewOffset?: number
  index?: number
  parentIndex?: number
  parentRatingKey?: string
  grandparentRatingKey?: string
  parentTitle?: string
  grandparentTitle?: string
  childCount?: number
  leafCount?: number
  viewedLeafCount?: number
  contentRating?: string
  thumb?: string
  art?: string
  parentThumb?: string
  parentArt?: string
  grandparentThumb?: string
  grandparentArt?: string
  Genre?: PlexTag[]
  Studio?: PlexTag[]
  Role?: PlexTag[]
  Director?: PlexTag[]
  Writer?: PlexTag[]
  Guid?: PlexGuid[]
  Media?: PlexMedia[]
}

const ensurePlexContext = (config: MediaServerConfig) => {
  if (!config.baseUrl) throw new Error('Plex 服务器地址缺失')
  if (!config.accessToken) throw new Error('Plex 登录信息缺失，请重新登录')
}

const containerOf = <T = PlexMetadata>(payload: PlexMediaContainer<T>) => payload.MediaContainer || {}
const metadataOf = (payload: PlexMediaContainer) => containerOf(payload).Metadata || []
const directoriesOf = (payload: PlexMediaContainer) => containerOf(payload).Directory || []
const hubsOf = (payload: PlexMediaContainer) => containerOf(payload).Hub || []

const plexAbsoluteUrl = (config: MediaServerConfig, value?: string) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return new URL(value, `${config.baseUrl.replace(/\/+$/, '')}/`).toString()
}

export const withPlexToken = (config: MediaServerConfig, url: string) => {
  const token = (config.accessToken || '').trim()
  if (!url || !token) return url
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('X-Plex-Token')) parsed.searchParams.set('X-Plex-Token', token)
    return parsed.toString()
  } catch {
    return url
  }
}

const buildPlexImageUrl = (config: MediaServerConfig, value?: string, width = 720, height = 1080) => {
  if (!value) return undefined
  const original = plexAbsoluteUrl(config, value)
  if (!original) return undefined
  const transcode = `${config.baseUrl.replace(/\/+$/, '')}/photo/:/transcode?${new URLSearchParams({
    url: original,
    width: String(width),
    height: String(height),
    minSize: '1',
    upscale: '1'
  }).toString()}`
  return withPlexToken(config, transcode)
}

const formatDateLabel = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const formatSize = (value?: number) => {
  if (!value || value <= 0) return undefined
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = value
  let unitIndex = 0
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024
    unitIndex += 1
  }
  return `${current >= 10 ? current.toFixed(1).replace(/\.0$/, '') : current.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}${units[unitIndex]}`
}

const formatBitrate = (value?: number) => {
  if (!value || value <= 0) return undefined
  return value >= 1_000_000 ? `${Math.round(value / 1_000_000)}Mbps` : `${Math.round(value / 1_000)}kbps`
}

const plexKind = (type?: string): MediaServerCardItem['kind'] => {
  switch ((type || '').toLowerCase()) {
    case 'movie': return 'movie'
    case 'show': return 'series'
    case 'season': return 'season'
    case 'episode': return 'episode'
    case 'person': return 'person'
    case 'folder': return 'folder'
    default: return 'unknown'
  }
}

const collectionTypeFromSection = (type?: string) => {
  const normalized = (type || '').toLowerCase()
  if (normalized === 'movie') return 'movies'
  if (normalized === 'show') return 'tvshows'
  if (normalized === 'artist') return 'music'
  if (normalized === 'photo') return 'photos'
  return normalized || 'media'
}

const plexTypeNumber = (item: PlexMetadata) => {
  switch (plexKind(item.type)) {
    case 'movie': return 1
    case 'series': return 2
    case 'season': return 3
    case 'episode': return 4
    default: return undefined
  }
}

const toRuntimeMinutes = (durationMs?: number) => {
  if (!durationMs) return undefined
  return Math.max(1, Math.round(durationMs / 1000 / 60))
}

const toProgress = (item: PlexMetadata) => {
  if (!item.viewOffset || !item.duration) return undefined
  return Math.max(0, Math.min(100, (item.viewOffset / item.duration) * 100))
}

const isTruthyFlag = (value: unknown) => value === true || value === 1 || value === '1'

const plexRating = (item: PlexMetadata, type: 'audience' | 'critic'): number | undefined =>
  item.Rating?.find(entry => entry.type?.toLowerCase() === type)?.value

const criticPercent = (value?: number): number | undefined => {
  if (!Number.isFinite(value) || (value || 0) <= 0) return undefined
  return (value || 0) <= 10 ? (value || 0) * 10 : value
}

const mapPlexItem = (config: MediaServerConfig, item: PlexMetadata): MediaServerCardItem => {
  const kind = plexKind(item.type)
  const id = String(item.ratingKey || item.key || '')
  const poster = buildPlexImageUrl(config, item.thumb || item.parentThumb || item.grandparentThumb, 720, 1080)
  const backdrop = buildPlexImageUrl(config, item.art || item.parentArt || item.grandparentArt || item.thumb || item.parentThumb || item.grandparentThumb, 1920, 1080)
  const episodePrefix = kind === 'episode' && item.parentIndex && item.index ? `S${item.parentIndex}E${item.index}` : ''
  const title = kind === 'episode' && episodePrefix
    ? `${episodePrefix} · ${item.title || '未命名'}`
    : item.title || '未命名'

  return {
    id,
    serverId: config.id,
    provider: 'plex',
    kind,
    rawType: item.type,
    seriesId: item.grandparentRatingKey || item.parentRatingKey,
    title,
    overview: item.summary,
    poster,
    backdrop,
    images: {
      primary: poster,
      thumb: buildPlexImageUrl(config, item.thumb || item.parentThumb || item.grandparentThumb, 720, 720),
      backdrop,
      parentBackdrop: buildPlexImageUrl(config, item.parentArt || item.grandparentArt, 1920, 1080),
      profile: poster,
      seriesPrimary: buildPlexImageUrl(config, item.grandparentThumb || item.parentThumb, 720, 1080),
      seriesBackdrop: buildPlexImageUrl(config, item.grandparentArt || item.parentArt, 1920, 1080)
    },
    sortName: item.titleSort,
    createdAt: item.addedAt ? item.addedAt * 1000 : undefined,
    criticRating: criticPercent(plexRating(item, 'critic') ?? item.rating),
    playCount: item.viewCount,
    videoBitrate: ((item.Media?.[0]?.Part?.[0]?.Stream?.find(stream => stream.streamType === 1)?.bitrate || item.Media?.[0]?.bitrate || 0) * 1000) || undefined,
    studio: item.Studio?.map(studio => studio.tag).filter(Boolean).join(', '),
    artist: item.type === 'track' ? item.grandparentTitle : undefined,
    officialRating: item.contentRating,
    seriesTitle: item.grandparentTitle || item.parentTitle,
    fileName: item.Media?.[0]?.Part?.[0]?.file?.split(/[\\/]/).filter(Boolean).pop(),
    addedAt: item.addedAt ? item.addedAt * 1000 : undefined,
    premiereDate: item.originallyAvailableAt,
    year: item.year || (item.originallyAvailableAt ? new Date(item.originallyAvailableAt).getFullYear() : undefined),
    genres: (item.Genre || []).map(genre => genre.tag || '').filter(Boolean),
    rating: plexRating(item, 'audience') ?? item.audienceRating ?? item.rating,
    tmdbId: Number([item.guid, ...(item.Guid || []).map(entry => entry.id)].find(id => id?.startsWith('tmdb://'))?.split('://')[1]) || undefined,
    imdbId: [item.guid, ...(item.Guid || []).map(entry => entry.id)].find(id => id?.startsWith('imdb://'))?.split('://')[1],
    runtimeMinutes: toRuntimeMinutes(item.duration),
    progress: toProgress(item),
    parentTitle: item.grandparentTitle || item.parentTitle,
    seasonCount: item.type === 'show' ? item.childCount : undefined,
    seasonNumber: item.parentIndex,
    episodeNumber: item.index,
    isPlayed: (item.viewCount || 0) > 0,
    isFavorite: typeof item.userRating === 'number' && item.userRating >= 9
  }
}

const mapPlexLibraryNode = (config: MediaServerConfig, item: PlexMetadata): MediaServerLibraryNode => ({
  ...mapPlexItem(config, item),
  childCount: item.childCount || item.leafCount,
  collectionType: collectionTypeFromSection(item.type)
})

const mapPlexSection = (config: MediaServerConfig, directory: PlexDirectory): MediaServerHomeLibrarySection => ({
  id: String(directory.key || directory.ratingKey || ''),
  title: directory.title || '未命名媒体库',
  collectionType: collectionTypeFromSection(directory.type),
  items: [],
  total: directory.childCount || 0
})

const mapPlexPerson = (config: MediaServerConfig, person: PlexTag): MediaServerPerson => ({
  id: String(person.id || person.key || person.tag || ''),
  name: person.tag || '未知人物',
  role: person.role,
  image: buildPlexImageUrl(config, person.thumb, 360, 540)
})

const providerLinks = (item: PlexMetadata): MediaServerExternalLink[] => {
  const links: MediaServerExternalLink[] = []
  const push = (title: string, url: string) => {
    if (!links.some((link) => link.url === url)) links.push({ title, url })
  }
  const ids = [item.guid, ...(item.Guid || []).map((entry) => entry.id)].filter(Boolean) as string[]
  for (const id of ids) {
    const [scheme, value] = id.split('://')
    if (!scheme || !value) continue
    if (scheme === 'imdb') push('IMDb', `https://www.imdb.com/title/${value}`)
    if (scheme === 'tmdb') push('TheMovieDb', `https://www.themoviedb.org/${plexKind(item.type) === 'series' ? 'tv' : 'movie'}/${value}`)
    if (scheme === 'tvdb') push('TheTVDB', `https://thetvdb.com/dereferrer/series/${value}`)
  }
  return links
}

const streamKind = (stream: PlexStream): 'video' | 'audio' | 'subtitle' | undefined => {
  const type = (stream.type || '').toLowerCase()
  const numeric = stream.streamType ?? stream.streamTypeID
  if (type === 'video' || numeric === 1) return 'video'
  if (type === 'audio' || numeric === 2) return 'audio'
  if (type === 'subtitle' || numeric === 3) return 'subtitle'
  return undefined
}

const createMediaInfoCardsForPart = (part?: PlexPart, media?: PlexMedia): MediaServerMediaInfoCard[] => {
  const streams = part?.Stream || []
  const cards: MediaServerMediaInfoCard[] = []
  streams.forEach((stream, index) => {
    const kind = streamKind(stream)
    if (!kind) return
    const title = stream.displayTitle || stream.title || (kind === 'video' ? `视频 ${index + 1}` : kind === 'audio' ? `音频 ${index + 1}` : `字幕 ${index + 1}`)
    const commonRows: Array<[string, string | undefined]> = [
      ['序号', stream.index != null ? String(stream.index) : undefined],
      ['语言', stream.language || stream.languageCode],
      ['Codec', stream.codec],
      ['默认', isTruthyFlag(stream.default) ? '是' : undefined],
      ['强制', isTruthyFlag(stream.forced) ? '是' : undefined]
    ]
    const rows = kind === 'video'
      ? [
          ...commonRows,
          ['分辨率', stream.width && stream.height ? `${stream.width}x${stream.height}` : media?.width && media.height ? `${media.width}x${media.height}` : undefined],
          ['帧率', stream.frameRate ? String(stream.frameRate) : undefined],
          ['比特率', formatBitrate(stream.bitrate || media?.bitrate)],
          ['配置', stream.profile],
          ['Level', typeof stream.level === 'number' ? String(stream.level) : undefined],
          ['Bit depth', typeof stream.bitDepth === 'number' ? String(stream.bitDepth) : undefined],
          ['Color space', stream.colorSpace]
        ]
      : kind === 'audio'
        ? [
            ...commonRows,
            ['布局', stream.audioChannelLayout],
            ['Channels', typeof stream.channels === 'number' ? String(stream.channels) : undefined],
            ['比特率', formatBitrate(stream.bitrate)],
            ['Audio sample', stream.samplingRate ? `${stream.samplingRate}Hz` : undefined]
          ]
        : commonRows
    cards.push({
      id: `${kind}:${part?.id || 'primary'}:${stream.id || stream.index || index}`,
      kind,
      title,
      streamIndex: stream.index,
      selected: isTruthyFlag(stream.selected) || isTruthyFlag(stream.default) || (kind === 'video' && !cards.some((card) => card.kind === 'video')),
      rows: rows.filter((row): row is [string, string] => !!row[1]).map(([label, value]) => ({ label, value }))
    })
  })
  return cards
}

const firstPart = (item: PlexMetadata) => item.Media?.[0]?.Part?.[0]
const firstMedia = (item: PlexMetadata) => item.Media?.[0]

const createSourceOptions = (item: PlexMetadata): MediaServerSourceOption[] => {
  return (item.Media || []).flatMap((media, mediaIndex) => {
    return (media.Part || []).map((part, partIndex) => ({
      id: String(part.id || part.key || `${mediaIndex}:${partIndex}`),
      title: part.file?.split(/[\\/]/).filter(Boolean).pop() || `版本 ${mediaIndex + 1}.${partIndex + 1}`,
      fileLabel: part.file?.split(/[\\/]/).filter(Boolean).pop(),
      filePath: part.file,
      fileSubLabel: formatSize(part.size),
      mediaInfoCards: createMediaInfoCardsForPart(part, media)
    }))
  })
}

const mapPlexDetail = (config: MediaServerConfig, item: PlexMetadata): MediaServerItemDetail => ({
  ...mapPlexLibraryNode(config, item),
  genres: (item.Genre || []).map((genre) => genre.tag || '').filter(Boolean),
  studios: (item.Studio || []).map((studio) => studio.tag || '').filter(Boolean),
  people: [...(item.Role || []), ...(item.Director || []), ...(item.Writer || [])].map((person) => mapPlexPerson(config, person)),
  isPlayed: (item.viewCount || 0) > 0,
  isFavorite: typeof item.userRating === 'number' && item.userRating >= 9,
  tagline: item.tagline,
  officialRating: item.contentRating,
  premiereDate: formatDateLabel(item.originallyAvailableAt),
  productionLocations: [],
  externalLinks: providerLinks(item),
  mediaInfoCards: createMediaInfoCardsForPart(firstPart(item), firstMedia(item)),
  sourceOptions: createSourceOptions(item),
  fileLabel: firstPart(item)?.file?.split(/[\\/]/).filter(Boolean).pop(),
  filePath: firstPart(item)?.file,
  fileSubLabel: [formatDateLabel(item.originallyAvailableAt), formatSize(firstPart(item)?.size)].filter(Boolean).join('  '),
  playbackPositionTicks: item.viewOffset ? item.viewOffset * 10_000 : undefined,
  seasonCount: item.childCount,
  chapters: []
})

const fetchPlexMetadata = async (config: MediaServerConfig, path: string) => {
  const payload = await mediaServerFetch<PlexMediaContainer>(config, path)
  return metadataOf(payload)
}

const fetchPlexSections = async (config: MediaServerConfig) => {
  ensurePlexContext(config)
  const payload = await mediaServerFetch<PlexMediaContainer>(config, '/library/sections')
  return directoriesOf(payload)
    .filter((directory) => ['movie', 'show'].includes((directory.type || '').toLowerCase()))
}

const fetchPlexSectionItems = async (
  config: MediaServerConfig,
  sectionId: string,
  page: number,
  options: {
    sort?: string
    genre?: string
    studio?: string
  } = {}
) => {
  const query = new URLSearchParams({
    'X-Plex-Container-Start': String(page * PLEX_PAGE_SIZE),
    'X-Plex-Container-Size': String(PLEX_PAGE_SIZE),
    sort: options.sort || 'titleSort:asc',
    includeGuids: '1',
    includeMeta: '1'
  })
  if (options.genre) {
    const genreKey = await resolvePlexSectionFilterKey(config, sectionId, 'genre', options.genre)
    if (genreKey) query.set('genre', genreKey)
  }
  if (options.studio) {
    const studioKey = await resolvePlexSectionFilterKey(config, sectionId, 'studio', options.studio)
    if (studioKey) query.set('studio', studioKey)
  }
  const payload = await mediaServerFetch<PlexMediaContainer>(config, `/library/sections/${encodeURIComponent(sectionId)}/all?${query.toString()}`)
  const container = containerOf(payload)
  return {
    items: metadataOf(payload),
    total: container.totalSize || metadataOf(payload).length
  }
}

const resolvePlexSectionFilterKey = async (
  config: MediaServerConfig,
  sectionId: string,
  filter: 'genre' | 'studio',
  value: string
) => {
  const normalized = value.trim()
  if (!normalized) return ''
  if (/^\d+$/.test(normalized)) return normalized
  try {
    const payload = await mediaServerFetch<PlexMediaContainer>(config, `/library/sections/${encodeURIComponent(sectionId)}/${filter}`)
    const matched = directoriesOf(payload).find((entry) => {
      const title = (entry.title || entry.tag || '').trim()
      return title === normalized
    })
    return matched?.key != null ? String(matched.key) : normalized
  } catch {
    return normalized
  }
}

const mergedPlexCatalogs = new Map<string, { created: number; pager: Promise<MergedCatalogPager<PlexMetadata>> }>()
const fetchPlexAllSectionsPage = async (
  config: MediaServerConfig, page: number,
  options: { sort?: string; genre?: string; studio?: string } = {}
) => {
  const key = JSON.stringify([config.id, config.baseUrl, config.accessToken, options])
  let cached = mergedPlexCatalogs.get(key)
  if (page === 0 || !cached || Date.now() - cached.created > 300_000) {
    const pager = fetchPlexSections(config).then(sections => {
      const [field, direction] = (options.sort || 'titleSort:asc').split(':')
      const fields: Record<string, MediaServerBrowseSort> = { titleSort: 'sortName', addedAt: 'addedAt', originallyAvailableAt: 'premiereDate',
        rating: 'rating', audienceRating: 'criticRating', duration: 'runtimeMinutes', year: 'year', viewCount: 'playCount',
        'studio.titleSort': 'studio', contentRating: 'officialRating', lastViewedAt: 'seriesDatePlayed' }
      return new MergedCatalogPager(sections.map(section => String(section.key || '')), PLEX_PAGE_SIZE,
        (id, index) => fetchPlexSectionItems(config, id, index, options),
        (a, b) => compareMediaServerItems(mapPlexLibraryNode(config, a), mapPlexLibraryNode(config, b), fields[field] || 'sortName', direction === 'desc' ? 'descending' : 'ascending'),
        item => String(item.ratingKey || ''))
    })
    cached = { created: Date.now(), pager }
    mergedPlexCatalogs.set(key, cached)
    if (mergedPlexCatalogs.size > 16) mergedPlexCatalogs.delete(mergedPlexCatalogs.keys().next().value!)
  }
  return (await cached.pager).page(page)
}

const mapHubMetadata = (payload: PlexMediaContainer) => {
  const direct = metadataOf(payload)
  if (direct.length > 0) return direct
  return hubsOf(payload).flatMap((hub) => hub.Metadata || [])
}

const fetchHub = async (config: MediaServerConfig, path: string) => {
  try {
    const payload = await mediaServerFetch<PlexMediaContainer>(config, path)
    return mapHubMetadata(payload)
  } catch {
    return []
  }
}

export const getPlexMediaServerHomeShell = async (config: MediaServerConfig): Promise<Pick<MediaServerHomeData, 'libraries' | 'statistics'>> => {
  const sections = await fetchPlexSections(config)
  const libraries = sections.map((section) => mapPlexSection(config, section))
  return {
    libraries,
    statistics: {
      libraryCount: libraries.length,
      movieCount: sections.filter((section) => section.type === 'movie').reduce((sum, section) => sum + (section.childCount || 0), 0),
      seriesCount: sections.filter((section) => section.type === 'show').reduce((sum, section) => sum + (section.childCount || 0), 0),
      episodeCount: 0
    }
  }
}

export const getPlexMediaServerHomeWithPreferences = async (config: MediaServerConfig): Promise<MediaServerHomeData> => {
  const shell = await getPlexMediaServerHomeShell(config)
  const [resume, latest, nextUp] = await Promise.all([
    getPlexMediaServerHomeResume(config).catch(() => []),
    getPlexMediaServerHomeLatest(config).catch(() => ({ items: [], total: 0 })),
    getPlexMediaServerHomeNextUp(config).catch(() => ({ items: [], total: 0 }))
  ])
  const libraries = (
    await Promise.all(
      shell.libraries.map(async (library): Promise<MediaServerHomeLibrarySection> => {
        const result = await getPlexMediaServerHomeLibraryLatest(config, library.id).catch(() => ({ items: [], total: library.total || 0 }))
        return {
          ...library,
          items: result.items,
          total: result.total || library.total
        }
      })
    )
  ).filter((section) => section.items.length > 0 || (section.total || 0) > 0)

  return {
    resume,
    latest: latest.items,
    latestTotal: latest.total,
    nextUp: nextUp.items,
    nextUpTotal: nextUp.total,
    libraries,
    statistics: shell.statistics
  }
}

export const getPlexMediaServerExcludedLibraries = async () => []

export const getPlexMediaServerHomeResume = async (config: MediaServerConfig): Promise<MediaServerCardItem[]> => {
  ensurePlexContext(config)
  const items = await fetchHub(config, `/hubs/home/continueWatching?${new URLSearchParams({
    'X-Plex-Container-Start': '0',
    'X-Plex-Container-Size': '20',
    includeMeta: '1'
  }).toString()}`)
  return items.map((item) => mapPlexItem(config, item))
}

export const getPlexMediaServerHomeLatest = async (config: MediaServerConfig): Promise<{ items: MediaServerCardItem[]; total: number }> => {
  ensurePlexContext(config)
  const page = await fetchPlexAllSectionsPage(config, 0, { sort: 'addedAt:desc' })
  return {
    items: page.items.map((item) => mapPlexItem(config, item)),
    total: page.total
  }
}

export const getPlexMediaServerHomeNextUp = async (config: MediaServerConfig, page = 0): Promise<{ items: MediaServerCardItem[]; total: number }> => {
  ensurePlexContext(config)
  const hubPayload = await mediaServerFetch<PlexMediaContainer>(config, `/hubs/home?${new URLSearchParams({
    type: '4',
    'X-Plex-Container-Start': String(page * PLEX_PAGE_SIZE),
    'X-Plex-Container-Size': '50',
    includeMeta: '1'
  }).toString()}`)
  const episodes = mapHubMetadata(hubPayload).filter((item) => plexKind(item.type) === 'episode')
  return {
    items: episodes.map((item) => mapPlexItem(config, item)),
    total: page * PLEX_PAGE_SIZE + episodes.length
  }
}

export const getPlexMediaServerHomeLibraryLatest = async (
  config: MediaServerConfig,
  libraryId: string
): Promise<{ items: MediaServerLibraryNode[]; total: number }> => {
  ensurePlexContext(config)
  const page = await fetchPlexSectionItems(config, libraryId, 0, { sort: 'addedAt:desc' })
  return {
    items: page.items.map((item) => mapPlexLibraryNode(config, item)),
    total: page.total
  }
}

export const getPlexMediaServerLibraries = async (config: MediaServerConfig): Promise<MediaServerLibraryNode[]> => {
  const sections = await fetchPlexSections(config)
  return sections.map((section) => {
    const id = String(section.key || section.ratingKey || '')
    const poster = buildPlexImageUrl(config, section.thumb || section.art, 720, 1080)
    return {
      id,
      serverId: config.id,
      provider: 'plex',
      kind: 'folder',
      rawType: section.type,
      title: section.title || '未命名媒体库',
      poster,
      backdrop: buildPlexImageUrl(config, section.art || section.thumb, 1920, 1080),
      images: { primary: poster },
      childCount: section.childCount,
      collectionType: collectionTypeFromSection(section.type)
    }
  })
}

export const getPlexMediaServerMusicTracks = async (config: MediaServerConfig): Promise<MediaServerMusicTrack[]> => {
  ensurePlexContext(config)
  const sections = (await fetchPlexSections(config)).filter((section) => (section.type || '').toLowerCase() === 'artist')
  const results = await Promise.all(sections.map(async (section) => {
    const sectionId = String(section.key || section.ratingKey || '')
    if (!sectionId) return [] as PlexMetadata[]
    const query = new URLSearchParams({
      type: '10',
      'X-Plex-Container-Start': '0',
      'X-Plex-Container-Size': '5000',
      includeMeta: '1'
    })
    const payload = await mediaServerFetch<PlexMediaContainer>(config, `/library/sections/${encodeURIComponent(sectionId)}/all?${query.toString()}`)
    return metadataOf(payload)
  }))
  const seen = new Set<string>()
  return results.flat().flatMap((item) => {
    const id = String(item.ratingKey || item.key || '')
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{
      id,
      serverId: config.id,
      provider: 'plex' as const,
      serverName: config.name,
      title: item.title || '未命名曲目',
      artist: item.grandparentTitle,
      album: item.parentTitle,
      thumbnail: buildPlexImageUrl(config, item.thumb || item.parentThumb || item.grandparentThumb, 720, 720),
      durationMs: item.duration,
      sourceId: item.Media?.[0]?.Part?.[0]?.id ? String(item.Media[0].Part[0].id) : undefined
    }]
  })
}

export const getPlexMediaServerLibraryPagedItems = async (
  config: MediaServerConfig,
  parentId: string,
  page: number,
  options?: {
    recursiveMedia?: boolean
    collectionType?: string
    order?: MediaServerPageSort
  }
): Promise<MediaServerPagedLibraryPage> => {
  ensurePlexContext(config)
  const recursiveMedia = options?.recursiveMedia !== false
  let result: { items: PlexMetadata[]; total: number }
  if (/^\d+$/.test(parentId) && recursiveMedia) {
    result = await fetchPlexSectionItems(config, parentId, page, { sort: plexPageOrder(options?.order) })
  } else {
    const query = new URLSearchParams({
      'X-Plex-Container-Start': String(page * PLEX_PAGE_SIZE),
      'X-Plex-Container-Size': String(PLEX_PAGE_SIZE),
      includeGuids: '1',
      includeMeta: '1'
    })
    const payload = await mediaServerFetch<PlexMediaContainer>(config, `/library/metadata/${encodeURIComponent(parentId)}/children?${query.toString()}`)
    result = {
      items: metadataOf(payload),
      total: containerOf(payload).totalSize || metadataOf(payload).length
    }
  }
  return {
    key: `${config.id}:${parentId}`,
    items: result.items.map((item) => mapPlexLibraryNode(config, item)),
    total: result.total,
    currentPage: page,
    hasNextPage: result.items.length >= PLEX_PAGE_SIZE
  }
}

export const getPlexMediaServerItemDetail = async (config: MediaServerConfig, itemId: string): Promise<MediaServerItemDetail> => {
  ensurePlexContext(config)
  const items = await fetchPlexMetadata(config, `/library/metadata/${encodeURIComponent(itemId)}?includeGuids=1&includeMeta=1`)
  const item = items[0]
  if (!item) throw new Error('Plex 未返回媒体详情')
  return mapPlexDetail(config, item)
}

const selectedPlexPart = async (config: MediaServerConfig, itemId: string, sourceId?: string) => {
  const items = await fetchPlexMetadata(config, `/library/metadata/${encodeURIComponent(itemId)}?includeGuids=1&includeMeta=1`)
  const item = items[0]
  if (!item) throw new Error('Plex 未返回媒体详情')
  const media = item.Media?.find((entry) => entry.Part?.some((part) => sourceId && String(part.id || part.key) === sourceId)) || item.Media?.[0]
  const part = media?.Part?.find((entry) => sourceId && String(entry.id || entry.key) === sourceId) || media?.Part?.[0]
  if (!part) throw new Error('Plex 未返回可播放媒体源')
  return { item, media, part }
}

export const getPlexMediaServerPlaybackInfo = async (
  config: MediaServerConfig,
  itemId: string,
  sourceId?: string,
  videoStreamIndex?: number
): Promise<MediaServerPlaybackInfo> => {
  ensurePlexContext(config)
  const { item, part } = await selectedPlexPart(config, itemId, sourceId)
  if (!part.key) throw new Error('Plex 未返回可播放地址')
  const videoStream = part.Stream?.find((stream) => streamKind(stream) === 'video')
  const subtitleSources = (part.Stream || [])
    .filter((stream) => streamKind(stream) === 'subtitle' && !!stream.key)
    .map((stream) => ({
      url: withPlexToken(config, plexAbsoluteUrl(config, stream.key || '')),
      title: stream.displayTitle || stream.title || stream.language || stream.languageCode || '字幕',
      streamIndex: stream.index
    }))
  return {
    url: withPlexToken(config, plexAbsoluteUrl(config, part.key)),
    headers: mediaServerHeaders(config),
    subtitleSources,
    playSessionId: String(part.id || item.ratingKey || itemId),
    playCursorSeconds: item.viewOffset ? Math.max(0, Math.floor(item.viewOffset / 1000)) : 0,
    videoStreamIndex: typeof videoStreamIndex === 'number' && videoStreamIndex >= 0 ? videoStreamIndex : videoStream?.index
  }
}

export const getPlexMediaServerDownloadInfo = async (
  config: MediaServerConfig,
  itemId: string,
  sourceId?: string
): Promise<MediaServerDownloadInfo> => {
  ensurePlexContext(config)
  const { item, part } = await selectedPlexPart(config, itemId, sourceId)
  if (!part.key) throw new Error('Plex 未返回可下载地址')
  return {
    url: withPlexToken(config, plexAbsoluteUrl(config, part.key)),
    headers: mediaServerHeaders(config),
    fileName: part.file?.split(/[\\/]/).filter(Boolean).pop() || item.title || item.ratingKey || 'media',
    fileSize: part.size || 0,
    sourceId: String(part.id || part.key || '')
  }
}

export const reportPlexMediaServerPlaybackProgress = async (
  config: MediaServerConfig,
  itemId: string,
  state: 'playing' | 'stopped',
  positionSeconds: number
) => {
  ensurePlexContext(config)
  const detail = await getPlexMediaServerItemDetail(config, itemId)
  const query = new URLSearchParams({
    key: `/library/metadata/${itemId}`,
    ratingKey: itemId,
    state,
    time: String(Math.max(0, Math.floor(positionSeconds * 1000))),
    duration: String(Math.max(0, (detail.runtimeMinutes || 0) * 60 * 1000))
  })
  await mediaServerFetchVoid(config, `/:/progress?${query.toString()}`)
}

export const updatePlexMediaServerPlayedState = async (
  config: MediaServerConfig,
  itemId: string,
  isPlayed: boolean
) => {
  ensurePlexContext(config)
  const action = isPlayed ? 'unscrobble' : 'scrobble'
  await mediaServerFetchVoid(config, `/:/${action}?${new URLSearchParams({ key: itemId, identifier: 'com.plexapp.plugins.library' }).toString()}`, {
    method: 'PUT'
  })
}

export const updatePlexMediaServerFavoriteState = async (
  config: MediaServerConfig,
  itemId: string,
  isFavorite: boolean
) => {
  ensurePlexContext(config)
  await mediaServerFetchVoid(config, `/:/rate?${new URLSearchParams({
    key: itemId,
    identifier: 'com.plexapp.plugins.library',
    rating: isFavorite ? '-1' : '10'
  }).toString()}`, {
    method: 'PUT'
  })
}

export const getPlexMediaServerSimilarItems = async (
  config: MediaServerConfig,
  itemId: string
): Promise<MediaServerLibraryNode[]> => {
  ensurePlexContext(config)
  const items = await fetchPlexMetadata(config, `/library/metadata/${encodeURIComponent(itemId)}/similar?${new URLSearchParams({
    'X-Plex-Container-Start': '0',
    'X-Plex-Container-Size': '24',
    includeGuids: '1'
  }).toString()}`)
  return items.map((item) => mapPlexLibraryNode(config, item))
}

export const getPlexMediaServerCollectionPage = async (
  config: MediaServerConfig,
  kind: 'latest' | 'nextup',
  page: number,
  order: MediaServerPageSort = {}
): Promise<MediaServerPagedCollection> => {
  ensurePlexContext(config)
  if (kind === 'nextup') {
    const all = await getPlexMediaServerHomeNextUp(config, page)
    const items = all.items.map((item) => ({ ...item, childCount: undefined, collectionType: item.kind }))
    return {
      key: kind,
      items,
      total: all.total,
      currentPage: page,
      hasNextPage: items.length >= PLEX_PAGE_SIZE
    }
  }
  const latest = await fetchPlexAllSectionsPage(config, page, { sort: plexPageOrder(order, 'addedAt:desc') })
  return {
    key: kind,
    items: latest.items.map((item) => mapPlexLibraryNode(config, item)),
    total: latest.total,
    currentPage: page,
    hasNextPage: latest.hasNextPage
  }
}

export const getPlexMediaServerPersonPagedItems = async (
  config: MediaServerConfig,
  personId: string,
  page: number
): Promise<MediaServerPagedLibraryPage> => {
  ensurePlexContext(config)
  const payload = await mediaServerFetch<PlexMediaContainer>(config, `/library/people/${encodeURIComponent(personId)}/media?${new URLSearchParams({
    'X-Plex-Container-Start': String(page * PLEX_PAGE_SIZE),
    'X-Plex-Container-Size': String(PLEX_PAGE_SIZE),
    includeGuids: '1'
  }).toString()}`)
  const items = metadataOf(payload)
  return {
    key: `${config.id}:${personId}`,
    items: items.map((item) => mapPlexLibraryNode(config, item)),
    total: containerOf(payload).totalSize || items.length,
    currentPage: page,
    hasNextPage: items.length >= PLEX_PAGE_SIZE
  }
}

export const getPlexMediaServerFilteredPagedItems = async (
  config: MediaServerConfig,
  page: number,
  options: {
    genre?: string
    studio?: string
    order?: MediaServerPageSort
  }
): Promise<MediaServerPagedLibraryPage> => {
  ensurePlexContext(config)
  const pageData = await fetchPlexAllSectionsPage(config, page, {
    sort: plexPageOrder(options.order),
    genre: options.genre,
    studio: options.studio
  })
  const key = options.genre
    ? `${config.id}:genre:${options.genre}`
    : `${config.id}:studio:${options.studio || ''}`
  return {
    key,
    items: pageData.items.map((item) => mapPlexLibraryNode(config, item)),
    total: pageData.total,
    currentPage: page,
    hasNextPage: pageData.hasNextPage
  }
}

export const getPlexMediaServerSuggestions = async (
  config: MediaServerConfig
): Promise<MediaServerLibraryNode[]> => {
  const latest = await getPlexMediaServerHomeLatest(config)
  return latest.items.slice(0, 16).map((item) => ({ ...item, childCount: undefined, collectionType: item.kind }))
}

export const getPlexMediaServerSearch = async (
  config: MediaServerConfig,
  query: string
): Promise<MediaServerSearchData> => {
  ensurePlexContext(config)
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return { query: '', items: [] }
  const payload = await mediaServerFetch<PlexMediaContainer>(config, `/hubs/search?${new URLSearchParams({
    query: trimmedQuery,
    limit: '60',
    includeCollections: '1',
    includeExternalMedia: '0',
    includeMeta: '1'
  }).toString()}`)
  const items = mapHubMetadata(payload)
  return {
    query: trimmedQuery,
    items: items.map((item) => mapPlexLibraryNode(config, item))
  }
}

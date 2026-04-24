import type { MediaServerCardItem, MediaServerImageSources } from '../types/mediaServerContent'

export type MediaServerPosterMode = 'portrait' | 'landscape' | 'cinematic' | 'episode-still' | 'hero' | 'person' | 'logo'

const compact = (values: Array<string | undefined>) => values.filter((value): value is string => !!value)

const typeKey = (item?: Pick<MediaServerCardItem, 'rawType' | 'kind'>) => {
  return (item?.rawType || item?.kind || '').toLowerCase()
}

const isEpisodeLike = (item?: Pick<MediaServerCardItem, 'rawType' | 'kind'>) => {
  const key = typeKey(item)
  return key === 'episode'
}

const isSeriesLike = (item?: Pick<MediaServerCardItem, 'rawType' | 'kind'>) => {
  const key = typeKey(item)
  return key === 'series' || key === 'season' || key === 'show'
}

const imageListForMode = (
  item?: Pick<MediaServerCardItem, 'rawType' | 'kind'> & { images?: MediaServerImageSources },
  mode: MediaServerPosterMode = 'portrait'
) => {
  const images = item?.images || {}

  if (mode === 'person') {
    return compact([
      images.primary,
      images.profile,
      images.thumb,
      images.backdrop
    ])
  }

  if (mode === 'logo') {
    return compact([
      images.logo
    ])
  }

  if (mode === 'hero') {
    return compact([
      images.backdrop,
      images.parentBackdrop,
      images.seriesBackdrop
    ])
  }

  if (mode === 'episode-still') {
    return compact([
      images.screenshot,
      images.primary,
      images.thumb,
      images.backdrop,
      images.seriesBackdrop,
      images.seriesThumb,
      images.seriesPrimary
    ])
  }

  if (mode === 'cinematic') {
    if (isEpisodeLike(item) || isSeriesLike(item)) {
      return compact([
        images.seriesBackdrop,
        images.parentBackdrop,
        images.backdrop,
        images.screenshot,
        images.seriesThumb,
        images.primary,
        images.thumb,
        images.seriesPrimary
      ])
    }

    return compact([
      images.backdrop,
      images.parentBackdrop,
      images.primary,
      images.thumb
    ])
  }

  if (mode === 'landscape') {
    if (isEpisodeLike(item) || isSeriesLike(item)) {
      return compact([
        images.seriesBackdrop,
        images.seriesThumb,
        images.parentBackdrop,
        images.backdrop,
        images.screenshot,
        images.primary,
        images.thumb,
        images.seriesPrimary
      ])
    }

    return compact([
      images.backdrop,
      images.parentBackdrop,
      images.primary,
      images.thumb
    ])
  }

  if (mode === 'portrait') {
    if (typeKey(item) === 'person') {
      return compact([
        images.profile,
        images.primary,
        images.thumb,
        images.backdrop
      ])
    }

    if (isEpisodeLike(item)) {
      return compact([
        images.primary,
        images.seriesPrimary
      ])
    }

    return compact([
      images.primary,
      images.profile
    ])
  }

  return compact([
    images.primary,
    images.backdrop,
    images.thumb
  ])
}

export const resolveMediaServerImage = (
  item?: Pick<MediaServerCardItem, 'rawType' | 'kind' | 'poster' | 'backdrop'> & { images?: MediaServerImageSources },
  mode: MediaServerPosterMode = 'portrait'
) => {
  const candidates = imageListForMode(item, mode)
  if (candidates.length > 0) return candidates[0]

  if (mode === 'logo') {
    return ''
  }

  if (mode === 'landscape' || mode === 'cinematic' || mode === 'episode-still') {
    return item?.backdrop || item?.poster || ''
  }

  return item?.poster || item?.backdrop || ''
}

export const resolveMediaServerImageCandidates = (
  item?: Pick<MediaServerCardItem, 'rawType' | 'kind' | 'poster' | 'backdrop'> & { images?: MediaServerImageSources },
  mode: MediaServerPosterMode = 'portrait'
) => {
  const candidates = imageListForMode(item, mode)
  if (candidates.length > 0) return candidates
  return compact([item?.poster, item?.backdrop])
}

import type { MediaServerConfig } from '../types/mediaServer'

const APP_NAME = 'XbyBoxPlayer'
const APP_VERSION = '1.0.0'

const createMediaBrowserAuthorization = (config: MediaServerConfig) => {
  const fields = [
    `Token="${config.accessToken || ''}"`,
    `UserId="${config.userId || ''}"`,
    `Client="${APP_NAME}"`,
    `Device="${APP_NAME}"`,
    `DeviceId="${config.deviceId || ''}"`,
    `Version="${APP_VERSION}"`
  ]
  return `MediaBrowser ${fields.join(', ')}`
}

export const mediaServerHeaders = (config: MediaServerConfig): Record<string, string> => {
  if (config.type === 'emby') {
    return {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': createMediaBrowserAuthorization(config),
      'X-Emby-Token': config.accessToken || ''
    }
  }

  if (config.type === 'plex') {
    return {
      Accept: 'application/json',
      'X-Plex-Token': config.accessToken || '',
      'X-Plex-Product': APP_NAME,
      'X-Plex-Client-Identifier': config.deviceId || ''
    }
  }

  return {
    'Content-Type': 'application/json',
    Authorization: createMediaBrowserAuthorization(config)
  }
}

export const mediaServerFetch = async <T = any>(config: MediaServerConfig, requestPath: string, init?: RequestInit): Promise<T> => {
  const url = requestPath.startsWith('http')
    ? requestPath
    : `${config.baseUrl.replace(/\/+$/, '')}${requestPath.startsWith('/') ? requestPath : `/${requestPath}`}`
  const headers: Record<string, string> = {
    ...mediaServerHeaders(config),
    ...((init?.headers || {}) as Record<string, string>)
  }
  const response = await fetch(url, {
    ...init,
    headers
  })
  if (!response.ok) {
    throw new Error(`${config.type === 'emby' ? 'Emby' : config.type === 'jellyfin' ? 'Jellyfin' : 'Plex'} 请求失败 (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const mediaServerFetchVoid = async (config: MediaServerConfig, requestPath: string, init?: RequestInit): Promise<void> => {
  const url = requestPath.startsWith('http')
    ? requestPath
    : `${config.baseUrl.replace(/\/+$/, '')}${requestPath.startsWith('/') ? requestPath : `/${requestPath}`}`
  const headers: Record<string, string> = {
    ...mediaServerHeaders(config),
    ...((init?.headers || {}) as Record<string, string>)
  }
  const response = await fetch(url, {
    ...init,
    headers
  })
  if (!response.ok) {
    throw new Error(`${config.type === 'emby' ? 'Emby' : config.type === 'jellyfin' ? 'Jellyfin' : 'Plex'} 请求失败 (${response.status})`)
  }
}

export const buildMediaServerImageUrl = (
  config: MediaServerConfig,
  itemId: string,
  imageType: string = 'Primary',
  tag?: string
) => {
  const query = new URLSearchParams()
  if (tag) query.set('tag', tag)
  query.set('quality', '80')
  if (imageType === 'Primary' || imageType === 'Thumb' || imageType === 'Logo' || imageType === 'Profile') {
    query.set('maxHeight', '840')
    query.set('maxWidth', '560')
  } else {
    query.set('maxHeight', '1080')
    query.set('maxWidth', '1920')
  }
  if (config.type === 'plex' && config.accessToken) {
    query.set('X-Plex-Token', config.accessToken)
  }
  return `${config.baseUrl.replace(/\/+$/, '')}/Items/${itemId}/Images/${imageType}?${query.toString()}`
}

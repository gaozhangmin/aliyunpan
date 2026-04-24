import type { MediaServerConfig } from '../types/mediaServer'
import type { MediaServerSignInInput } from './adapters/base'
import { getMediaServerAdapter } from './adapters'

interface MediaServerLoginProfile {
  serverName?: string
}

export const signInMediaServer = async (input: MediaServerSignInInput) => {
  const adapter = getMediaServerAdapter(input.type)
  if (!adapter) {
    throw new Error(`${input.type} 暂未接入登录流程`)
  }
  return adapter.signIn(input)
}



export const fetchMediaServerLoginProfile = async (config: Pick<MediaServerConfig, 'type' | 'baseUrl' | 'accessToken'>): Promise<MediaServerLoginProfile> => {
  if (config.type === 'plex') return {}
  const headers: Record<string, string> = {}
  if (config.accessToken) {
    if (config.type === 'emby') {
      headers['X-Emby-Token'] = config.accessToken
    } else {
      headers.Authorization = `MediaBrowser Token="${config.accessToken}"`
      headers['X-Emby-Token'] = config.accessToken
    }
  }

  const tryPaths = ['/System/Info/Public', '/System/Info']
  for (const path of tryPaths) {
    try {
      const response = await fetch(`${config.baseUrl}${path}`, { headers })
      if (!response.ok) continue
      const payload = await response.json() as any
      const serverName = payload.ServerName || payload.serverName || payload.Name || payload.name
      if (serverName) return { serverName }
    } catch {
      // ignore and try next path
    }
  }
  return {}
}

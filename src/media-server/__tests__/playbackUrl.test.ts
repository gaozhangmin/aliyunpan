import { describe, expect, it } from 'vitest'
import { withMediaServerPlaybackAuth } from '../contentGateway'
import type { MediaServerConfig } from '../../types/mediaServer'

const baseConfig = (type: MediaServerConfig['type']): MediaServerConfig => ({
  id: 'server-1',
  type,
  name: 'Test Server',
  baseUrl: 'http://127.0.0.1:8096',
  accessToken: 'token-123',
  userId: 'user-1',
  deviceId: 'device-1',
  createdAt: 1,
  updatedAt: 1
})

describe('withMediaServerPlaybackAuth', () => {
  it('adds jellyfin and emby token query for direct browser playback', () => {
    const url = withMediaServerPlaybackAuth(baseConfig('jellyfin'), 'http://127.0.0.1:8096/Videos/abc/stream.mkv?static=true')
    expect(url).toContain('static=true')
    expect(url).toContain('api_key=token-123')
    expect(url).toContain('X-Emby-Token=token-123')
  })

  it('adds plex token query for direct browser playback', () => {
    const url = withMediaServerPlaybackAuth(baseConfig('plex'), 'http://127.0.0.1:32400/library/parts/1/file.mkv')
    expect(url).toContain('X-Plex-Token=token-123')
  })

  it('does not duplicate existing token query values', () => {
    const url = withMediaServerPlaybackAuth(baseConfig('jellyfin'), 'http://127.0.0.1:8096/Videos/abc/stream.mkv?api_key=existing')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('api_key')).toBe('existing')
    expect(parsed.searchParams.get('X-Emby-Token')).toBe('token-123')
  })

  it('returns the original url when token or url is missing', () => {
    const config = { ...baseConfig('emby'), accessToken: '' }
    expect(withMediaServerPlaybackAuth(config, 'http://127.0.0.1:8096/video.mkv')).toBe('http://127.0.0.1:8096/video.mkv')
    expect(withMediaServerPlaybackAuth(baseConfig('emby'), '')).toBe('')
  })
})

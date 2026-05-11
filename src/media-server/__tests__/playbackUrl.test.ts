import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMediaServerPlaybackInfo, withMediaServerPlaybackAuth } from '../contentGateway'
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

describe('getMediaServerPlaybackInfo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers the playback media source matching both source id and etag', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              { Id: 'source-1', ETag: 'etag-wrong', Protocol: 'http', DirectStreamUrl: '/Videos/item-1/wrong.mkv' },
              { Id: 'source-1', ETag: 'etag-right', Protocol: 'http', DirectStreamUrl: '/Videos/item-1/right.mkv' }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'etag-right' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    }))

    const playback = await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1')

    expect(playback.url).toContain('/Videos/item-1/right.mkv')
  })

  it('adds the item etag to fallback stream urls', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    }))

    const playback = await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1')
    const url = new URL(playback.url)

    expect(url.pathname).toBe('/Videos/item-1/stream')
    expect(url.searchParams.get('tag')).toBe('item-etag')
  })

  it('throws when playback info does not include the requested source id and etag pair', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              { Id: 'source-1', ETag: 'etag-wrong', DirectStreamUrl: '/Videos/item-1/wrong.mkv' }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'etag-right' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    }))

    await expect(getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1'))
      .rejects
      .toThrow('Matching media source not in playback info')
  })

  it('submits the max bitrate and forced direct play profile in direct play mode', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1', -1, -1, -1, 'max', 'directPlay')
    const playbackInfoCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/PlaybackInfo?'))
    const requestUrl = new URL(String(playbackInfoCall?.[0]))
    const requestBody = JSON.parse(String(playbackInfoCall?.[1]?.body || '{}'))

    expect(requestUrl.searchParams.get('MaxStreamingBitrate')).toBe('360000000')
    expect(requestBody.DeviceProfile).toEqual(expect.objectContaining({
      MaxStreamingBitrate: 360000000,
      MaxStaticBitrate: 360000000,
      MusicStreamingTranscodingBitrate: 360000000,
      DirectPlayProfiles: [{ Type: 'Video' }]
    }))
  })

  it('uses direct stream urls for http protocol sources even when a transcode url exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              {
                Id: 'source-1',
                ETag: 'source-etag',
                Protocol: 'http',
                DirectStreamUrl: '/Videos/item-1/direct.mp4',
                TranscodingUrl: '/Videos/item-1/master.m3u8'
              }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    }))

    const playback = await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1', -1, -1, -1, 'max', 'mostCompatible')

    expect(playback.url).toContain('/Videos/item-1/direct.mp4')
  })

  it('requests a browser compatible transcode when media server quality limits bitrate', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              {
                Id: 'source-1',
                ETag: 'source-etag',
                DirectStreamUrl: '/Videos/item-1/direct-hevc.mkv',
                TranscodingUrl: '/Videos/item-1/master.m3u8?VideoCodec=h264'
              }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const playback = await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1', -1, -1, -1, '20000000')
    const playbackInfoCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/PlaybackInfo?'))
    const requestUrl = new URL(String(playbackInfoCall?.[0]))
    const requestBody = JSON.parse(String(playbackInfoCall?.[1]?.body || '{}'))

    expect(requestUrl.searchParams.get('MaxStreamingBitrate')).toBe('20000000')
    expect(requestBody.DeviceProfile).toEqual(expect.objectContaining({
      MaxStreamingBitrate: 20000000
    }))
    expect(playback.url).toContain('/Videos/item-1/master.m3u8')
  })

  it('uses the transcode url when media server compatibility is most compatible', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              {
                Id: 'source-1',
                ETag: 'source-etag',
                DirectStreamUrl: '/Videos/item-1/direct-hevc.mkv',
                TranscodingUrl: '/Videos/item-1/master.m3u8?VideoCodec=h264'
              }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    }))

    const playback = await getMediaServerPlaybackInfo(baseConfig('jellyfin'), 'item-1', 'source-1', -1, -1, -1, 'max', 'mostCompatible')

    expect(playback.url).toContain('/Videos/item-1/master.m3u8')
  })

  it('adds saved custom device profiles to the default profile for playback info requests', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      const payload = url.includes('/PlaybackInfo?')
        ? {
            PlaySessionId: 'play-session-1',
            MediaSources: [
              {
                Id: 'source-1',
                ETag: 'source-etag',
                DirectStreamUrl: '/Videos/item-1/direct.mkv'
              }
            ]
          }
        : {
            Id: 'item-1',
            ETag: 'item-etag',
            MediaSources: [
              { Id: 'source-1', ETag: 'source-etag' }
            ]
          }

      return {
        ok: true,
        json: async () => payload
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    await getMediaServerPlaybackInfo(
      baseConfig('jellyfin'),
      'item-1',
      'source-1',
      -1,
      -1,
      -1,
      'max',
      'custom',
      {
        Action: 'add',
        DirectPlayProfiles: [
          {
            Type: 'Video',
            Container: 'mp4',
            VideoCodec: 'h264',
            AudioCodec: 'aac'
          }
        ],
        TranscodingProfiles: [
          {
            Type: 'Video',
            Container: 'mp4',
            Protocol: 'http',
            VideoCodec: 'h264',
            AudioCodec: 'aac',
            Context: 'Streaming'
          }
        ]
      }
    )
    const playbackInfoCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/PlaybackInfo?'))
    const requestBody = JSON.parse(String(playbackInfoCall?.[1]?.body || '{}'))

    expect(requestBody.DeviceProfile.DirectPlayProfiles).toContainEqual(
      {
        Type: 'Video',
        Container: 'mp4',
        VideoCodec: 'h264',
        AudioCodec: 'aac'
      }
    )
    expect(requestBody.DeviceProfile.DirectPlayProfiles.length).toBeGreaterThan(1)
    expect(requestBody.DeviceProfile.TranscodingProfiles).toContainEqual(
      {
        Type: 'Video',
        Container: 'mp4',
        Protocol: 'http',
        VideoCodec: 'h264',
        AudioCodec: 'aac',
        Context: 'Streaming'
      }
    )
    expect(requestBody.DeviceProfile.TranscodingProfiles.length).toBeGreaterThan(1)
  })
})

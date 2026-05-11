import { describe, expect, it } from 'vitest'
import { buildUpstreamProxyHeaders } from '../proxyHeaders'
import { shouldRefreshProxyUrl } from '../proxyCache'

describe('buildUpstreamProxyHeaders', () => {
  it('keeps range and media auth headers while dropping conditional and hop-by-hop headers', () => {
    const headers = buildUpstreamProxyHeaders({
      host: '127.0.0.1:4961',
      connection: 'keep-alive',
      range: 'bytes=32768-33051',
      'if-none-match': '"b968913fc5e95732a0646ac5c32db3db"',
      'accept-encoding': 'gzip, deflate, br',
      referer: 'https://www.aliyundrive.com/',
      authorization: 'Bearer local-token',
      'user-agent': 'Mozilla/5.0'
    }, JSON.stringify({
      'X-Emby-Authorization': 'MediaBrowser Token="server-token"',
      'X-Emby-Token': 'server-token'
    }))

    expect(headers.range).toBe('bytes=32768-33051')
    expect(headers['x-emby-authorization']).toBe('MediaBrowser Token="server-token"')
    expect(headers['x-emby-token']).toBe('server-token')
    expect(headers['accept-encoding']).toBe('identity')
    expect(headers.host).toBeUndefined()
    expect(headers.connection).toBeUndefined()
    expect(headers['if-none-match']).toBeUndefined()
    expect(headers.referer).toBeUndefined()
    expect(headers.authorization).toBeUndefined()
  })
})

describe('shouldRefreshProxyUrl', () => {
  it('does not refresh media server proxy urls through cloud drive APIs', () => {
    expect(shouldRefreshProxyUrl({
      driveId: 'media_server',
      proxyUrl: 'https://emby.example/Videos/1555651/stream',
      proxyInfo: {
        file_id: '1555651',
        expires_time: 1,
        videoQuality: 'Origin'
      },
      fileId: '1555651',
      selectQuality: 'FHD'
    })).toBe(false)
  })
})

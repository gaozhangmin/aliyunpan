import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aliPost, aliRefreshToken } from '../providers/aliyunHttp.mjs'
import { aliListDir, aliListAll, aliRenameBatch } from '../providers/aliyunFiles.mjs'
import { createAliyunProvider } from '../providers/aliyun.mjs'

const MOCK_TOKEN = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  device_id: 'test-device-id',
  signature: 'test-signature',
  user_id: 'user-001',
  default_drive_id: 'drive-001',
  token_type: 'Bearer',
}

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  })
}

describe('aliyunHttp - aliPost', () => {
  beforeEach(() => { vi.stubGlobal('fetch', undefined) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('posts to api.aliyundrive.com for regular paths', async () => {
    const fetchMock = mockFetch({ items: [], next_marker: '' })
    vi.stubGlobal('fetch', fetchMock)

    await aliPost('adrive/v3/file/list', { drive_id: 'x' }, MOCK_TOKEN)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('api.aliyundrive.com')
    expect(opts.headers['Authorization']).toBe('Bearer test-access-token')
    expect(opts.headers['x-device-id']).toBe('test-device-id')
    expect(opts.headers['x-signature']).toBe('test-signature')
    expect(opts.headers['x-request-id']).toBeTruthy()
  })

  it('posts to openapi.alipan.com for v1.0 paths', async () => {
    const fetchMock = mockFetch({ items: [], next_marker: '' })
    vi.stubGlobal('fetch', fetchMock)

    await aliPost('adrive/v1.0/openFile/list', {}, {
      ...MOCK_TOKEN,
      open_api_access_token: 'open-token',
      open_api_token_type: 'Bearer',
    })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('openapi.alipan.com')
    expect(opts.headers['Authorization']).toBe('Bearer open-token')
    expect(opts.headers['x-device-id']).toBeUndefined()
  })

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'Unauthorized' }, 401))
    await expect(aliPost('adrive/v3/file/list', {}, MOCK_TOKEN)).rejects.toThrow('401')
  })
})

describe('aliyunHttp - aliRefreshToken', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('calls auth.aliyundrive.com with refresh_token grant', async () => {
    const fetchMock = mockFetch({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_in: 7200,
      token_type: 'Bearer',
      user_id: 'user-001',
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await aliRefreshToken(MOCK_TOKEN)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('auth.aliyundrive.com')
    const body = JSON.parse(opts.body)
    expect(body.grant_type).toBe('refresh_token')
    expect(body.refresh_token).toBe('test-refresh-token')
    expect(result.access_token).toBe('new-access')
    expect(result.refresh_token).toBe('new-refresh')
  })

  it('preserves existing token fields that are missing from response', async () => {
    vi.stubGlobal('fetch', mockFetch({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    }))

    const result = await aliRefreshToken({ ...MOCK_TOKEN, device_id: 'keep-me' })
    expect(result.device_id).toBe('keep-me')
  })

  it('throws on auth failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'invalid refresh token' }, 400))
    await expect(aliRefreshToken(MOCK_TOKEN)).rejects.toThrow('refresh failed')
  })
})

describe('aliyunFiles - aliListDir', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('maps API response to FileItem array', async () => {
    vi.stubGlobal('fetch', mockFetch({
      items: [
        {
          file_id: 'f1', parent_file_id: 'root', drive_id: 'drive-001',
          name: 'Movie.mkv', type: 'file', size: 1024,
          content_hash: 'abc', mime_type: 'video/x-matroska',
          category: 'video', updated_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          file_id: 'dir1', parent_file_id: 'root', drive_id: 'drive-001',
          name: 'Movies', type: 'folder',
          updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
        },
      ],
      next_marker: '',
    }))

    const { items, nextMarker } = await aliListDir(MOCK_TOKEN, 'drive-001', 'root')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      provider: 'aliyun',
      fileId: 'f1',
      name: 'Movie.mkv',
      type: 'file',
      size: 1024,
    })
    expect(items[1]).toMatchObject({ type: 'folder', name: 'Movies' })
    expect(nextMarker).toBe('')
  })

  it('passes marker for pagination', async () => {
    const fetchMock = mockFetch({ items: [], next_marker: '' })
    vi.stubGlobal('fetch', fetchMock)

    await aliListDir(MOCK_TOKEN, 'drive-001', 'root', 'cursor-xyz')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.marker).toBe('cursor-xyz')
  })
})

describe('aliyunFiles - aliListAll', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('paginates until next_marker is empty', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++
      const isFirst = callCount === 1
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [{ file_id: `f${callCount}`, parent_file_id: 'root', drive_id: 'drive-001',
            name: `file${callCount}.mkv`, type: 'file',
            updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' }],
          next_marker: isFirst ? 'page2' : '',
        }),
      })
    }))

    const items = await aliListAll(MOCK_TOKEN, 'drive-001', 'root')
    expect(items).toHaveLength(2)
    expect(callCount).toBe(2)
  })
})

describe('aliyunFiles - aliRenameBatch', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('sends batch request with correct structure', async () => {
    const fetchMock = mockFetch({
      responses: [
        { id: 'f1', status: 200, body: { name: 'New Name.mkv' } },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await aliRenameBatch(MOCK_TOKEN, 'drive-001', [
      { fileId: 'f1', newName: 'New Name.mkv' },
    ])

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.requests).toHaveLength(1)
    expect(body.requests[0].url).toBe('/file/update')
    expect(body.requests[0].body.name).toBe('New Name.mkv')
    expect(body.requests[0].body.check_name_mode).toBe('refuse')
    expect(results[0]).toMatchObject({ fileId: 'f1', status: 'success', newName: 'New Name.mkv' })
  })

  it('reports error status for failed batch items', async () => {
    vi.stubGlobal('fetch', mockFetch({
      responses: [
        { id: 'f2', status: 409, body: { code: 'AlreadyExist', message: 'name conflict' } },
      ],
    }))

    const results = await aliRenameBatch(MOCK_TOKEN, 'drive-001', [
      { fileId: 'f2', newName: 'Conflict.mkv' },
    ])
    expect(results[0]).toMatchObject({ fileId: 'f2', status: 'error', code: 'AlreadyExist' })
  })

  it('splits into chunks of 100', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: Array.from({ length: 100 }, (_, i) => ({
          id: `f${i}`, status: 200, body: { name: `file${i}.mkv` },
        })),
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const renames = Array.from({ length: 150 }, (_, i) => ({ fileId: `f${i}`, newName: `file${i}.mkv` }))
    await aliRenameBatch(MOCK_TOKEN, 'drive-001', renames)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(firstBody.requests).toHaveLength(100)
    expect(secondBody.requests).toHaveLength(50)
  })
})

describe('createAliyunProvider', () => {
  it('exposes correct capabilities', () => {
    const provider = createAliyunProvider()
    expect(provider.id).toBe('aliyun')
    expect(provider.capabilities.batchRename).toBe(true)
    expect(provider.capabilities.recursiveWalk).toBe(true)
    expect(provider.capabilities.permanentDelete).toBe(false)
  })

  it('auth.login throws ERR_PROVIDER_OPERATION_UNIMPLEMENTED', async () => {
    const provider = createAliyunProvider()
    await expect(provider.auth.login()).rejects.toMatchObject({
      code: 'ERR_PROVIDER_OPERATION_UNIMPLEMENTED',
    })
  })

  it('auth.refresh calls aliRefreshToken', async () => {
    vi.stubGlobal('fetch', mockFetch({
      access_token: 'refreshed', refresh_token: 'new-refresh', user_id: 'u1',
    }))
    const provider = createAliyunProvider()
    const result = await provider.auth.refresh(MOCK_TOKEN)
    expect(result.access_token).toBe('refreshed')
    vi.unstubAllGlobals()
  })
})

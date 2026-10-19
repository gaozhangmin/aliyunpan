import { describe, expect, it, vi } from 'vitest'
import { TraktClient, type TraktTokens } from '../traktClient'
import { traktPayload } from '../../../../shared/trakt'
const movie = { type: 'movie' as const, tmdbId: 123 }
const token: TraktTokens = { access_token: 'test-access', refresh_token: 'test-refresh', created_at: 1000, expires_in: 3600 }
const response = (status: number, data: unknown, headers?: Record<string, string>) => new Response(JSON.stringify(data), { status, headers })
function setup(tokens?: TraktTokens) {
  let time = 1000000
  const store = { read: vi.fn(async () => tokens), write: vi.fn(async (_tokens: TraktTokens) => undefined), clear: vi.fn(async () => undefined) }
  const request = vi.fn<typeof fetch>()
  const client = new TraktClient('test-client-id', store, request, () => time)
  return { client, store, request, advance: (seconds: number) => { time += seconds * 1000 } }
}
function code() { return response(200, { device_code: 'private-device-code', user_code: 'ABCD', verification_url: 'https://trakt.tv/activate', interval: 5, expires_in: 600 }) }
describe('Trakt OAuth device authorization', () => {
  it('renders zero counts for an explicit 204 no-statistics response', async () => {
    const { client, request } = setup(token)
    request.mockResolvedValueOnce(response(200, { user: { username: 'tester' } }))
      .mockResolvedValueOnce(response(200, { name: 'Test User' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect(await client.account()).toMatchObject({ name: 'Test User', episodes: 0, shows: 0, movies: 0 })
  })
  it('does not treat malformed successful JSON as an empty account', async () => {
    const { client, request } = setup(token)
    request.mockResolvedValueOnce(response(200, { user: { username: 'tester' } }))
      .mockResolvedValueOnce(response(200, { name: 'Test User' }))
      .mockResolvedValueOnce(new Response('not json', { status: 200 }))
    await expect(client.account()).rejects.toThrow('TRAKT_RESPONSE')
  })
  it('exchanges a web authorization code with PKCE and exposes only status', async () => {
    const { client, request, store } = setup()
    const generation = client.beginWebLogin()
    request.mockResolvedValueOnce(response(200, token)).mockResolvedValueOnce(response(200, { user: { username: 'tester' } }))
    const result = await client.completeWebLogin('web-code', 'private-verifier', 'boxplayer-traktoauth://callback', generation)
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ client_id: 'test-client-id', code: 'web-code', code_verifier: 'private-verifier', redirect_uri: 'boxplayer-traktoauth://callback', grant_type: 'authorization_code' })
    expect(store.write).toHaveBeenCalledWith({ ...token, username: 'tester' })
    expect(result).toEqual({ configured: true, connected: true, username: 'tester' })
    expect(JSON.stringify(result)).not.toContain('test-access')
  })
  it('rejects cancelled or superseded web login before token exchange', async () => {
    const { client, request } = setup()
    const generation = client.beginWebLogin()
    client.cancelLogin()
    await expect(client.completeWebLogin('code', 'verifier', 'boxplayer-traktoauth://callback', generation)).rejects.toThrow('TRAKT_CANCELLED')
    expect(request).not.toHaveBeenCalled()
  })
  it('loads real profile and watched statistics without exposing credentials', async () => {
    const { client, request } = setup(token)
    request.mockResolvedValueOnce(response(200, { user: { username: 'test/name' } }))
      .mockResolvedValueOnce(response(200, { name: 'Test User', vip: true, images: { avatar: { full: 'https://images.trakt.tv/avatar.jpg' } } }))
      .mockResolvedValueOnce(response(200, { episodes: { watched: 12 }, shows: { watched: 3 }, movies: { watched: 5 } }))
    const account = await client.account()
    expect(account).toEqual({ username: 'test/name', name: 'Test User', vip: true, avatar: 'https://images.trakt.tv/avatar.jpg', episodes: 12, shows: 3, movies: 5 })
    expect(request.mock.calls[1][0]).toBe('https://api.trakt.tv/users/me?extended=full')
    expect(request.mock.calls[2][0]).toBe('https://api.trakt.tv/users/me/stats')
    expect(JSON.stringify(account)).not.toContain('test-access')
  })
  it('rejects fabricated stats and unsafe avatar URLs', async () => {
    const { client, request } = setup(token)
    const replies = (count: unknown) => {
      request.mockResolvedValueOnce(response(200, { user: { username: 'tester' } }))
        .mockResolvedValueOnce(response(200, { images: { avatar: { full: 'javascript:alert(1)' } } }))
        .mockResolvedValueOnce(response(200, { episodes: { watched: count }, shows: { watched: 0 }, movies: { watched: 0 } }))
    }
    replies(-1); await expect(client.account()).rejects.toThrow('TRAKT_STATS')
    replies(0); expect(await client.account()).toMatchObject({ avatar: undefined, episodes: 0, name: 'tester' })
  })
  it('returns no tokens/device secret and honors interval, pending and encrypted persistence', async () => {
    const { client, request, store, advance } = setup()
    request.mockResolvedValueOnce(code()).mockResolvedValueOnce(response(400, {})).mockResolvedValueOnce(response(200, token)).mockResolvedValueOnce(response(200, { user: { username: 'tester' } }))
    const login = await client.startLogin()
    expect(login).toEqual({ userCode: 'ABCD', verificationUrl: 'https://trakt.tv/activate', interval: 5, expiresAt: 1600000 })
    expect(request.mock.calls[0][0]).toBe('https://auth.trakt.tv/oauth/device/code')
    expect(await client.pollLogin()).toEqual({ state: 'pending', interval: 5 })
    expect(request).toHaveBeenCalledTimes(1)
    advance(5); expect(await client.pollLogin()).toEqual({ state: 'pending', interval: 5 })
    advance(5); const result = await client.pollLogin()
    expect(result).toEqual({ state: 'connected', status: { configured: true, connected: true, username: 'tester' } })
    expect(store.write).toHaveBeenCalledWith({ ...token, username: 'tester' })
    expect(JSON.stringify(result)).not.toContain('test-access')
  })
  it.each([[418, 'TRAKT_DENIED'], [410, 'TRAKT_EXPIRED'], [404, 'TRAKT_EXPIRED'], [409, 'TRAKT_EXPIRED']])('handles terminal status %s', async (status, error) => {
    const { client, request, advance, store } = setup()
    request.mockResolvedValueOnce(code()).mockResolvedValueOnce(response(status as number, {}))
    await client.startLogin(); advance(5)
    await expect(client.pollLogin()).rejects.toThrow(String(error))
    expect(store.write).not.toHaveBeenCalled()
  })
  it('backs off on 429 and never polls an expired code', async () => {
    const { client, request, advance } = setup()
    request.mockResolvedValueOnce(code()).mockResolvedValueOnce(response(429, {}, { 'Retry-After': '30' }))
    await client.startLogin(); advance(5)
    expect(await client.pollLogin()).toEqual({ state: 'pending', interval: 30 })
    advance(10); await client.pollLogin(); expect(request).toHaveBeenCalledTimes(2)
    advance(600); await expect(client.pollLogin()).rejects.toThrow('TRAKT_EXPIRED')
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('rejects malicious verification URLs', async () => {
    const { client, request } = setup()
    request.mockResolvedValueOnce(response(200, { device_code: 'x', user_code: 'x', verification_url: 'https://evil.example/activate', expires_in: 600, interval: 5 }))
    await expect(client.startLogin()).rejects.toThrow('TRAKT_REQUEST')
  })
  it('does not save a late token response after cancellation', async () => {
    const { client, request, advance, store } = setup()
    let finish!: (response: Response) => void
    request.mockResolvedValueOnce(code()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await client.startLogin(); advance(5)
    const polling = client.pollLogin(); client.cancelLogin(); finish(response(200, token))
    await expect(polling).rejects.toThrow('TRAKT_CANCELLED'); expect(store.write).not.toHaveBeenCalled()
  })
  it('clears local credentials even if revoke is offline', async () => {
    const { client, request, store } = setup(token)
    request.mockRejectedValue(new Error('offline'))
    expect((await client.logout()).connected).toBe(false); expect(store.clear).toHaveBeenCalledOnce()
  })
})
describe('Trakt watchlist and personal rating sync', () => {
  it.each(['watchlist-add', 'watchlist-remove', 'rating'] as const)('submits exact IDs for %s', async action => {
    const { client, request } = setup(token)
    request.mockResolvedValue(response(200, { not_found: {} }))
    await client.sync(movie, action, action === 'rating' ? 8 : undefined)
    const [url, options] = request.mock.calls[0]
    expect(url).toBe('https://api.trakt.tv/sync/' + (action === 'rating' ? 'ratings' : action === 'watchlist-remove' ? 'watchlist/remove' : 'watchlist'))
    expect(JSON.parse(options!.body as string)).toEqual({ movies: [{ ids: { tmdb: 123 }, ...(action === 'rating' ? { rating: 8 } : {}) }] })
    expect(options!.headers).toMatchObject({ Authorization: 'Bearer test-access', 'trakt-api-key': 'test-client-id', 'trakt-api-version': '2' })
  })
  it('rejects missing metadata and invalid ratings before any HTTP call', async () => {
    const { client, request } = setup(token)
    await expect(client.sync({ type: 'movie' }, 'watchlist-add')).rejects.toThrow('TRAKT_METADATA')
    await expect(client.sync(movie, 'rating', 0)).rejects.toThrow('TRAKT_RATING')
    await expect(client.sync(movie, 'rating')).rejects.toThrow('TRAKT_RATING')
    expect(request).not.toHaveBeenCalled()
    expect(traktPayload({ type: 'tv', imdbId: 'tt123' })).toEqual({ shows: [{ ids: { imdb: 'tt123' } }] })
    expect(traktPayload({ type: 'episode', tmdbId: 456 }, 7)).toEqual({ episodes: [{ ids: { tmdb: 456 }, rating: 7 }] })
  })
  it('treats not_found as failure instead of claiming success', async () => {
    const { client, request } = setup(token)
    request.mockResolvedValue(response(201, { not_found: { movies: [{ ids: { tmdb: 123 } }] } }))
    await expect(client.sync(movie, 'watchlist-add')).rejects.toThrow('TRAKT_NOT_FOUND')
  })
  it('refreshes once under concurrent requests and persists the rotated token', async () => {
    const { client, request, store } = setup({ ...token, expires_in: 1 })
    request.mockImplementation(async url => String(url).endsWith('/oauth/token') ? response(200, { ...token, access_token: 'rotated', refresh_token: 'rotated-refresh' }) : response(201, { not_found: {} }))
    await Promise.all([client.sync(movie, 'watchlist-add'), client.sync(movie, 'rating', 7)])
    expect(request.mock.calls.filter(([url]) => String(url).endsWith('/oauth/token'))).toHaveLength(1)
    expect(store.write).toHaveBeenCalledOnce()
    expect(store.write.mock.calls[0][0]).toMatchObject({ refresh_token: 'rotated-refresh' })
    expect(request.mock.calls[1][1]!.headers).toMatchObject({ Authorization: 'Bearer rotated' })
  })
  it('retries a rejected access token once and clears invalid refresh credentials', async () => {
    const { client, request, store } = setup(token)
    request.mockResolvedValueOnce(response(401, {})).mockResolvedValueOnce(response(400, {}))
    await expect(client.sync(movie, 'rating', 6)).rejects.toThrow('TRAKT_LOGIN')
    expect(store.clear).toHaveBeenCalledOnce(); expect((await client.status()).connected).toBe(false)
  })
})
describe('Trakt playback progress import', () => {
  it('reads movie and episode progress with stable TMDB identities', async () => {
    const { client, request } = setup(token)
    request.mockResolvedValueOnce(response(200, [
      { movie: { ids: { tmdb: 123 } }, progress: 42, paused_at: '2026-10-15T10:00:00Z' },
      { movie: { ids: {} }, progress: 50, paused_at: '2026-10-15T10:00:00Z' }
    ])).mockResolvedValueOnce(response(200, [
      { show: { ids: { tmdb: 456 } }, episode: { season: 2, number: 3 }, progress: 65, paused_at: '2026-10-15T11:00:00Z' }
    ]))
    expect(await client.playbackProgress()).toEqual([
      { type: 'movie', tmdbId: 123, progress: 42, pausedAt: '2026-10-15T10:00:00Z' },
      { type: 'episode', tmdbId: 456, season: 2, episode: 3, progress: 65, pausedAt: '2026-10-15T11:00:00Z' }
    ])
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      'https://api.trakt.tv/sync/playback/movies',
      'https://api.trakt.tv/sync/playback/episodes'
    ])
  })
})

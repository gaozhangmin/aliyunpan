import { traktPayload, type TraktIdentity, type TraktStatus, type TraktDeviceLogin, type TraktPollResult, type TraktAccount } from '../../../shared/trakt'

export interface TraktTokens { access_token: string; refresh_token: string; created_at: number; expires_in: number; username?: string }
export interface TraktTokenStore { read(): Promise<TraktTokens | undefined>; write(tokens: TraktTokens): Promise<void>; clear(): Promise<void> }
type Device = TraktDeviceLogin & { code: string; nextPoll: number; generation: number }
export class TraktClient {
  private tokens?: TraktTokens
  private loaded = false
  private loadPromise?: Promise<void>
  private device?: Device
  private generation = 0
  private refreshPromise?: Promise<void>
  private polling = false
  private starting = false
  private credentialQueue: Promise<void> = Promise.resolve()
  constructor(private clientId: string, private store: TraktTokenStore, private request: typeof fetch = fetch, private now: () => number = Date.now) {}

  private async load() {
    if (!this.loaded) {
      this.loadPromise ||= this.store.read().then(tokens => { this.tokens = tokens ? this.validTokens(tokens) : undefined; this.loaded = true }).catch(error => { this.loadPromise = undefined; throw error })
      await this.loadPromise
    }
  }
  async status(): Promise<TraktStatus> { await this.load(); return { configured: !!this.clientId, connected: !!this.tokens, username: this.tokens?.username } }
  private persist(tokens: TraktTokens, generation: number) {
    const write = this.credentialQueue.then(async () => {
      if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      const previous = this.tokens
      await this.store.write(tokens)
      if (generation !== this.generation) {
        if (previous) await this.store.write(previous)
        else await this.store.clear()
        throw new Error('TRAKT_CANCELLED')
      }
      this.tokens = tokens; this.loaded = true
    })
    this.credentialQueue = write.catch(() => undefined)
    return write
  }
  private requireConfigured() { if (!this.clientId) throw new Error('TRAKT_CONFIG') }
  private async send(path: string, body?: unknown, token?: string, auth = false) {
    let response: Response
    try {
      response = await this.request((auth ? 'https://auth.trakt.tv' : 'https://api.trakt.tv') + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', 'trakt-api-key': this.clientId, 'trakt-api-version': '2', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error', signal: AbortSignal.timeout(20000)
      })
    } catch { throw new Error('TRAKT_NETWORK') }
    if (response.status === 204) return { response, data: undefined }
    const data = await response.json().catch(() => {
      if (response.ok) throw new Error(`TRAKT_RESPONSE (${path.split('?')[0]}, HTTP ${response.status}, ${response.headers.get('content-type')?.split(';')[0] || 'no content type'})`)
      return {}
    })
    return { response, data }
  }
  private failure(status: number): never {
    throw new Error(status === 401 ? 'TRAKT_LOGIN' : status === 403 ? 'TRAKT_FORBIDDEN' : status === 429 ? 'TRAKT_RATE_LIMIT' : status === 420 ? 'TRAKT_LIMIT' : 'TRAKT_REQUEST')
  }
  private validTokens(data: TraktTokens) {
    if (!data || typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token || !Number.isFinite(data.created_at) || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('TRAKT_REQUEST')
    return data
  }
  async startLogin(): Promise<TraktDeviceLogin> {
    this.requireConfigured()
    this.device = undefined
    const generation = ++this.generation
    this.starting = true
    const { response, data } = await (async () => {
      await this.load()
      if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      return this.send('/oauth/device/code', { client_id: this.clientId }, undefined, true)
    })().finally(() => { if (generation === this.generation) this.starting = false })
    if (!response.ok) this.failure(response.status)
    if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
    let url: URL
    try { url = new URL(data.verification_url) } catch { throw new Error('TRAKT_REQUEST') }
    if (url.protocol !== 'https:' || !['trakt.tv', 'auth.trakt.tv'].includes(url.hostname) || url.port || url.username || url.password || typeof data.device_code !== 'string' || typeof data.user_code !== 'string' || !data.device_code || !data.user_code || !Number.isFinite(data.expires_in) || !Number.isFinite(data.interval) || !(data.expires_in > 0) || !(data.interval > 0)) throw new Error('TRAKT_REQUEST')
    const login = { userCode: String(data.user_code), verificationUrl: url.href, expiresAt: this.now() + data.expires_in * 1000, interval: Math.max(1, Number(data.interval)) }
    this.device = { ...login, code: data.device_code, generation, nextPoll: this.now() + login.interval * 1000 }
    return login
  }
  beginWebLogin() { this.requireConfigured(); this.cancelLogin(); this.starting = true; return ++this.generation }
  async completeWebLogin(code: string, verifier: string, redirectUri: string, generation: number): Promise<TraktStatus> {
    await this.load()
    if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
    const { response, data } = await this.send('/oauth/token', { client_id: this.clientId, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: 'authorization_code' }, undefined, true)
    if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
    if (!response.ok) this.failure(response.status)
    const tokens = this.validTokens(data)
    const profile = await this.send('/users/settings', undefined, tokens.access_token)
    if (!profile.response.ok) this.failure(profile.response.status)
    tokens.username = profile.data.user?.username
    await this.persist(tokens, generation)
    this.starting = false
    return this.status()
  }
  cancelLogin() { if (this.device || this.starting) ++this.generation; this.starting = false; this.device = undefined }
  async pollLogin(): Promise<TraktPollResult> {
    const device = this.device
    if (!device) throw new Error('TRAKT_CANCELLED')
    if (this.now() >= device.expiresAt) { this.cancelLogin(); throw new Error('TRAKT_EXPIRED') }
    if (this.polling || this.now() < device.nextPoll) return { state: 'pending', interval: device.interval }
    this.polling = true
    device.nextPoll = this.now() + device.interval * 1000
    try {
      const { response, data } = await this.send('/oauth/device/token', { client_id: this.clientId, code: device.code }, undefined, true)
      if (device.generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      if (response.status === 400) return { state: 'pending', interval: device.interval }
      if (response.status === 429) {
        device.interval = Math.max(device.interval + 5, Number(response.headers.get('Retry-After')) || 0)
        device.nextPoll = this.now() + device.interval * 1000
        return { state: 'pending', interval: device.interval }
      }
      if (!response.ok) { this.cancelLogin(); throw new Error(response.status === 418 ? 'TRAKT_DENIED' : [404, 409, 410].includes(response.status) ? 'TRAKT_EXPIRED' : 'TRAKT_REQUEST') }
      const tokens = this.validTokens(data)
      const profile = await this.send('/users/settings', undefined, tokens.access_token).catch(() => undefined)
      if (device.generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      tokens.username = profile?.response.ok ? profile.data.user?.username : undefined
      await this.persist(tokens, device.generation)
      this.device = undefined
      return { state: 'connected', status: await this.status() }
    } finally { this.polling = false }
  }
  private async refresh() {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const old = this.tokens
        const generation = this.generation
        if (!old) throw new Error('TRAKT_LOGIN')
        const { response, data } = await this.send('/oauth/token', { client_id: this.clientId, refresh_token: old.refresh_token, grant_type: 'refresh_token' }, undefined, true)
        if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
        if (!response.ok) {
          if ([400, 401].includes(response.status)) { await this.store.clear(); this.tokens = undefined; throw new Error('TRAKT_LOGIN') }
          this.failure(response.status)
        }
        const tokens = { ...this.validTokens(data), username: old.username }
        // Persist every rotated refresh token before making another API request.
        await this.persist(tokens, generation)
      })().finally(() => { this.refreshPromise = undefined })
    }
    await this.refreshPromise
  }
  async account(): Promise<TraktAccount> {
    this.requireConfigured(); await this.load()
    const generation = this.generation
    if (!this.tokens) throw new Error('TRAKT_LOGIN')
    if ((this.tokens.created_at + this.tokens.expires_in) * 1000 <= this.now() + 60000) await this.refresh()
    const read = async (path: string) => {
      if (generation !== this.generation || !this.tokens) throw new Error('TRAKT_CANCELLED')
      let result = await this.send(path, undefined, this.tokens.access_token)
      if (result.response.status === 401) { await this.refresh(); result = await this.send(path, undefined, this.tokens?.access_token) }
      if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      if (!result.response.ok) {
        // Only endpoint and status are diagnostic data; never include headers or response bodies.
        try { this.failure(result.response.status) } catch (error) { throw new Error(`${(error as Error).message} (${path.split('?')[0]}, HTTP ${result.response.status})`) }
      }
      return result.data
    }
    const settings = await read('/users/settings')
    const user = settings.user
    if (typeof user?.username !== 'string' || !user.username) throw new Error('TRAKT_REQUEST')
    // Like the native macOS client, resolve the authenticated owner through `me`.
    // A display username is not necessarily the user's API slug.
    const profile = await read('/users/me?extended=full')
    // Trakt returns 204 when the account has no viewing statistics yet.
    // Only that explicit no-content response maps to zero; malformed 200 data must fail.
    const statsResponse = await read('/users/me/stats')
    const stats = statsResponse === undefined ? { episodes: { watched: 0 }, shows: { watched: 0 }, movies: { watched: 0 } } : statsResponse
    if (!stats || typeof stats !== 'object') throw new Error('TRAKT_STATS')
    const count = (value: unknown, field: string) => { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`TRAKT_STATS (${field})`); return value as number }
    let avatar: string | undefined
    try { const url = new URL(profile.images?.avatar?.full); if (url.protocol === 'https:' && !url.username && !url.password) avatar = url.href } catch { /* Missing avatars use the local placeholder. */ }
    return { username: user.username, name: typeof profile.name === 'string' && profile.name.trim() ? profile.name : user.username, avatar, vip: profile.vip === true, episodes: count(stats.episodes?.watched, 'episodes.watched'), shows: count(stats.shows?.watched, 'shows.watched'), movies: count(stats.movies?.watched, 'movies.watched') }
  }
  async sync(identity: TraktIdentity, action: 'watchlist-add' | 'watchlist-remove' | 'rating', rating?: number) {
    if (!['watchlist-add', 'watchlist-remove', 'rating'].includes(action)) throw new Error('TRAKT_REQUEST')
    const payload = traktPayload(identity, action === 'rating' ? rating : undefined)
    if (action === 'rating' && rating === undefined) throw new Error('TRAKT_RATING')
    this.requireConfigured(); await this.load()
    const generation = this.generation
    if (!this.tokens) throw new Error('TRAKT_LOGIN')
    if ((this.tokens.created_at + this.tokens.expires_in) * 1000 <= this.now() + 60000) await this.refresh()
    const path = action === 'rating' ? '/sync/ratings' : action === 'watchlist-add' ? '/sync/watchlist' : '/sync/watchlist/remove'
    let result = await this.send(path, payload, this.tokens?.access_token)
    if (result.response.status === 401) { await this.refresh(); result = await this.send(path, payload, this.tokens?.access_token) }
    if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
    if (result.response.status === 401) { await this.store.clear(); this.tokens = undefined; throw new Error('TRAKT_LOGIN') }
    if (!result.response.ok) this.failure(result.response.status)
    if (!result.data || typeof result.data !== 'object' || !('not_found' in result.data)) throw new Error('TRAKT_REQUEST')
    if (Object.values(result.data.not_found || {}).some(value => Array.isArray(value) && value.length)) throw new Error('TRAKT_NOT_FOUND')
  }
  async playbackProgress(): Promise<Array<{ type: 'movie' | 'episode'; tmdbId: number; season?: number; episode?: number; progress: number; pausedAt: string }>> {
    this.requireConfigured(); await this.load()
    const generation = this.generation
    if (!this.tokens) throw new Error('TRAKT_LOGIN')
    if ((this.tokens.created_at + this.tokens.expires_in) * 1000 <= this.now() + 60000) await this.refresh()
    const records: Array<{ type: 'movie' | 'episode'; tmdbId: number; season?: number; episode?: number; progress: number; pausedAt: string }> = []
    for (const type of ['movies', 'episodes'] as const) {
      let result = await this.send('/sync/playback/' + type, undefined, this.tokens?.access_token)
      if (result.response.status === 401) { await this.refresh(); result = await this.send('/sync/playback/' + type, undefined, this.tokens?.access_token) }
      if (generation !== this.generation) throw new Error('TRAKT_CANCELLED')
      if (!result.response.ok) this.failure(result.response.status)
      if (!Array.isArray(result.data)) throw new Error('TRAKT_RESPONSE')
      for (const entry of result.data) {
        const tmdbId = Number(type === 'movies' ? entry.movie?.ids?.tmdb : entry.show?.ids?.tmdb)
        const progress = Number(entry.progress)
        const season = Number(entry.episode?.season)
        const episode = Number(entry.episode?.number)
        const pausedAt = String(entry.paused_at || '')
        if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0 || !Number.isFinite(progress) || progress <= 0 || progress >= 100 || !Number.isFinite(Date.parse(pausedAt))) continue
        if (type === 'episodes' && (!Number.isSafeInteger(season) || !Number.isSafeInteger(episode))) continue
        records.push({ type: type === 'movies' ? 'movie' : 'episode', tmdbId, ...(type === 'episodes' ? { season, episode } : {}), progress, pausedAt })
      }
    }
    return records
  }

  async logout() {
    this.cancelLogin(); ++this.generation; await this.load()
    const token = this.tokens?.access_token
    const clear = this.credentialQueue.then(async () => { await this.store.clear(); this.tokens = undefined })
    this.credentialQueue = clear.catch(() => undefined)
    await clear
    // Local logout is authoritative even if the network is offline.
    if (token) await this.send('/oauth/revoke', { client_id: this.clientId, token }, undefined, true).catch(() => undefined)
    return this.status()
  }
}

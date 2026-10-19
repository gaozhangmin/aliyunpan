import { app, ipcMain, net, safeStorage, shell } from 'electron'
import { randomBytes, createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getAsarPath } from './utils/mainfile'
import { TRAKT_CLIENT_ID } from '../../src/secrets.generated'
import { TraktClient, type TraktTokens } from './core/traktClient'

let pendingTraktCallback: ((url: string) => void) | undefined
export function handleTraktCallback(url: string): boolean {
  if (!url.startsWith('boxplayer-traktoauth:')) return false
  pendingTraktCallback?.(url)
  return true
}

export function registerTraktIpc() {
  const tokenPath = path.join(app.getPath('userData'), 'trakt-credentials.enc')
  const requireEncryption = () => {
    if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw new Error('TRAKT_SECURE_STORAGE')
  }
  const client = new TraktClient(TRAKT_CLIENT_ID, {
    async read() {
      let encrypted: Buffer
      try { encrypted = await fs.readFile(tokenPath) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw new Error('TRAKT_SECURE_STORAGE') }
      requireEncryption()
      try { return JSON.parse(safeStorage.decryptString(encrypted)) as TraktTokens } catch { throw new Error('TRAKT_SECURE_STORAGE') }
    },
    async write(tokens) {
      requireEncryption()
      const temporary = tokenPath + '.tmp'
      await fs.writeFile(temporary, safeStorage.encryptString(JSON.stringify(tokens)), { mode: 0o600 })
      await fs.rename(temporary, tokenPath)
    },
    async clear() { await fs.unlink(tokenPath).catch(error => { if (error.code !== 'ENOENT') throw new Error('TRAKT_SECURE_STORAGE') }) }
  }, (input, init) => net.fetch(String(input), init))
  let cancelWebLogin: (() => void) | undefined
  const webLogin = () => {
    requireEncryption()
    cancelWebLogin?.()
    const generation = client.beginWebLogin()
    const verifier = randomBytes(32).toString('base64url')
    const state = randomBytes(32).toString('base64url')
    const redirectUri = 'boxplayer-traktoauth://callback'
    const url = new URL('https://auth.trakt.tv/oauth/authorize')
    url.search = new URLSearchParams({ client_id: TRAKT_CLIENT_ID, response_type: 'code', redirect_uri: redirectUri, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString()
    return new Promise((resolve, reject) => {
      let settled = false
      let exchanging = false
      const finish = (error?: Error, result?: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        cancelWebLogin = undefined
        pendingTraktCallback = undefined
        if (error) client.cancelLogin()
        if (error) reject(error); else resolve(result)
      }
      const timeout = setTimeout(() => finish(new Error('TRAKT_EXPIRED')), 10 * 60 * 1000)
      cancelWebLogin = () => finish(new Error('TRAKT_CANCELLED'))
      pendingTraktCallback = (target: string) => {
        let callback: URL
        try { callback = new URL(target) } catch { return }
        if (callback.protocol === 'boxplayer-traktoauth:') {
          if (exchanging || settled) return
          if (callback.hostname !== 'callback' || callback.username || callback.password || callback.port || (callback.pathname && callback.pathname !== '/') || callback.searchParams.getAll('state').length !== 1 || callback.searchParams.get('state') !== state) return
          const code = callback.searchParams.get('code')
          if (!code || callback.searchParams.has('error')) return finish(new Error('TRAKT_DENIED'))
          exchanging = true
          void client.completeWebLogin(code, verifier, redirectUri, generation).then(result => finish(undefined, result), () => finish(new Error('TRAKT_REQUEST')))
        }
      }
      void shell.openExternal(url.href).catch(() => finish(new Error('TRAKT_NETWORK')))
    })
  }
  const handlers: Record<string, (...args: any[]) => unknown> = {
    status: () => client.status(),
    account: () => client.account(),
    vip: () => shell.openExternal('https://app.trakt.tv/vip'),
    start: webLogin,
    cancel: () => { cancelWebLogin?.(); client.cancelLogin() },
    logout: () => { cancelWebLogin?.(); return client.logout() },
    sync: (identity, action, rating) => client.sync(identity, action, rating),
    playbackProgress: () => client.playbackProgress()
  }
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle('trakt:' + name, async (event, ...args) => {
    // Reject subframes and external web/player windows. Credentials never cross IPC.
    const url = event.senderFrame?.url || ''
    const devUrl = process.env.VITE_DEV_SERVER_URL
    const trusted = devUrl ? new URL(url).origin === new URL(devUrl).origin : url.split(/[?#]/)[0] === pathToFileURL(getAsarPath('dist/main.html')).href
    if (event.senderFrame !== event.sender.mainFrame || !trusted) throw new Error('TRAKT_REQUEST')
    return handler(...args)
  })
}

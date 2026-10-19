import { ref } from 'vue'
import type { TraktIdentity, TraktStatus, TraktAccount } from '@shared/trakt'
import { t } from '../../i18n'

export const traktStatus = ref<TraktStatus>({ configured: false, connected: false })
export const traktAccount = ref<TraktAccount>()
function readSyncEnabled() { try { return typeof window === 'undefined' || window.localStorage.getItem('trakt-sync-enabled') !== 'false' } catch { return true } }
export const traktSyncEnabled = ref(readSyncEnabled())
export function setTraktSyncEnabled(enabled: boolean) { localStorage.setItem('trakt-sync-enabled', String(enabled)); traktSyncEnabled.value = enabled; if (enabled) void syncTraktPlaybackProgress().catch(() => undefined) }
function readSyncRange() { const value = Number(localStorage.getItem('trakt-sync-range')); return [7, 30, 180, 365, -1].includes(value) ? value : -1 }
export const traktSyncRange = ref(typeof window === 'undefined' ? -1 : readSyncRange())
export function setTraktSyncRange(days: number) { if (![7, 30, 180, 365, -1].includes(days)) return; localStorage.setItem('trakt-sync-range', String(days)); traktSyncRange.value = days; if (traktSyncEnabled.value) void syncTraktPlaybackProgress().catch(() => undefined) }
let playbackSyncGeneration = 0
export async function syncTraktPlaybackProgress() {
  const generation = ++playbackSyncGeneration
  if (!traktSyncEnabled.value || !traktStatus.value.connected) return
  const records = await invoke<Array<{ type: 'movie' | 'episode'; tmdbId: number; season?: number; episode?: number; progress: number; pausedAt: string }>>('playbackProgress')
  if (generation !== playbackSyncGeneration || !traktSyncEnabled.value || !traktStatus.value.connected) return
  const { useMediaLibraryStore } = await import('../../store/medialibrary')
  const store = useMediaLibraryStore()
  await store.hydrate()
  if (generation !== playbackSyncGeneration || !traktSyncEnabled.value || !traktStatus.value.connected) return
  const earliest = traktSyncRange.value > 0 ? Date.now() - traktSyncRange.value * 86400000 : 0
  const indexed = new Map(store.mediaItems.filter(item => item.tmdbId && (item.type === 'movie' || item.type === 'tv')).map(item => [`${item.type}:${item.tmdbId}`, item]))
  const latest = new Map<string, typeof records[number]>()
  for (const record of records) {
    const paused = Date.parse(record.pausedAt)
    if (paused < earliest) continue
    const key = `${record.type === 'movie' ? 'movie' : 'tv'}:${record.tmdbId}${record.type === 'episode' ? `:${record.season}:${record.episode}` : ''}`
    if (!latest.has(key) || paused > Date.parse(latest.get(key)!.pausedAt)) latest.set(key, record)
  }
  let processed = 0
  store.beginPersistenceBatch()
  try {
    for (const record of [...latest.values()].sort((left, right) => Date.parse(left.pausedAt) - Date.parse(right.pausedAt))) {
      if (generation !== playbackSyncGeneration || !traktSyncEnabled.value || !traktStatus.value.connected) break
      const item = indexed.get(`${record.type === 'movie' ? 'movie' : 'tv'}:${record.tmdbId}`)
      if (!item) continue
      const paused = new Date(record.pausedAt)
      if (item.lastWatched && new Date(item.lastWatched).getTime() > paused.getTime()) continue
      const changes = { watchProgress: record.progress / 100, lastWatched: paused }
      if (record.type === 'episode') {
        const episode = item.seasons?.find(season => season.seasonNumber === record.season)?.episodes?.find(episode => episode.episodeNumber === record.episode)
        if (!episode?.driveFiles?.length) continue
        const file = episode.driveFiles[0]
        store.updateMediaItem(item.id, { ...changes, lastPlayedFileId: file.id })
        store.addToContinueWatching({ ...item, ...changes, lastPlayedFileId: file.id, id: `${item.id}_${record.season}_${record.episode}` })
      } else {
        store.updateMediaItem(item.id, changes)
        store.addToContinueWatching({ ...item, ...changes })
      }
      if (++processed % 20 === 0) { store.checkpointPersistenceBatch(); await new Promise<void>(resolve => setTimeout(resolve, 0)) }
    }
  } finally { store.endPersistenceBatch() }
}

function invoke<T>(operation: string, ...args: unknown[]): Promise<T> {
  const ipc = window.Electron?.ipcRenderer
  if (!ipc) return Promise.reject(new Error('TRAKT_DESKTOP'))
  return ipc.invoke('trakt:' + operation, ...args) as Promise<T>
}
export async function loadTraktStatus() { traktStatus.value = await invoke<TraktStatus>('status'); return traktStatus.value }
export async function loadTraktAccount() { const account = await invoke<TraktAccount>('account'); if (traktStatus.value.connected) traktAccount.value = account; return account }
export const startTraktLogin = () => invoke<TraktStatus>('start')
export const openTraktVip = () => invoke<void>('vip')
export const cancelTraktLogin = () => invoke<void>('cancel')
export async function logoutTrakt() { playbackSyncGeneration++; traktStatus.value = await invoke<TraktStatus>('logout'); traktAccount.value = undefined }
export function syncTrakt(identity: TraktIdentity, action: 'watchlist-add' | 'watchlist-remove' | 'rating', rating?: number) {
  if (!traktSyncEnabled.value) return Promise.resolve()
  return invoke<void>('sync', JSON.parse(JSON.stringify({ type: identity.type, tmdbId: identity.tmdbId, imdbId: identity.imdbId })), action, rating).catch(async error => {
    if (String(error).includes('TRAKT_LOGIN')) await loadTraktStatus().catch(() => undefined)
    throw error
  })
}
export function traktError(error: unknown) {
  const code = String(error).match(/TRAKT_[A-Z_]+/)?.[0]
  switch (code) {
    case 'TRAKT_CONFIG': return t('trakt.configRequired')
    case 'TRAKT_METADATA': case 'TRAKT_NOT_FOUND': return t('trakt.metadataRequired')
    case 'TRAKT_SECURE_STORAGE': return t('trakt.storageError')
    case 'TRAKT_EXPIRED': return t('trakt.expired')
    case 'TRAKT_DENIED': return t('trakt.denied')
    case 'TRAKT_LOGIN': return t('trakt.loginRequired')
    case 'TRAKT_FORBIDDEN': return t('trakt.forbidden')
    case 'TRAKT_STATS': return t('trakt.statsError')
    case 'TRAKT_RESPONSE': return t('trakt.statsError')
    case 'TRAKT_RATE_LIMIT': case 'TRAKT_LIMIT': return t('trakt.rateLimit')
    default: return t('trakt.failed')
  }
}

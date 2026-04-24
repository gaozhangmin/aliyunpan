import { defineStore } from 'pinia'
import type {
  MediaServerConfig,
  MediaServerPreferences,
  MediaServerSortBy,
  MediaServerSortOrder,
  MediaServerType,
  MediaServerViewMode
} from '../types/mediaServer'

const REGISTRY_KEY = 'MediaServer_Registry'
const PREFERENCES_KEY = 'MediaServer_Preferences'

function syncConfigsToMain(servers: MediaServerConfig[]): void {
  if (typeof window !== 'undefined' && (window as any).MsImageCacheSyncConfig) {
    ;(window as any).MsImageCacheSyncConfig(
      servers.map((s) => ({
        id: s.id,
        type: s.type,
        baseUrl: s.baseUrl,
        accessToken: s.accessToken,
        userId: s.userId,
        deviceId: s.deviceId
      }))
    )
  }
}

interface MediaServerRegistryState {
  initialized: boolean
  servers: MediaServerConfig[]
  preferences: MediaServerPreferences
}

const PRIMARY_LINE_KEY = '__primary__'

const resolveLineOptions = (server?: MediaServerConfig) => {
  if (!server) return []
  const options = [{
    key: PRIMARY_LINE_KEY,
    name: '主线路',
    url: server.baseUrl
  }]
  for (const [name, url] of Object.entries(server.backupAddresses || {})) {
    if (!url) continue
    options.push({
      key: name,
      name,
      url
    })
  }
  return options
}

const sanitizeSelectedLineName = (server: MediaServerConfig) => {
  if (!server.selectedLineName) return ''
  return server.backupAddresses?.[server.selectedLineName] ? server.selectedLineName : ''
}

const defaultPreferences = (): MediaServerPreferences => ({
  currentServerId: '',
  serverListView: 'grid',
  serverSortBy: 'lastUsedAt',
  serverSortOrder: 'desc',
  serverSearchText: '',
  pinnedServerIds: []
})

const persistState = (servers: MediaServerConfig[], preferences: MediaServerPreferences) => {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(servers))
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

const useMediaServerRegistryStore = defineStore('media-server-registry', {
  state: (): MediaServerRegistryState => ({
    initialized: false,
    servers: [],
    preferences: defaultPreferences()
  }),
  getters: {
    currentServerRecord(state): MediaServerConfig | undefined {
      return state.servers.find((server) => server.id === state.preferences.currentServerId)
    },
    currentServer(): MediaServerConfig | undefined {
      const raw = this.currentServerRecord
      if (!raw) return undefined
      const selectedLineName = sanitizeSelectedLineName(raw)
      const selectedUrl = selectedLineName ? raw.backupAddresses?.[selectedLineName] : ''
      return {
        ...raw,
        selectedLineName,
        baseUrl: selectedUrl || raw.baseUrl
      }
    },
    currentServerLineOptions(): Array<{ key: string, name: string, url: string }> {
      return resolveLineOptions(this.currentServerRecord)
    },
    currentServerLineLabel(): string {
      const raw = this.currentServerRecord
      if (!raw) return '主线路'
      return sanitizeSelectedLineName(raw) || '主线路'
    },
    currentServerLineUrl(): string {
      const raw = this.currentServer
      return raw?.baseUrl || ''
    },
    filteredServers(state): MediaServerConfig[] {
      const keyword = state.preferences.serverSearchText.trim().toLowerCase()
      const list = keyword
        ? state.servers.filter((server) =>
          `${server.name} ${server.baseUrl} ${server.type}`.toLowerCase().includes(keyword))
        : state.servers
      const pinnedOrder = new Map((state.preferences.pinnedServerIds || []).map((id, index) => [id, index]))
      const factor = state.preferences.serverSortOrder === 'asc' ? 1 : -1
      const sortServers = (items: MediaServerConfig[]) => [...items].sort((a, b) => {
        const sortBy = state.preferences.serverSortBy
        const av = a[sortBy] ?? 0
        const bv = b[sortBy] ?? 0
        if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * factor
        return ((Number(av) || 0) - (Number(bv) || 0)) * factor
      })
      const pinned = list.filter((server) => pinnedOrder.has(server.id))
      const unpinned = list.filter((server) => !pinnedOrder.has(server.id))
      return [
        ...pinned.sort((a, b) => pinnedOrder.get(a.id)! - pinnedOrder.get(b.id)!),
        ...sortServers(unpinned)
      ]
    }
  },
  actions: {
    ensureLoaded() {
      if (this.initialized) return
      try {
        const rawRegistry = localStorage.getItem(REGISTRY_KEY)
        const rawPreferences = localStorage.getItem(PREFERENCES_KEY)
        this.servers = rawRegistry ? JSON.parse(rawRegistry) : []
        this.servers = this.servers.map((server) => ({
          ...server,
          selectedLineName: sanitizeSelectedLineName(server)
        }))
        this.preferences = rawPreferences ? { ...defaultPreferences(), ...JSON.parse(rawPreferences) } : defaultPreferences()
        if (!this.preferences.currentServerId && this.servers[0]) {
          this.preferences.currentServerId = this.servers[0].id
        }
      } catch (error) {
        console.error('加载媒体服务器配置失败:', error)
        this.servers = []
        this.preferences = defaultPreferences()
      } finally {
        this.initialized = true
        syncConfigsToMain(this.servers)
      }
    },
    save() {
      persistState(this.servers, this.preferences)
    },
    addServer(input: {
      type: MediaServerType
      name: string
      baseUrl: string
      notes?: string
      host?: string
      port?: string
      path?: string
      username?: string
      password?: string
      useHttps?: boolean
      syncFlag?: boolean
      backupAddresses?: Record<string, string>
      accessToken?: string
      refreshToken?: string
      userId?: string
      deviceId?: string
      selectedResourceId?: string
      selectedResourceName?: string
      nameCustomized?: boolean
      loginStatus?: 'success' | 'failed' | 'checking'
      lastLoginCheckedAt?: number
    }) {
      const now = Date.now()
      const server: MediaServerConfig = {
        id: `media_server_${now}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
        selectedLineName: '',
        ...input
      }
      this.servers.unshift(server)
      this.preferences.currentServerId = server.id
      this.save()
      syncConfigsToMain(this.servers)
      return server
    },
    updateServer(id: string, partial: Partial<MediaServerConfig>) {
      const index = this.servers.findIndex((server) => server.id === id)
      if (index < 0) return
      const nextServer = {
        ...this.servers[index],
        ...partial,
        updatedAt: Date.now()
      }
      this.servers[index] = {
        ...nextServer,
        selectedLineName: sanitizeSelectedLineName(nextServer)
      }
      this.save()
      syncConfigsToMain(this.servers)
    },
    removeServer(id: string) {
      this.servers = this.servers.filter((server) => server.id !== id)
      this.preferences.pinnedServerIds = (this.preferences.pinnedServerIds || []).filter((serverId) => serverId !== id)
      if (this.preferences.currentServerId === id) {
        this.preferences.currentServerId = this.servers[0]?.id || ''
      }
      this.save()
      syncConfigsToMain(this.servers)
    },
    setCurrentServer(id: string) {
      this.preferences.currentServerId = id
      this.save()
    },
    setCurrentServerLine(lineKey?: string) {
      const currentId = this.preferences.currentServerId
      if (!currentId) return
      const index = this.servers.findIndex((server) => server.id === currentId)
      if (index < 0) return
      const nextSelectedLineName = lineKey && lineKey !== PRIMARY_LINE_KEY ? lineKey : ''
      const current = this.servers[index]
      this.servers[index] = {
        ...current,
        selectedLineName: sanitizeSelectedLineName({
          ...current,
          selectedLineName: nextSelectedLineName
        }),
        updatedAt: Date.now()
      }
      this.save()
    },
    setServerSearchText(value: string) {
      this.preferences.serverSearchText = value
      this.save()
    },
    setServerListView(value: MediaServerViewMode) {
      this.preferences.serverListView = value
      this.save()
    },
    setServerSorting(sortBy: MediaServerSortBy, sortOrder: MediaServerSortOrder) {
      this.preferences.serverSortBy = sortBy
      this.preferences.serverSortOrder = sortOrder
      this.save()
    },
    toggleServerPinned(id: string) {
      const pinned = this.preferences.pinnedServerIds || []
      const pinnedServerIds = pinned.includes(id)
        ? pinned.filter((serverId) => serverId !== id)
        : [id, ...pinned]
      this.preferences = {
        ...this.preferences,
        pinnedServerIds
      }
      this.save()
    },
    toggleServerPinn(id: string) {
      this.toggleServerPinned(id)
    }
  }
})

export default useMediaServerRegistryStore

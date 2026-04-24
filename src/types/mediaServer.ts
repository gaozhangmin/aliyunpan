export type MediaServerType = 'jellyfin' | 'emby' | 'plex'

export type MediaServerViewMode = 'grid' | 'list'
export type MediaServerSortBy = 'name' | 'createdAt' | 'updatedAt' | 'lastUsedAt'
export type MediaServerSortOrder = 'asc' | 'desc'

export interface MediaServerConfig {
  id: string
  type: MediaServerType
  name: string
  customIconUrl?: string
  baseUrl: string
  selectedLineName?: string
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
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export interface MediaServerPreferences {
  currentServerId?: string
  serverListView: MediaServerViewMode
  serverSortBy: MediaServerSortBy
  serverSortOrder: MediaServerSortOrder
  serverSearchText: string
  pinnedServerIds?: string[]
}

export type MediaServerPrimaryTab = 'home' | 'search' | 'library'

export type MediaServerRoute =
  | { kind: 'registry' }
  | { kind: 'home' }
  | { kind: 'search'; query?: string }
  | { kind: 'library-root' }
  | { kind: 'library-page'; libraryId: string; title: string }
  | { kind: 'studio-page'; studio: string; title: string }
  | { kind: 'person-page'; personId: string; title: string }
  | { kind: 'collection-page'; collectionId: string; title: string }
  | { kind: 'genre-page'; genre: string; title: string }
  | { kind: 'item-detail'; itemId: string; title?: string }
  | { kind: 'live-tv' }

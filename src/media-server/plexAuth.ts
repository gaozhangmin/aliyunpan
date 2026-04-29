import type { MediaServerConfig } from '../types/mediaServer'
import type { PlexPin, PlexResource } from '../types/mediaServerPlex'
import { openExternal } from '../utils/electronhelper'

const PLEX_CLIENT_ID = ''
const PLEX_PRODUCT = 'BoxPlayer'
const PLEX_VERSION = '1.7.20'
const PLEX_PLATFORM = 'BoxPlayer_Electron'
const PLEX_DEVICE = 'XbyBoxPlayer'
const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 120_000

const createPin = async (): Promise<PlexPin> => {
  const response = await fetch('https://plex.tv/api/v2/pins?strong=true', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Plex-Product': PLEX_PRODUCT,
      'X-Plex-Client-Identifier': PLEX_CLIENT_ID
    }
  })
  if (!response.ok) {
    throw new Error(`Plex 创建 PIN 失败 (${response.status})`)
  }
  return await response.json() as PlexPin
}

const buildAuthUrl = (pin: PlexPin) => {
  const params = new URLSearchParams({
    clientID: pin.clientIdentifier || PLEX_CLIENT_ID,
    code: pin.code,
    'context[device][product]': PLEX_PRODUCT,
    'context[device][version]': PLEX_VERSION,
    'context[device][platform]': PLEX_PLATFORM,
    'context[device][device]': PLEX_DEVICE
  })
  return `https://app.plex.tv/auth/#?${params.toString()}`
}

const checkPin = async (id: number, code: string): Promise<PlexPin> => {
  const response = await fetch(`https://plex.tv/api/v2/pins/${id}?code=${encodeURIComponent(code)}`, {
    headers: {
      Accept: 'application/json',
      'X-Plex-Device': PLEX_DEVICE,
      'X-Plex-Platform': PLEX_PLATFORM,
      'X-Plex-Product': PLEX_PRODUCT,
      'X-Plex-Client-Identifier': PLEX_CLIENT_ID
    }
  })
  if (!response.ok) {
    throw new Error(`Plex 轮询登录状态失败 (${response.status})`)
  }
  return await response.json() as PlexPin
}

const pollForToken = async (pin: PlexPin) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const latestPin = await checkPin(pin.id, pin.code)
    if (latestPin.authToken) return latestPin.authToken
    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error('Plex 登录超时，请重试')
}

const fetchResources = async (token: string): Promise<PlexResource[]> => {
  const response = await fetch('https://plex.tv/api/v2/resources?includeRelay=1&includeHttps=1', {
    headers: {
      Accept: 'application/json',
      'X-Plex-Token': token,
      'X-Plex-Client-Identifier': PLEX_CLIENT_ID
    }
  })
  if (!response.ok) {
    throw new Error(`Plex 获取资源列表失败 (${response.status})`)
  }
  return (await response.json() as PlexResource[])
    .filter((resource) => Array.isArray(resource.connections) && resource.connections.length > 0 && !!resource.accessToken)
}

export const signInPlex = async (): Promise<PlexResource[]> => {
  const pin = await createPin()
  openExternal(buildAuthUrl(pin))
  const authToken = await pollForToken(pin)
  return await fetchResources(authToken)
}

type PreferredConnection = {
  uri: string
  address: string
  protocol: string
  port: string
  backupAddresses: Record<string, string>
}

const getPreferredConnection = (resource: PlexResource): PreferredConnection | null => {
  let local: PreferredConnection | null = null
  let relay: PreferredConnection | null = null
  let remote: PreferredConnection | null = null
  const backupAddresses: Record<string, string> = {}
  let remoteIndex = 0

  for (const connection of resource.connections) {
    const uri = connection.uri?.trim()
    const address = connection.address?.trim()
    const protocol = connection.protocol?.trim()
    const port = connection.port
    if (!uri || !address || !protocol || !port) continue

    const normalized = {
      uri,
      address,
      protocol,
      port: String(port),
      backupAddresses
    }

    if (connection.local) {
      backupAddresses.Local = uri
      local = normalized
      continue
    }
    if (connection.relay) {
      backupAddresses.Relay = uri
      relay = normalized
      continue
    }
    remoteIndex += 1
    if (backupAddresses.Remote) {
      backupAddresses[`Remote_${remoteIndex}`] = uri
    } else {
      backupAddresses.Remote = uri
      remote = normalized
    }
  }

  const preferred = remote || relay || local
  if (!preferred) return null
  return preferred
}

export const createPlexServerConfigs = (resources: PlexResource[]): Omit<MediaServerConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>[] => {
  return resources.flatMap((resource) => {
    const token = resource.accessToken?.trim()
    const preferred = getPreferredConnection(resource)
    if (!token || !preferred) return []

    const baseUrl = `${preferred.protocol}://${preferred.address}${preferred.port ? `:${preferred.port}` : ''}`
    return [{
      type: 'plex' as const,
      name: resource.name,
      baseUrl,
      notes: '',
      host: preferred.address,
      port: preferred.port,
      path: '',
      username: '',
      password: '',
      useHttps: preferred.protocol === 'https',
      syncFlag: true,
      backupAddresses: preferred.backupAddresses,
      accessToken: token,
      deviceId: PLEX_CLIENT_ID,
      userId: `plex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      selectedResourceId: resource.clientIdentifier || resource.name,
      selectedResourceName: resource.name
    }]
  })
}

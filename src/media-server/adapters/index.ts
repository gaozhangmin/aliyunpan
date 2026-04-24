import type { MediaServerAdapter } from './base'
import type { MediaServerType } from '../../types/mediaServer'
import { jellyfinAdapter } from './jellyfin'
import { embyAdapter } from './emby'

const adapterMap: Partial<Record<MediaServerType, MediaServerAdapter>> = {
  jellyfin: jellyfinAdapter,
  emby: embyAdapter
}

export const getMediaServerAdapter = (type: MediaServerType) => adapterMap[type]


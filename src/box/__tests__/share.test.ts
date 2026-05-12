import { describe, expect, it } from 'vitest'
import { buildBoxSharedLinkBody, mapBoxSharedLinkToAliShareItem } from '../share'

describe('Box share helpers', () => {
  it('builds open shared link body', () => {
    expect(buildBoxSharedLinkBody()).toEqual({
      shared_link: {
        access: 'open',
        permissions: { can_download: true }
      }
    })
  })

  it('maps Box shared link into app share item', () => {
    const item = mapBoxSharedLinkToAliShareItem({
      id: 'file-id',
      name: 'Demo.mp4',
      shared_link: { url: 'https://share', download_url: 'https://download', access: 'open' }
    }, 'box', ['file-id'], 'Demo')

    expect(item.share_id).toBe('https://share')
    expect(item.share_url).toBe('https://share')
    expect(item.share_name).toBe('Demo')
    expect(item.file_id_list).toEqual(['file-id'])
  })
})

import { describe, expect, it } from 'vitest'
import { buildOneDriveCreateLinkBody, mapOneDrivePermissionToAliShareItem } from '../share'

describe('OneDrive share helpers', () => {
  it('builds createLink body for anonymous view links', () => {
    expect(buildOneDriveCreateLinkBody()).toEqual({
      type: 'view',
      scope: 'anonymous'
    })
  })

  it('maps Graph permission into app share item', () => {
    const item = mapOneDrivePermissionToAliShareItem({
      id: 'perm-id',
      link: { webUrl: 'https://share', type: 'view', scope: 'anonymous' }
    }, 'onedrive', ['file-id'], 'Demo')

    expect(item.share_id).toBe('perm-id')
    expect(item.share_url).toBe('https://share')
    expect(item.share_name).toBe('Demo')
    expect(item.file_id_list).toEqual(['file-id'])
  })
})

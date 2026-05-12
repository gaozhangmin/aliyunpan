import { describe, expect, it } from 'vitest'
import { BOX_FIELDS, buildBoxChildrenPath, buildBoxDetailPath, mapBoxItemToAliModel, resolveBoxTokenForRequest } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('Box dirfilelist helpers', () => {
  it('refuses non-Box bearer tokens and falls back to a saved Box account', async () => {
    const boxToken = {
      tokenfrom: 'box',
      user_id: 'box_user',
      access_token: 'box-access'
    }
    const token = await resolveBoxTokenForRequest('aliyun_user', {
      getUserToken: (userId: string) => userId === 'aliyun_user'
        ? { tokenfrom: 'aliyun', user_id: 'aliyun_user', access_token: 'aliyun-access' }
        : {},
      getUserTokenFromDB: async () => undefined,
      getUserListFromDB: async () => [boxToken]
    } as any)

    expect(token?.access_token).toBe('box-access')
  })

  it('builds folder items path for root and child folders', () => {
    expect(buildBoxChildrenPath('box_root')).toContain('/folders/0/items?')
    expect(buildBoxChildrenPath('123')).toContain('/folders/123/items?')
    expect(buildBoxChildrenPath('123')).toContain(`fields=${encodeURIComponent(BOX_FIELDS)}`)
    expect(buildBoxChildrenPath('123', 200, 50)).toContain('limit=200')
    expect(buildBoxChildrenPath('123', 200, 50)).toContain('offset=50')
  })

  it('builds detail path for root, files and folders', () => {
    expect(buildBoxDetailPath('box_root', true)).toContain('/folders/0?')
    expect(buildBoxDetailPath('123', true)).toContain('/folders/123?')
    expect(buildBoxDetailPath('456', false)).toContain('/files/456?')
  })

  it('maps folders into the shared cloud file model', () => {
    const model = mapBoxItemToAliModel({
      id: 'folder-id',
      type: 'folder',
      name: 'Movies',
      parent: { id: '0', type: 'folder', name: 'All Files' },
      item_collection: { total_count: 3 },
      created_at: '2026-05-10T01:00:00Z',
      modified_at: '2026-05-10T02:00:00Z'
    }, 'box', 'box_root')

    expect(model.drive_id).toBe('box')
    expect(model.file_id).toBe('folder-id')
    expect(model.parent_file_id).toBe('box_root')
    expect(model.name).toBe('Movies')
    expect(model.isDir).toBe(true)
    expect(model.icon).toBe('iconfile-folder')
    expect(model.description).toContain('box_parent:0')
  })

  it('maps files with sha1, shared link and representations', () => {
    const model = mapBoxItemToAliModel({
      id: 'file-id',
      type: 'file',
      name: 'clip.mp4',
      size: 1048576,
      sha1: 'sha1',
      parent: { id: 'folder-id', type: 'folder', name: 'Movies' },
      shared_link: { download_url: 'https://download', url: 'https://share' },
      representations: { entries: [{ content: { url_template: 'https://thumb/{+asset_path}' } }] },
      created_at: '2026-05-10T01:00:00Z',
      modified_at: '2026-05-10T02:00:00Z'
    }, 'box', 'folder-id')

    expect(model.file_id).toBe('file-id')
    expect(model.parent_file_id).toBe('folder-id')
    expect(model.ext).toBe('mp4')
    expect(model.sizeStr).toBe('1.00MB')
    expect(model.thumbnail).toBe('https://thumb/1.png')
    expect((model as any).content_hash).toBe('sha1')
    expect(model.description).toContain('box_download:')
    expect(model.description).toContain('box_shared:')
  })
})

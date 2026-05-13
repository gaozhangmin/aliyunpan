import { describe, expect, it } from 'vitest'
import { buildOneDriveChildrenPath, getOneDriveDownloadUrl, mapOneDriveItemToAliModel } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('OneDrive dirfilelist helpers', () => {
  it('builds v1.0 children paths for root and drive items', () => {
    expect(buildOneDriveChildrenPath('onedrive_root')).toContain('/me/drive/root/children?')
    expect(buildOneDriveChildrenPath('item-id')).toContain('/me/drive/items/item-id/children?')
    expect(buildOneDriveChildrenPath('item-id')).toContain('$expand=thumbnails')
  })

  it('maps a folder DriveItem into the shared cloud file model', () => {
    const model = mapOneDriveItemToAliModel({
      id: 'folder-id',
      name: 'Movies',
      parentReference: { id: 'root-id', path: '/drive/root:' },
      folder: { childCount: 2 },
      createdDateTime: '2026-05-10T01:00:00Z',
      lastModifiedDateTime: '2026-05-10T02:00:00Z'
    }, 'onedrive', 'onedrive_root')

    expect(model.drive_id).toBe('onedrive')
    expect(model.file_id).toBe('folder-id')
    expect(model.parent_file_id).toBe('onedrive_root')
    expect(model.name).toBe('Movies')
    expect(model.isDir).toBe(true)
    expect(model.icon).toBe('iconfile-folder')
    expect(model.description).toContain('onedrive_parent:root-id')
  })

  it('maps a file DriveItem with download url, hash, thumbnail and timestamps', () => {
    const model = mapOneDriveItemToAliModel({
      id: 'file-id',
      name: 'clip.mp4',
      size: 1048576,
      parentReference: { id: 'folder-id', path: '/drive/root:/Movies' },
      file: { hashes: { sha1Hash: 'sha1' } },
      video: { width: 1920, height: 1080, duration: 120000 },
      thumbnails: [{ medium: { url: 'https://thumb' } }],
      '@microsoft.graph.downloadUrl': 'https://download',
      createdDateTime: '2026-05-10T01:00:00Z',
      lastModifiedDateTime: '2026-05-10T02:00:00Z'
    }, 'onedrive', 'folder-id')

    expect(model.file_id).toBe('file-id')
    expect(model.parent_file_id).toBe('folder-id')
    expect(model.ext).toBe('mp4')
    expect(model.size).toBe(1048576)
    expect(model.sizeStr).toBe('1.00MB')
    expect(model.isDir).toBe(false)
    expect(model.thumbnail).toBe('https://thumb')
    expect((model as any).content_hash).toBe('sha1')
    expect((model as any).updated_at).toBe('2026-05-10T02:00:00Z')
    expect(model.description).toContain('onedrive_download:')
    expect(getOneDriveDownloadUrl({
      id: 'file-id',
      name: 'clip.mp4',
      '@microsoft.graph.downloadUrl': 'https://download'
    })).toBe('https://download')
  })

  it('keeps compatibility with legacy content download url fields', () => {
    expect(getOneDriveDownloadUrl({
      id: 'file-id',
      name: 'clip.mp4',
      '@content.downloadUrl': 'https://legacy-download'
    })).toBe('https://legacy-download')
  })
})

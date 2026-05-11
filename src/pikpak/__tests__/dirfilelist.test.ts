import { describe, expect, it } from 'vitest'
import { mapPikPakFileToAliModel } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('mapPikPakFileToAliModel', () => {
  it('maps a PikPak folder into the shared cloud file model', () => {
    const model = mapPikPakFileToAliModel({
      id: 'folder-id',
      parent_id: '',
      kind: 'drive#folder',
      name: 'Movies',
      size: '0',
      modified_time: '2026-05-09T08:00:00.000Z',
      created_time: '2026-05-08T08:00:00.000Z'
    }, 'pikpak', 'pikpak_root')

    expect(model.drive_id).toBe('pikpak')
    expect(model.file_id).toBe('folder-id')
    expect(model.parent_file_id).toBe('pikpak_root')
    expect(model.name).toBe('Movies')
    expect(model.isDir).toBe(true)
    expect(model.icon).toBe('iconfile-folder')
  })

  it('keeps file size, thumbnail, and web download url for files', () => {
    const model = mapPikPakFileToAliModel({
      id: 'file-id',
      parent_id: 'folder-id',
      kind: 'drive#file',
      name: 'clip.mp4',
      size: '1048576',
      modified_time: '2026-05-09T08:00:00.000Z',
      thumbnail_link: 'https://example.com/thumb.jpg',
      web_content_link: 'https://example.com/download.mp4'
    }, 'pikpak', 'folder-id')

    expect(model.drive_id).toBe('pikpak')
    expect(model.file_id).toBe('file-id')
    expect(model.parent_file_id).toBe('folder-id')
    expect(model.ext).toBe('mp4')
    expect(model.size).toBe(1048576)
    expect(model.sizeStr).toBe('1.00MB')
    expect(model.isDir).toBe(false)
    expect(model.thumbnail).toBe('https://example.com/thumb.jpg')
    expect(model.description).toContain('pikpak_download:https%3A%2F%2Fexample.com%2Fdownload.mp4')
  })
})

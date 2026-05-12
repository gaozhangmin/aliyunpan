import { describe, expect, it } from 'vitest'
import { mapDropboxFileToAliModel, resolveDropboxParentIdFromPath } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('mapDropboxFileToAliModel', () => {
  it('resolves a Dropbox parent path from metadata paths', () => {
    expect(resolveDropboxParentIdFromPath('/Movies/clip.mp4')).toBe('/Movies')
    expect(resolveDropboxParentIdFromPath('/clip.mp4')).toBe('dropbox_root')
    expect(resolveDropboxParentIdFromPath(undefined)).toBe('dropbox_root')
  })

  it('maps a Dropbox folder into the shared cloud file model', () => {
    const model = mapDropboxFileToAliModel({
      '.tag': 'folder',
      name: 'Movies',
      id: 'id:folder',
      path_lower: '/movies',
      path_display: '/Movies'
    }, 'dropbox', 'dropbox_root')

    expect(model.drive_id).toBe('dropbox')
    expect(model.file_id).toBe('id:folder')
    expect(model.parent_file_id).toBe('dropbox_root')
    expect(model.name).toBe('Movies')
    expect(model.isDir).toBe(true)
    expect(model.icon).toBe('iconfile-folder')
    expect(model.path).toBe('/Movies')
  })

  it('keeps file id, revision, path, size, and time for files', () => {
    const model = mapDropboxFileToAliModel({
      '.tag': 'file',
      name: 'clip.mp4',
      id: 'id:file',
      rev: '015abc',
      path_lower: '/movies/clip.mp4',
      path_display: '/Movies/clip.mp4',
      size: 1048576,
      server_modified: '2026-05-09T08:00:00Z',
      content_hash: 'hash'
    }, 'dropbox', 'id:folder')

    expect(model.drive_id).toBe('dropbox')
    expect(model.file_id).toBe('id:file')
    expect(model.parent_file_id).toBe('id:folder')
    expect(model.ext).toBe('mp4')
    expect(model.size).toBe(1048576)
    expect(model.sizeStr).toBe('1.00MB')
    expect(model.isDir).toBe(false)
    expect(model.path).toBe('/Movies/clip.mp4')
    expect((model as any).content_hash).toBe('hash')
    expect((model as any).created_at).toBe('2026-05-09T08:00:00Z')
    expect((model as any).updated_at).toBe('2026-05-09T08:00:00Z')
    expect(model.description).toContain('dropbox_path:%2FMovies%2Fclip.mp4')
    expect(model.description).toContain('dropbox_rev:015abc')
  })
})

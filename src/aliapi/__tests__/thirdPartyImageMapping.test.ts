import { describe, expect, it, vi } from 'vitest'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

vi.mock('../../user/userdal', () => ({
  default: {
    GetUserToken: () => ({}),
    GetUserTokenFromDB: async () => undefined
  }
}))

describe('third-party image file mapping', () => {
  it('maps common image extensions to the image preview category across providers', async () => {
    const { mapCloud123FileToAliModel } = await import('../../cloud123/dirfilelist')
    const { mapDrive115FileToAliModel } = await import('../../cloud115/dirfilelist')
    const { mapBaiduFileToAliModel } = await import('../../cloudbaidu/dirfilelist')
    const { mapPikPakFileToAliModel } = await import('../../pikpak/dirfilelist')
    const { mapDropboxFileToAliModel } = await import('../../dropbox/dirfilelist')
    const { mapOneDriveItemToAliModel } = await import('../../onedrive/dirfilelist')
    const { mapBoxItemToAliModel } = await import('../../box/dirfilelist')

    expect(mapCloud123FileToAliModel({
      fileId: 1,
      filename: 'photo.jpg',
      parentFileId: 0,
      type: 0,
      size: 1,
      category: 0,
      status: 0,
      trashed: 0
    }).category).toBe('image')

    expect(mapDrive115FileToAliModel({
      fid: 'file-id',
      pid: 'folder-id',
      fc: '1',
      fn: 'photo.jpeg',
      fs: 1
    }, 'drive115').category).toBe('image')

    expect(mapBaiduFileToAliModel({
      fs_id: 1,
      path: '/photo.png',
      server_filename: 'photo.png',
      size: 1,
      server_mtime: 0,
      server_ctime: 0,
      isdir: 0
    }, 'baidu', '/').category).toBe('image')

    expect(mapPikPakFileToAliModel({
      id: 'file-id',
      parent_id: 'folder-id',
      kind: 'drive#file',
      name: 'photo.bmp',
      size: 1
    }, 'pikpak', 'folder-id').category).toBe('image')

    expect(mapDropboxFileToAliModel({
      '.tag': 'file',
      id: 'id:file',
      name: 'photo.jpg',
      size: 1
    }, 'dropbox', 'dropbox_root').category).toBe('image')

    expect(mapOneDriveItemToAliModel({
      id: 'file-id',
      name: 'photo.jpeg',
      size: 1,
      file: {}
    }, 'onedrive', 'onedrive_root').category).toBe('image')

    expect(mapBoxItemToAliModel({
      id: 'file-id',
      type: 'file',
      name: 'photo.png',
      size: 1
    }, 'box', 'box_root').category).toBe('image')
  })
})

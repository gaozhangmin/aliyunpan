import { describe, expect, it } from 'vitest'
import {
  buildDropboxCreateSharedLinkBody,
  mapDropboxSharedLinkToAliShareItem,
  normalizeDropboxSharedLinkUrl,
  toDropboxShareExpiration
} from '../share'

describe('Dropbox share helpers', () => {
  it('builds a shared-link request for a public link without optional settings', () => {
    expect(buildDropboxCreateSharedLinkBody('id:abc', '', '')).toEqual({
      path: 'id:abc'
    })
  })

  it('adds expiration and password settings only when requested', () => {
    expect(buildDropboxCreateSharedLinkBody('/movie.mkv', '2026-06-01T08:00:00.000Z', '1234')).toEqual({
      path: '/movie.mkv',
      settings: {
        requested_visibility: 'password',
        link_password: '1234',
        expires: '2026-06-01T08:00:00Z'
      }
    })
  })

  it('normalizes the app expiration value to Dropbox seconds precision', () => {
    expect(toDropboxShareExpiration('2026-06-01T08:00:00.123Z')).toBe('2026-06-01T08:00:00Z')
    expect(toDropboxShareExpiration('')).toBe('')
    expect(toDropboxShareExpiration('bad-date')).toBe('')
  })

  it('keeps Dropbox shared-link urls as shareable web urls', () => {
    expect(normalizeDropboxSharedLinkUrl('https://www.dropbox.com/scl/fi/abc/file.mkv?dl=0')).toBe(
      'https://www.dropbox.com/scl/fi/abc/file.mkv?dl=0'
    )
  })

  it('maps Dropbox shared-link metadata to the app share item model', () => {
    const item = mapDropboxSharedLinkToAliShareItem({
      id: 'sl.123',
      name: 'movie.mkv',
      url: 'https://www.dropbox.com/scl/fi/abc/movie.mkv?dl=0',
      expires: '2026-06-01T08:00:00Z',
      path_lower: '/movie.mkv'
    }, 'dropbox', ['id:abc'], 'My Movie', '1234')

    expect(item).toMatchObject({
      drive_id: 'dropbox',
      file_id_list: ['id:abc'],
      share_id: 'sl.123',
      share_name: 'My Movie',
      share_pwd: '1234',
      share_url: 'https://www.dropbox.com/scl/fi/abc/movie.mkv?dl=0',
      expiration: '2026-06-01T08:00:00Z',
      share_msg: expect.any(String)
    })
  })
})

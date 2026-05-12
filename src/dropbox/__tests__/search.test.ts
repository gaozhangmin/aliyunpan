import { describe, expect, it } from 'vitest'
import { buildDropboxSearchBody, filterDropboxSearchResults, parseDropboxSearchId } from '../search'
import { mapDropboxFileToAliModel } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('Dropbox search helpers', () => {
  it('parses app search ids into Dropbox query and local filters', () => {
    const parsed = parseDropboxSearchId('searchMovie ext:mkv,mp4 type:video min:1024 max:2048 range:resource')

    expect(parsed.query).toBe('Movie')
    expect(parsed.extensions).toEqual(['mkv', 'mp4'])
    expect(parsed.categories).toEqual(['video'])
    expect(parsed.minSize).toBe(1024)
    expect(parsed.maxSize).toBe(2048)
  })

  it('builds search_v2 body with active file status', () => {
    expect(buildDropboxSearchBody('Movie', 100)).toEqual({
      query: 'Movie',
      options: {
        file_status: 'active',
        filename_only: false,
        max_results: 100
      }
    })
  })

  it('filters advanced search results locally', () => {
    const video = mapDropboxFileToAliModel({
      '.tag': 'file',
      name: 'Movie.mkv',
      id: 'id:video',
      size: 1500
    }, 'dropbox', 'dropbox_root')
    const doc = mapDropboxFileToAliModel({
      '.tag': 'file',
      name: 'Movie.txt',
      id: 'id:doc',
      size: 1500
    }, 'dropbox', 'dropbox_root')
    const tooSmall = mapDropboxFileToAliModel({
      '.tag': 'file',
      name: 'Movie.mp4',
      id: 'id:small',
      size: 50
    }, 'dropbox', 'dropbox_root')

    const parsed = parseDropboxSearchId('searchMovie ext:mkv,mp4 type:video min:1000')
    expect(filterDropboxSearchResults([video, doc, tooSmall], parsed).map(item => item.file_id)).toEqual(['id:video'])
  })
})

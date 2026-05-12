import { describe, expect, it } from 'vitest'
import { buildOneDriveSearchPath, filterOneDriveSearchResults, parseOneDriveSearchId } from '../search'
import { mapOneDriveItemToAliModel } from '../dirfilelist'

(globalThis as any).pinyinlite = (input: string) => input.split('').map((char) => [char])

describe('OneDrive search helpers', () => {
  it('builds v1.0 drive search path', () => {
    expect(buildOneDriveSearchPath('Movie')).toBe("/me/drive/search(q='Movie')?$expand=thumbnails")
    expect(buildOneDriveSearchPath("Bob's")).toBe("/me/drive/search(q='Bob''s')?$expand=thumbnails")
  })

  it('parses advanced search filters and filters mapped results locally', () => {
    const filters = parseOneDriveSearchId('searchMovie ext:mkv,mp4 type:video min:1000')
    const video = mapOneDriveItemToAliModel({ id: 'v', name: 'Movie.mkv', size: 1500, file: {} }, 'onedrive', 'onedrive_root')
    const text = mapOneDriveItemToAliModel({ id: 't', name: 'Movie.txt', size: 1500, file: {} }, 'onedrive', 'onedrive_root')

    expect(filters.query).toBe('Movie')
    expect(filterOneDriveSearchResults([video, text], filters).map(item => item.file_id)).toEqual(['v'])
  })
})

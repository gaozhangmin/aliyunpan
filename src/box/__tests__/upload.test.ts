import { describe, expect, it } from 'vitest'
import { buildBoxSmallUploadAttributes, buildBoxUploadSessionBody, buildBoxUploadSessionPath, toBoxConflictBehavior } from '../upload'

describe('Box upload helpers', () => {
  it('builds small upload attributes for root and child folders', () => {
    expect(buildBoxSmallUploadAttributes('box_root', 'note.txt')).toEqual({ name: 'note.txt', parent: { id: '0' } })
    expect(buildBoxSmallUploadAttributes('123', 'note.txt')).toEqual({ name: 'note.txt', parent: { id: '123' } })
  })

  it('builds upload session path and body', () => {
    expect(buildBoxUploadSessionPath()).toBe('/files/upload_sessions')
    expect(buildBoxUploadSessionBody('box_root', 'movie.mkv', 1024)).toEqual({
      folder_id: '0',
      file_name: 'movie.mkv',
      file_size: 1024
    })
  })

  it('maps conflict behavior', () => {
    expect(toBoxConflictBehavior('auto_rename')).toBe('rename')
    expect(toBoxConflictBehavior('overwrite')).toBe('overwrite')
    expect(toBoxConflictBehavior('refuse')).toBe('refuse')
  })
})

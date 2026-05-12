import { describe, expect, it } from 'vitest'
import { buildOneDriveSmallUploadPath, buildOneDriveUploadSessionBody, buildOneDriveUploadSessionPath, toOneDriveConflictBehavior } from '../upload'

describe('OneDrive upload helpers', () => {
  it('builds small upload path for root and child folders', () => {
    expect(buildOneDriveSmallUploadPath('onedrive_root', 'note.txt')).toBe('/me/drive/root:/note.txt:/content')
    expect(buildOneDriveSmallUploadPath('folder-id', 'note.txt')).toBe('/me/drive/items/folder-id:/note.txt:/content')
  })

  it('builds upload session path', () => {
    expect(buildOneDriveUploadSessionPath('folder-id', 'movie.mkv')).toBe('/me/drive/items/folder-id:/movie.mkv:/createUploadSession')
  })

  it('maps conflict behavior and builds upload session body', () => {
    expect(toOneDriveConflictBehavior('auto_rename')).toBe('rename')
    expect(toOneDriveConflictBehavior('overwrite')).toBe('replace')
    expect(toOneDriveConflictBehavior('refuse')).toBe('fail')
    expect(buildOneDriveUploadSessionBody('auto_rename')).toEqual({
      item: {
        '@microsoft.graph.conflictBehavior': 'rename'
      }
    })
  })
})

import { describe, expect, it } from 'vitest'
import { buildOneDriveCopyBody, buildOneDriveMkdirBody, buildOneDriveMoveBody, buildOneDriveRenameBody } from '../filecmd'

describe('OneDrive file command helpers', () => {
  it('builds mkdir body with rename conflict behavior', () => {
    expect(buildOneDriveMkdirBody('New Folder')).toEqual({
      name: 'New Folder',
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    })
  })

  it('builds rename body', () => {
    expect(buildOneDriveRenameBody('new.txt')).toEqual({ name: 'new.txt' })
  })

  it('builds move and copy bodies with parent reference', () => {
    expect(buildOneDriveMoveBody('target')).toEqual({ parentReference: { id: 'target' } })
    expect(buildOneDriveCopyBody('target', 'demo.txt')).toEqual({ parentReference: { id: 'target' }, name: 'demo.txt' })
  })
})

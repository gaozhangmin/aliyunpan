import { describe, expect, it } from 'vitest'
import { buildBoxCopyBody, buildBoxMkdirBody, buildBoxMoveBody, buildBoxRenameBody, toBoxFolderId } from '../filecmd'

describe('Box file command helpers', () => {
  it('normalizes app root to Box root folder id', () => {
    expect(toBoxFolderId('box_root')).toBe('0')
    expect(toBoxFolderId('123')).toBe('123')
  })

  it('builds mkdir and rename bodies', () => {
    expect(buildBoxMkdirBody('New Folder', 'box_root')).toEqual({ name: 'New Folder', parent: { id: '0' } })
    expect(buildBoxRenameBody('new.txt')).toEqual({ name: 'new.txt' })
  })

  it('builds move and copy bodies', () => {
    expect(buildBoxMoveBody('target')).toEqual({ parent: { id: 'target' } })
    expect(buildBoxCopyBody('target', 'demo.txt')).toEqual({ parent: { id: 'target' }, name: 'demo.txt' })
  })
})

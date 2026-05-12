import { describe, expect, it } from 'vitest'
import { buildDropboxListRevisionsBody, buildDropboxRestoreBody } from '../revisions'

describe('Dropbox revision helpers', () => {
  it('builds list revisions request body', () => {
    expect(buildDropboxListRevisionsBody('id:file', 20)).toEqual({
      path: 'id:file',
      mode: {
        '.tag': 'path'
      },
      limit: 20
    })
  })

  it('builds restore request body', () => {
    expect(buildDropboxRestoreBody('id:file', '015abc')).toEqual({
      path: 'id:file',
      rev: '015abc'
    })
  })
})

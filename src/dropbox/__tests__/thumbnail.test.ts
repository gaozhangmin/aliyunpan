import { describe, expect, it } from 'vitest'
import { buildDropboxThumbnailArg, buildDropboxThumbnailDataUrl } from '../thumbnail'

describe('Dropbox thumbnail helpers', () => {
  it('builds get_thumbnail_v2 arg for a file id', () => {
    expect(buildDropboxThumbnailArg('id:file', 'png', 'w256h256')).toEqual({
      resource: {
        '.tag': 'path',
        path: 'id:file'
      },
      format: 'png',
      size: 'w256h256',
      mode: 'strict'
    })
  })

  it('converts thumbnail bytes into an image data url', () => {
    expect(buildDropboxThumbnailDataUrl(new Uint8Array([65, 66, 67]), 'jpeg')).toBe('data:image/jpeg;base64,QUJD')
  })
})

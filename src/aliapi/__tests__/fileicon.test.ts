import { describe, expect, it } from 'vitest'
import getFileIcon from '../fileicon'

describe('getFileIcon', () => {
  it('classifies common raster image extensions without upstream category', () => {
    expect(getFileIcon('', 'jpg', 'jpg', '', 1)[0]).toBe('image')
    expect(getFileIcon('', 'jpeg', 'jpeg', '', 1)[0]).toBe('image')
    expect(getFileIcon('', 'png', 'png', '', 1)[0]).toBe('image')
    expect(getFileIcon('', 'bmp', 'bmp', '', 1)[0]).toBe('image')
  })
})

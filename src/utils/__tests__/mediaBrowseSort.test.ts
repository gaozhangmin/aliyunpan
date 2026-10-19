import { describe, expect, it } from 'vitest'
import { compareMediaBrowseValues, nextMediaBrowseSort, type MediaBrowseSort } from '../mediaBrowseSort'

describe('media browse sorting', () => {
  it('cycles title, filename, added date, release date and wraps', () => {
    let sort: MediaBrowseSort = 'title'
    expect([1, 2, 3, 4].map(() => (sort = nextMediaBrowseSort(sort)))).toEqual(['fileName', 'addedAt', 'premiereDate', 'title'])
  })
  it('distinguishes filename from scraped title and uses natural filename order', () => {
    const a = { title: 'Z', fileName: 'video2.mp4' }, b = { title: 'A', fileName: 'video10.mp4' }
    expect(compareMediaBrowseValues(a, b, 'fileName')).toBeLessThan(0)
    expect(compareMediaBrowseValues(a, b, 'title')).toBeGreaterThan(0)
  })
  it('sorts actual dates newest first and missing dates last', () => {
    const a = { title: 'A', addedAt: new Date('2024-02-01'), premiereDate: '2020-05-01' }
    const b = { title: 'B', addedAt: '2023-01-01', premiereDate: '2020-06-01' }
    expect(compareMediaBrowseValues(a, b, 'addedAt')).toBeLessThan(0)
    expect(compareMediaBrowseValues(a, b, 'premiereDate')).toBeGreaterThan(0)
    expect(compareMediaBrowseValues(a, { title: 'C' }, 'premiereDate')).toBeLessThan(0)
  })
})

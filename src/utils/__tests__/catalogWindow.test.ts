import { describe, expect, it } from 'vitest'
import { virtualCardRange } from '../virtualCardRange'
import { MergedCatalogPager } from '../mergedCatalogPager'

describe('local catalog window', () => {
  it('keeps a ten-thousand-item grid bounded while covering the viewport', () => {
    const range = virtualCardRange(10000, 8, 210, 21000, 840)
    expect(range.end - range.start).toBeLessThanOrEqual(80)
    expect(range.start % 8).toBe(0)
    expect(range.start).toBeLessThan(800)
    expect(range.end).toBeGreaterThan(832)
    expect(range.top + (range.end - range.start) / 8 * 210 + range.bottom).toBe(1250 * 210)
  })
  it('keeps the last partial row reachable and handles a shrinking category', () => {
    expect(virtualCardRange(123, 8, 210, 100000, 800).end).toBe(123)
    expect(virtualCardRange(0, 8, 210, 100000, 800).end).toBe(0)
  })
})
describe('multi-library pagination', () => {
  it('retains every item when one library dominates several merged pages', async () => {
    const calls: string[] = []
    const pager = new MergedCatalogPager(['a', 'b'], 2, async (id, page) => {
      calls.push(id + page)
      const items = id === 'a' ? [1, 2, 3, 4, 5] : [10, 11, 12]
      return { items: items.slice(page * 2, page * 2 + 2), total: items.length }
    }, (a, b) => a - b, String)
    const first = await pager.page(0)
    expect(first.items).toEqual([1, 2])
    expect(calls).toEqual(['a0', 'b0'])
    const pages = await Promise.all([pager.page(1), pager.page(2), pager.page(3)])
    expect([first, ...pages].flatMap(page => page.items)).toEqual([1, 2, 3, 4, 5, 10, 11, 12])
    expect((await pager.page(4)).hasNextPage).toBe(false)
    expect(calls.filter(call => call === 'b0')).toHaveLength(1)
  })
  it('does not lose partially merged results when a source fails and retries', async () => {
    let fail = true
    const pager = new MergedCatalogPager(['a', 'b'], 2, async (id, page) => {
      if (id === 'b' && page === 1 && fail) { fail = false; throw new Error('retry') }
      const items = id === 'a' ? [1, 4, 7] : [2, 3, 6]
      return { items: items.slice(page * 2, page * 2 + 2), total: items.length }
    }, (a, b) => a - b, String)
    expect((await pager.page(0)).items).toEqual([1, 2])
    await expect(pager.page(1)).rejects.toThrow('retry')
    expect((await pager.page(1)).items).toEqual([3, 4])
    expect((await pager.page(2)).items).toEqual([6, 7])
  })
})

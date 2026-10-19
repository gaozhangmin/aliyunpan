import { describe, expect, it, vi } from 'vitest'
import { readHomeCatalogPages } from '../homeCatalogPages'

describe('complete Home catalog', () => {
  it.each([0, 100, 256, 600])('reads all %i records without duplicates or a 100-record cutoff', async count => {
    const library = Array.from({ length: count }, (_, index) => ({ id: String(index).padStart(6, '0') }))
    const read = vi.fn(async (after: string | undefined, limit: number) => library.filter(item => after === undefined || item.id > after).slice(0, limit))
    const yieldToUI = vi.fn(async () => {})
    expect(await readHomeCatalogPages(read, yieldToUI)).toEqual(library)
    expect(read).toHaveBeenCalledTimes(Math.floor(count / 256) + 1)
    expect(yieldToUI).toHaveBeenCalledTimes(Math.floor(count / 256))
  })
  it('rejects a failed batch instead of publishing a truncated catalog', async () => {
    const read = vi.fn().mockResolvedValueOnce(Array.from({ length: 256 }, (_, id) => ({ id: String(id) }))).mockRejectedValueOnce(new Error('database unavailable'))
    await expect(readHomeCatalogPages(read, async () => {})).rejects.toThrow('database unavailable')
  })
})

/** Merge individually sorted source pages without discarding unconsumed items.
 * Only an exhausted source fetches another page; concurrent callers share the queue. */
export class MergedCatalogPager<T> {
  private sources: Array<{ id: string; items: T[]; next: number; total: number; more: boolean }>
  private pages: T[][] = []
  private building: T[] = []
  private seen = new Set<string>()
  private pending: Promise<unknown> = Promise.resolve()
  constructor(ids: string[], private size: number,
    private load: (id: string, page: number) => Promise<{ items: T[]; total: number }>,
    private compare: (a: T, b: T) => number, private identity: (item: T) => string) {
    this.sources = ids.map(id => ({ id, items: [], next: 0, total: 0, more: true }))
  }
  page(index: number): Promise<{ items: T[]; total: number; hasNextPage: boolean }> {
    const result = this.pending.then(async () => {
      while (this.pages.length <= index) {
        const items = this.building
        while (items.length < this.size) {
          await Promise.all(this.sources.filter(source => !source.items.length && source.more).map(async source => {
            const next = await this.load(source.id, source.next)
            source.items = next.items
            source.total = next.total
            source.next++
            source.more = next.items.length >= this.size
          }))
          const available = this.sources.filter(source => source.items.length)
          if (!available.length) break
          const source = available.reduce((best, next) => this.compare(best.items[0], next.items[0]) <= 0 ? best : next)
          const item = source.items.shift()!
          const id = this.identity(item)
          if (!this.seen.has(id)) { this.seen.add(id); items.push(item) }
        }
        this.pages.push(items)
        this.building = []
        if (!items.length) break
      }
      return { items: this.pages[index] || [], total: this.sources.reduce((sum, source) => sum + source.total, 0),
        hasNextPage: index < this.pages.length - 1 || this.sources.some(source => source.items.length > 0 || source.more) }
    })
    this.pending = result.catch(() => {})
    return result
  }
}

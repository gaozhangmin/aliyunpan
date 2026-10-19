/** Read a complete catalog in bounded keyset batches, yielding to input between reads. */
export async function readHomeCatalogPages<T extends { id: string }>(
  read: (after: string | undefined, limit: number) => Promise<T[]>,
  yieldToUI: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 0))
): Promise<T[]> {
  const items: T[] = []
  let after: string | undefined
  while (true) {
    const page = await read(after, 256)
    items.push(...page)
    if (page.length < 256) return items
    after = page[page.length - 1].id
    await yieldToUI()
  }
}

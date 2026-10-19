export type MediaBrowseSort = 'fileName' | 'addedAt' | 'premiereDate' | 'title'
export const mediaBrowseSortOrder: MediaBrowseSort[] = ['title', 'fileName', 'addedAt', 'premiereDate']
export function nextMediaBrowseSort(sort: MediaBrowseSort): MediaBrowseSort {
  return mediaBrowseSortOrder[(mediaBrowseSortOrder.indexOf(sort) + 1) % mediaBrowseSortOrder.length]
}
interface SortValues { fileName?: string; title: string; addedAt?: string | number | Date; premiereDate?: string }
export function compareMediaBrowseValues(a: SortValues, b: SortValues, sort: MediaBrowseSort): number {
  const text = (x: string, y: string) => x.localeCompare(y, undefined, { numeric: true })
  if (sort === 'fileName') return text(a.fileName || a.title, b.fileName || b.title) || text(a.title, b.title)
  if (sort === 'title') return text(a.title, b.title)
  const timestamp = (value: string | number | Date | undefined) => value === undefined || value === '' ? 0 : new Date(value).getTime() || 0
  return timestamp(b[sort]) - timestamp(a[sort]) || text(a.title, b.title)
}

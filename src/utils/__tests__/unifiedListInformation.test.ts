import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
describe('home section list information', () => {
  it('passes local metadata through the actual home-row card factory', () => {
    const view = read('views/UnifiedMediaLibraryView.vue')
    expect(view).toContain('overview: item.overview, certification: item.certification, rating: item.rating')
    expect(view).toContain(':row="selectedHomeRow" :mode="collectionMode"')
  })
  it('renders synopsis and a non-nested watched toggle for local list cards', () => {
    const row = read('components/UnifiedMediaRow.vue')
    expect(row).toContain('class="list-overview"')
    expect(row).toContain("card.posterMenu?.action('watched')")
    expect(row).toContain('@toggle="toggleWatched(card)"')
    expect(row).toContain('visibleCards')
    expect(row).toContain('@click.stop @dblclick.stop @keydown.stop')
    expect(row).not.toContain('!card.posterMenu.server')
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('music and book artwork placeholders', () => {
  it('selects category icons without changing the movie fallback', () => {
    const placeholder = readFileSync('src/components/MediaPosterPlaceholder.vue', 'utf8')
    expect(placeholder).toContain("kind: 'film'")
    expect(placeholder).toContain("kind === 'music'")
    expect(placeholder).toContain('<BookOpen v-else />')
    expect(readFileSync('src/components/UnifiedMediaRow.vue', 'utf8')).toContain("row.key === 'music' ? 'music' : row.key === 'books' ? 'book' : 'film'")
    const view = readFileSync('src/views/UnifiedMediaLibraryView.vue', 'utf8')
    expect(view).toContain('libraryCategoryIcon(card.key)')
  })
})

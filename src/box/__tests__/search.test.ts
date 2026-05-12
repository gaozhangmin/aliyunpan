import { describe, expect, it } from 'vitest'
import { buildBoxSearchPath, parseBoxSearchId } from '../search'

describe('Box search helpers', () => {
  it('builds search path', () => {
    const path = buildBoxSearchPath('demo file', 50, 10)
    expect(path).toContain('/search?')
    expect(path).toContain('query=demo+file')
    expect(path).toContain('limit=50')
    expect(path).toContain('offset=10')
  })

  it('parses search ids', () => {
    expect(parseBoxSearchId('box_search:demo%20file')).toEqual({ query: 'demo file' })
    expect(parseBoxSearchId('abc')).toEqual({ query: '' })
  })
})

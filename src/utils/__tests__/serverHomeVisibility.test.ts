import { describe, expect, it } from 'vitest'
import { showServerHomeError } from '../serverHomeVisibility'

describe('server Home error visibility', () => {
  it('does not invent an error category after all cached categories are hidden', () => {
    expect(showServerHomeError('a', true, ['b:movies'], ['a:movies'])).toBe(false)
  })
  it('retains the hidden preference before any catalog is available', () => {
    expect(showServerHomeError('a', false, [], ['a:movies'])).toBe(false)
  })
  it('shows errors for a visible category', () => {
    expect(showServerHomeError('a', true, ['a:tv'], ['a:movies'])).toBe(true)
  })
  it('shows first connection errors without affecting another server', () => {
    expect(showServerHomeError('a', false, [], ['ab:movies'])).toBe(true)
  })
})

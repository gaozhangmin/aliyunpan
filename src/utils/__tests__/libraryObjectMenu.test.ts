import { describe, expect, it } from 'vitest'
import { mediaPosterActions } from '../mediaPosterMenu'

describe('media object menus', () => {
 it.each(['playlist', 'series'] as const)('keeps basic movie actions inside a %s', membership => {
  const actions = mediaPosterActions(false, false, membership)
  expect(actions).toEqual(expect.arrayContaining(['play', 'loop', 'select', 'rating', 'share', 'download', 'metadata', 'watched', 'continue', 'playlist', 'series']))
  expect(actions).not.toContain('delete')
  expect(new Set(actions).size).toBe(actions.length)
 })
 it('preserves TV playback and state actions inside a series', () => {
  expect(mediaPosterActions(false, true, 'series')).toEqual(expect.arrayContaining(['shuffle', 'select', 'rating', 'watched', 'continue', 'playlist']))
 })
 it('only exposes the destructive action for the current membership', () => {
  const playlist = mediaPosterActions(false, false, 'playlist')
  const series = mediaPosterActions(false, false, 'series')
  expect(playlist.at(-1)).toBe('removePlaylistItem')
  expect(series.at(-1)).toBe('removeSeriesItem')
  expect(playlist).not.toContain('removeSeriesItem')
  expect(series).not.toContain('removePlaylistItem')
  expect(mediaPosterActions(false, false)).toContain('delete')
 })
})

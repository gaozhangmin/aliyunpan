import { describe, expect, it } from 'vitest'
import { toMsCacheUrl } from '../imageCache'

describe('toMsCacheUrl', () => {
  it('returns mscache URL when serverId and url are provided', () => {
    const result = toMsCacheUrl('server1', 'http://192.168.1.1:8096/Items/abc/Images/Primary?quality=90')
    expect(result).toMatch(/^mscache:\/\/server1\/[A-Za-z0-9\-_]+$/)
  })

  it('returns original URL when serverId is empty', () => {
    const url = 'http://192.168.1.1:8096/Items/abc/Images/Primary'
    expect(toMsCacheUrl('', url)).toBe(url)
    expect(toMsCacheUrl(undefined, url)).toBe(url)
  })

  it('returns original URL when originalUrl is empty', () => {
    expect(toMsCacheUrl('server1', '')).toBe('')
  })

  it('produces stable output for same input', () => {
    const url = 'http://192.168.1.1:8096/Items/abc/Images/Primary'
    expect(toMsCacheUrl('server1', url)).toBe(toMsCacheUrl('server1', url))
  })

  it('produces different output for different URLs', () => {
    const a = toMsCacheUrl('server1', 'http://host/Items/a/Images/Primary')
    const b = toMsCacheUrl('server1', 'http://host/Items/b/Images/Primary')
    expect(a).not.toBe(b)
  })
})

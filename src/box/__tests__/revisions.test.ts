import { describe, expect, it } from 'vitest'
import { buildBoxPromoteVersionPath, buildBoxVersionsPath } from '../revisions'

describe('Box revisions helpers', () => {
  it('builds versions endpoints', () => {
    expect(buildBoxVersionsPath('123')).toContain('/files/123/versions?')
    expect(buildBoxPromoteVersionPath('123')).toBe('/files/123/versions/current')
  })
})

import { describe, expect, it } from 'vitest'
import { buildOneDriveRestoreVersionPath, buildOneDriveVersionsPath } from '../revisions'

describe('onedrive revisions helpers', () => {
  it('builds versions endpoint', () => {
    expect(buildOneDriveVersionsPath('abc 123')).toBe('/me/drive/items/abc%20123/versions')
  })

  it('builds restore version endpoint', () => {
    expect(buildOneDriveRestoreVersionPath('abc 123', '1.0')).toBe('/me/drive/items/abc%20123/versions/1.0/restoreVersion')
  })
})

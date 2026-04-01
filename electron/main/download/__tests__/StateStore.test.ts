// electron/main/download/__tests__/StateStore.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StateStore } from '../StateStore'
import { DownloadMeta } from '../types'
import fs from 'fs'
import path from 'path'
import os from 'os'

const makeMeta = (gid = 'abc1234567890abc'): DownloadMeta => ({
  gid,
  user_id: 'u1', drive_id: 'd1', file_id: 'f1', encType: '',
  totalSize: 1000, rangeSupported: true,
  chunks: [
    { start: 0, end: 499, written: 0 },
    { start: 500, end: 999, written: 0 }
  ]
})

describe('StateStore', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'statestore-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('write then read returns identical object', () => {
    const metaPath = path.join(tmpDir, 'test.td.json')
    const meta = makeMeta()
    StateStore.write(metaPath, meta)
    expect(StateStore.read(metaPath)).toEqual(meta)
  })

  it('read returns null for missing file', () => {
    expect(StateStore.read(path.join(tmpDir, 'ghost.td.json'))).toBeNull()
  })

  it('read returns null for invalid JSON', () => {
    const metaPath = path.join(tmpDir, 'bad.td.json')
    fs.writeFileSync(metaPath, 'not json')
    expect(StateStore.read(metaPath)).toBeNull()
  })

  it('delete removes the file', () => {
    const metaPath = path.join(tmpDir, 'del.td.json')
    StateStore.write(metaPath, makeMeta())
    StateStore.delete(metaPath)
    expect(fs.existsSync(metaPath)).toBe(false)
  })

  it('delete does not throw if file missing', () => {
    expect(() => StateStore.delete(path.join(tmpDir, 'none.json'))).not.toThrow()
  })

  it('scanDirectory finds .td.json files and ignores others', () => {
    StateStore.write(path.join(tmpDir, 'a.td.json'), makeMeta('aaa'))
    StateStore.write(path.join(tmpDir, 'b.td.json'), makeMeta('bbb'))
    fs.writeFileSync(path.join(tmpDir, 'notme.txt'), 'ignore')
    const results = StateStore.scanDirectory(tmpDir)
    expect(results).toHaveLength(2)
    const gids = results.map(r => r.meta.gid).sort()
    expect(gids).toEqual(['aaa', 'bbb'])
  })

  it('scanDirectory returns empty array for missing directory', () => {
    expect(StateStore.scanDirectory('/tmp/does-not-exist-xyz')).toEqual([])
  })
})

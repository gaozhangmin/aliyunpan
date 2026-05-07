import { describe, expect, it, vi } from 'vitest'
import {
  autoMatchDanmaku,
  buildDanmakuPluginOption,
  createDanmakuFilter,
  loadDanmakuComments,
  normalizeDanmakuApiUrl
} from '../danmakuApi'

describe('danmakuApi', () => {
  it('normalizes provider base urls', () => {
    expect(normalizeDanmakuApiUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeDanmakuApiUrl(' https://example.com/api ')).toBe('https://example.com/api')
  })

  it('auto matches by posting the Swift-compatible match body to the first api', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        errorCode: 0,
        success: true,
        errorMessage: '',
        isMatched: true,
        matches: [{ episodeId: 12, animeId: 3, animeTitle: 'A', episodeTitle: 'E1', type: 'tv', typeDescription: 'TV', shift: 0 }]
      })
    })

    const result = await autoMatchDanmaku('video name.mkv', [{ id: '1', name: 'API', url: 'https://api.test/' }], fetchMock as any)

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v2/match', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'User-Agent': 'BoxPlayer'
      }),
      body: JSON.stringify({
        matchMode: 'fileNameOnly',
        fileHash: '',
        fileSize: 0,
        fileName: 'video name.mkv',
        videoDuration: 0
      })
    }))
    expect(result?.response.matches[0].episodeId).toBe(12)
  })

  it('converts comment payloads to ArtPlayer danmuku entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 3,
        comments: [
          { cid: 1, p: '1.5,1,16711680', m: 'scroll', t: 11 },
          { cid: 2, p: '2,5,65280', m: 'top', t: 12 },
          { cid: 3, p: '3,4,255', m: 'bottom', t: 13 }
        ]
      })
    })

    const result = await loadDanmakuComments(9, { id: 'api', name: 'API', url: 'https://api.test' }, fetchMock as any)

    expect(result).toEqual([
      expect.objectContaining({ text: 'scroll', time: 1.5, mode: 0, color: '#ff0000' }),
      expect.objectContaining({ text: 'top', time: 2, mode: 1, color: '#00ff00' }),
      expect.objectContaining({ text: 'bottom', time: 3, mode: 2, color: '#0000ff' })
    ])
  })

  it('builds plugin options and filters comma separated keywords', () => {
    const filter = createDanmakuFilter('广告, 剧透')

    expect(filter({ text: '正常弹幕' })).toBe(true)
    expect(filter({ text: '这里有剧透' })).toBe(false)
    expect(buildDanmakuPluginOption({ danmakuSpeed: 6, danmakuFilterText: '广告' }).speed).toBe(6)
  })
})

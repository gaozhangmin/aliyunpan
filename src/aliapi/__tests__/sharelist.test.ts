import { afterEach, describe, expect, it, vi } from 'vitest'

describe('AliShareList provider routing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not call Aliyun share list api for unsupported third-party users', async () => {
    ;(globalThis as any).self = globalThis
    const { default: AliHttp } = await import('../alihttp')
    const { default: AliShareList } = await import('../sharelist')
    const postSpy = vi.spyOn(AliHttp, 'Post').mockRejectedValue(new Error('should not call Aliyun'))

    const resp = await AliShareList.ApiShareListAll('onedrive_user')

    expect(resp.items).toEqual([])
    expect(resp.next_marker).toBe('')
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('does not call Aliyun share list api when checking unsupported third-party share ids', async () => {
    ;(globalThis as any).self = globalThis
    const { default: AliHttp } = await import('../alihttp')
    const { default: AliShareList } = await import('../sharelist')
    const postSpy = vi.spyOn(AliHttp, 'Post').mockRejectedValue(new Error('should not call Aliyun'))

    await expect(AliShareList.ApiShareListUntilShareID('box_user', 'share-id')).resolves.toBe(false)
    expect(postSpy).not.toHaveBeenCalled()
  })
})

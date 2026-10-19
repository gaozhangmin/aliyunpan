import { describe, expect, it } from 'vitest'
import { buildQuarkCookieHeader, mergeQuarkCookieHeaders, mergeQuarkAccountCookies } from '../quarkCookies'

describe('Quark download cookie contract', () => {
  it('does not send a pan-only stale cookie to the drive download host', () => {
    const header = buildQuarkCookieHeader([
      { name: '__uid', value: 'account', domain: '.quark.cn' },
      { name: '__pus', value: 'stale-pan', domain: '.pan.quark.cn' },
      { name: '__pus', value: 'current-drive', domain: '.drive.quark.cn' }
    ], 'https://drive.quark.cn/1/clouddrive/file/download')

    expect(header).toBe('__uid=account; __pus=current-drive')
  })

  it('keeps the current session value over a persisted fallback value', () => {
    expect(mergeQuarkCookieHeaders('__uid=account; __pus=current', '__uid=account; __pus=stale; __kps=fallback')).toBe('__uid=account; __pus=current; __kps=fallback')
  })

  it('uses the requested account rather than another active account for file browsing', () => {
    expect(mergeQuarkAccountCookies('__uid=target; __pus=target-session', '__uid=other; __pus=other-session; locale=zh-CN')).toBe('locale=zh-CN; __uid=target; __pus=target-session')
  })
})

import { describe, expect, it } from 'vitest'
import {
  getAlipanMemberPromotionUrl,
  getAlipanDownloadPromotionReason,
  getAlipanVideoPromotionReason,
  ALIPAN_MEMBER_PROMOTION_URL
} from '../alipanPromotionRules'

describe('alipan promotion helpers', () => {
  it('detects third-party member prompts from download url descriptions', () => {
    const reason = getAlipanDownloadPromotionReason({
      description: '当前用户非三方会员，下载速度可能受网络闲忙时影响。开通三方会员后，可享受高速下载通道，保障下载速度'
    })

    expect(reason).toContain('高速下载通道')
    expect(ALIPAN_MEMBER_PROMOTION_URL).toBe('https://www.alipan.com/cpx/member?userCode=MzAwMDQx')
    expect(getAlipanMemberPromotionUrl('buy-token', { skuCode: 'thirdParty' }))
      .toBe('https://www.alipan.com/cpx/member?userCode=MzAwMDQx&token=buy-token&skuCode=thirdParty')
  })

  it('detects capacity limit responses from video preview api', () => {
    expect(getAlipanVideoPromotionReason({
      code: 'ExceedCapacityForbidden',
      message: '用户容量超限，限制播放，需要扩容或者删除不必要的文件释放空间'
    })).toBe('云存储空间已超限，播放受限。可购买 VIP 服务或空间扩容套餐。')
    expect(getAlipanMemberPromotionUrl('capacity-token')).toContain('token=capacity-token')
  })

  it('uses empty transcoding task descriptions as member prompts', () => {
    const reason = getAlipanVideoPromotionReason({
      video_preview_play_info: {
        live_transcoding_task_list: [
          { template_id: 'SD', url: 'https://example.com/sd.m3u8' },
          { template_id: 'HD', url: '', description: '当前用户不是三方会员，购买三方会员后即可获取高清观影地址' }
        ]
      }
    })

    expect(reason).toBe('当前用户不是三方会员，购买三方会员后即可获取高清观影地址')
  })
})

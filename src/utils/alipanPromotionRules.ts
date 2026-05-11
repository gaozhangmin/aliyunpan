const ALIPAN_MEMBER_PROMOTION_USER_CODE = 'MzAwMDQx'
const ALIPAN_MEMBER_PROMOTION_BASE_URL = 'https://www.alipan.com/cpx/member'

const THIRD_PARTY_MEMBER_KEYWORDS = ['三方会员', '高速下载', '高清观影']

const normalizeReason = (value: unknown) => String(value || '').trim()

export interface IAlipanMemberPromotionUrlOptions {
  skuCode?: string
}

export const getAlipanMemberPromotionUrl = (token = '', options: IAlipanMemberPromotionUrlOptions = {}) => {
  const url = new URL(ALIPAN_MEMBER_PROMOTION_BASE_URL)
  url.searchParams.set('userCode', ALIPAN_MEMBER_PROMOTION_USER_CODE)
  const normalizedToken = normalizeReason(token)
  if (normalizedToken) url.searchParams.set('token', normalizedToken)
  const skuCode = normalizeReason(options.skuCode)
  if (skuCode) url.searchParams.set('skuCode', skuCode)
  return url.toString()
}

export const ALIPAN_MEMBER_PROMOTION_URL = getAlipanMemberPromotionUrl()

export const getAlipanDownloadPromotionReason = (body: any): string => {
  const description = normalizeReason(body?.description)
  if (!description) return ''
  if (!THIRD_PARTY_MEMBER_KEYWORDS.some(keyword => description.includes(keyword))) return ''
  return description
}

export const getAlipanVideoPromotionReason = (body: any): string => {
  if (body?.code === 'ExceedCapacityForbidden') {
    return '云存储空间已超限，播放受限。可购买 VIP 服务或空间扩容套餐。'
  }
  const taskList = body?.video_preview_play_info?.live_transcoding_task_list || []
  if (!Array.isArray(taskList)) return ''
  const blockedTask = taskList.find((item: any) => !item?.url && normalizeReason(item?.description))
  return normalizeReason(blockedTask?.description)
}

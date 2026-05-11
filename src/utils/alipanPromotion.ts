import { ALIPAN_MEMBER_PROMOTION_URL, getAlipanMemberPromotionUrl } from './alipanPromotionRules'
import AliUser from '../aliapi/user'
import { useUserStore } from '../store'
import message from './message'
import { openExternal } from './electronhelper'
import alipanCpxCodeUrl from '../../alipan_cpx_code.png'

export {
  ALIPAN_MEMBER_PROMOTION_URL,
  getAlipanMemberPromotionUrl,
  getAlipanDownloadPromotionReason,
  getAlipanVideoPromotionReason
} from './alipanPromotionRules'

const normalizeReason = (value: unknown) => String(value || '').trim()

let isPromotionDialogVisible = false

export interface IShowAlipanMemberPromotionOptions {
  userId?: string
  skuCode?: string
  confirm?: boolean
}

const getPromotionUserId = (userId?: string) => {
  const normalizedUserId = normalizeReason(userId)
  if (normalizedUserId) return normalizedUserId
  return normalizeReason(useUserStore().user_id)
}

const supportText = '购买会员，平台返佣支持开发者。'

const getPromotionDescription = (reason: string) => reason.includes(supportText)
  ? reason
  : [reason, supportText].join(' ')

export const showAlipanMemberQrPromotion = (reason: string) => {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason || isPromotionDialogVisible) return
  isPromotionDialogVisible = true
  void Promise.all([
    import('vue'),
    import('@arco-design/web-vue')
  ]).then(([{ h }, { Modal }]) => {
    const promotionDescription = getPromotionDescription(normalizedReason)
    Modal.open({
      title: '阿里云盘会员服务',
      footer: false,
      maskClosable: false,
      width: 620,
      modalClass: 'alipan-member-modal',
      onBeforeClose: () => {
        isPromotionDialogVisible = false
        return true
      },
      content: () => h('div', {
        style: {
          padding: '18px 22px 24px',
          color: 'var(--color-text-1)'
        }
      }, [
        h('div', {
          style: {
            marginBottom: '18px',
            fontSize: '14px',
            lineHeight: '22px'
          }
        }, promotionDescription),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: '206px 1fr',
            gap: '22px',
            alignItems: 'center'
          }
        }, [
          h('img', {
            src: alipanCpxCodeUrl,
            alt: '阿里云盘会员购买二维码',
            style: {
              width: '206px',
              height: '206px',
              borderRadius: '8px',
              background: '#fff'
            }
          }),
          h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: '0'
            }
          }, [
            h('div', {
              style: {
                fontSize: '16px',
                lineHeight: '24px',
                fontWeight: 600
              }
            }, '扫码购买更多 VIP、扩容空间等服务'),
            h('div', {
              style: {
                color: 'var(--color-text-2)',
                fontSize: '13px',
                lineHeight: '22px'
              }
            }, '也可以点击下方按钮，用外部浏览器打开返佣购买链接。'),
            h('button', {
              type: 'button',
              onClick: () => openExternal(ALIPAN_MEMBER_PROMOTION_URL),
              style: {
                width: '100%',
                height: '38px',
                border: 'none',
                borderRadius: '4px',
                background: 'rgb(var(--primary-6))',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }
            }, '购买年费 VIP / 扩容')
          ])
        ])
      ])
    })
  }).catch(() => {
    isPromotionDialogVisible = false
  })
}

export const showAlipanMemberPromotion = (reason: string, options: IShowAlipanMemberPromotionOptions = {}) => {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason || isPromotionDialogVisible) return
  isPromotionDialogVisible = true
  void Promise.all([
    import('vue'),
    import('@arco-design/web-vue')
  ]).then(([{ h }, { Modal }]) => {
    let promotionPageOpened = false
    const promotionDescription = getPromotionDescription(normalizedReason)
    const openPromotionPage = async () => {
      promotionPageOpened = true
      try {
        const userId = getPromotionUserId(options.userId)
        if (!userId) {
          message.error('请先登录阿里云盘账号')
          isPromotionDialogVisible = false
          return
        }
        const buyToken = await AliUser.ApiOpenUserBuyToken(userId)
        if (!buyToken) {
          isPromotionDialogVisible = false
          return
        }
        Modal.open({
          title: '阿里云盘会员服务',
          footer: false,
          maskClosable: false,
          width: 1120,
          modalClass: 'alipan-member-modal',
          onBeforeClose: () => {
            isPromotionDialogVisible = false
            return true
          },
          content: () => h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              height: '72vh',
              minHeight: '560px',
              overflow: 'hidden'
            }
          }, [
            h('div', {
              style: {
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border-2)',
                color: 'var(--color-text-1)',
                fontSize: '14px',
                lineHeight: '22px'
              }
            }, promotionDescription),
            h('webview', {
              src: getAlipanMemberPromotionUrl(buyToken, { skuCode: options.skuCode }),
              allowpopups: '',
              partition: 'site:alipan-member',
              webpreferences: 'allowRunningInsecureContent',
              style: {
                display: 'flex',
                flex: '1',
                width: '100%',
                minHeight: '0'
              }
            })
          ])
        })
      } catch {
        isPromotionDialogVisible = false
        message.error('打开阿里云盘会员购买页面失败')
      }
    }

    if (options.confirm === false) {
      void openPromotionPage()
      return
    }

    Modal.open({
      title: '阿里云盘会员服务',
      okText: '继续查看',
      cancelText: '取消',
      maskClosable: false,
      width: 420,
      onOk: openPromotionPage,
      onCancel: () => {
        isPromotionDialogVisible = false
      },
      onBeforeClose: () => {
        if (!promotionPageOpened) isPromotionDialogVisible = false
        return true
      },
      content: () => h('div', {
        style: {
          color: 'var(--color-text-1)',
          fontSize: '14px',
          lineHeight: '22px'
        }
      }, [
        h('div', {
          style: {
            marginBottom: '8px'
          }
        }, promotionDescription),
        h('div', null, '是否打开阿里云盘会员/扩容购买页面？页面将在应用内展示。')
      ])
    })
  }).catch(() => {
    isPromotionDialogVisible = false
  })
}

import UserDAL from '../user/userdal'
import { humanDateTime, humanDateTimeDateStr, humanSize, Sleep } from '../utils/format'
import { ITokenInfo } from '../user/userstore'
import AliHttp, {IUrlRespData} from './alihttp'
import message from '../utils/message'
import DebugLog from '../utils/debuglog'
import { IAliUserDriveCapacity, IAliUserDriveDetails } from './models'
import { GetSignature } from './utils'
import getUuid from 'uuid-by-string'
import Config from "../utils/config";

export const TokenReTimeMap = new Map<string, number>()
export const TokenLockMap = new Map<string, number>()

export const TokenReTimeMapV2 = new Map<string, number>()
export const TokenLockMapV2 = new Map<string, number>()
export const SessionLockMap = new Map<string, number>()
export const SessionReTimeMap = new Map<string, number>()
export default class AliUser {

  static async ApiSessionRefreshAccount(token: ITokenInfo, showMessage: boolean): Promise<boolean> {
    if(!token.user_id) return false
    while (true) {
      const lock = SessionLockMap.has(token.user_id)
      if (lock) await Sleep(1000)
      else break
    }
    SessionLockMap.set(token.user_id, Date.now())
    const time = SessionReTimeMap.get(token.user_id) || 0
    if (Date.now() - time < 1000 * 60 * 5) {
      SessionLockMap.delete(token.user_id)
      return true
    }
    const apiUrl = 'https://api.aliyundrive.com/users/v1/users/device/create_session'
    let { signature, publicKey } = GetSignature(0, token.user_id, token.device_id)
    const postData = {
      'deviceName': 'Edge浏览器',
      'modelName': 'Windows网页版',
      'pubKey': publicKey
    }
    const resp = await AliHttp.Post(apiUrl, postData, token.user_id, '')
    SessionLockMap.delete(token.user_id)
    if (AliHttp.IsSuccess(resp.code)) {
      SessionReTimeMap.set(token.user_id, Date.now())
      token.signature = signature
      UserDAL.SaveUserToken(token)
      return true
    } else {
      DebugLog.mSaveWarning('ApiSessionRefreshAccount err=' + (resp.code || '') + ' ' + (resp.body?.code || ''))
      if (showMessage) {
        message.error('刷新账号[' + token.user_name + '] session 失败')
      }
    }
    return false
  }

  static async ApiTokenRefreshAccountV2(token: ITokenInfo): Promise<IUrlRespData> {
    const postData = {
      refresh_token: token.refresh_token_v2,
      grant_type: 'refresh_token',
      client_secret: '',
      client_id: ''
    }
    return await AliHttp.Post(Config.accessTokenUrl, postData, '', '')
  }

// {
//   "token_type": "Bearer",
//   "access_token": "",
//   "refresh_token": "",
//   "expires_in": 7200
// }
  static async ApiTokenRefreshAccountV2_TMP(token: ITokenInfo): Promise<IUrlRespData> {
    const postData = {
      refresh_token: token.refresh_token_v2,
      grant_type: 'refresh_token'
    }
    return  await AliHttp._Post(Config.tmpUrl, postData, '', '')
  }

  static async ApiRefreshAccessTokenV2(token: ITokenInfo, showMessage: boolean, force: boolean = false): Promise<boolean> {
    if (!token.refresh_token_v2) return false
    if (!force && token.expires_in_v2 &&  token.expires_in_v2 > Date.now()) {
      return true
    }
    if (force) {
      TokenLockMapV2.delete(token.user_id)
      TokenReTimeMapV2.delete(token.user_id)
    }
    while (true) {
      const lock = TokenLockMapV2.has(token.user_id)
      if (lock) await Sleep(1000)
      else break
    }
    TokenLockMapV2.set(token.user_id, Date.now())
    const time = TokenReTimeMapV2.get(token.user_id) || 0
    if (Date.now() - time < 1000 * 60 * 5) {
      TokenLockMapV2.delete(token.user_id)
      return true
    }

    const resp = await this.ApiTokenRefreshAccountV2(token)
    TokenLockMapV2.delete(token.user_id)
    if (AliHttp.IsSuccess(resp.code)) {
      TokenReTimeMapV2.set(token.user_id, Date.now())
      token.tokenfrom = 'account'

      token.refresh_token_v2 = resp.body.refresh_token
      token.access_token_v2 = resp.body.access_token
      token.expires_in_v2 = Date.now() + resp.body.expires_in * 1000
      token.token_type_v2 = resp.body.token_type

      UserDAL.SaveUserToken(token)
      return true
    } else {
      if (resp.body?.code != 'InvalidParameter.RefreshToken') {
        DebugLog.mSaveWarning('ApiTokenRefreshAccountV2 err=' + (resp.code || '') + ' ' + (resp.body?.code || ''))
      }
      if (showMessage) {
        message.error('刷新账号[' + token.user_name + '] v2 token 失败,需要重新登录')
        UserDAL.UserLogOff(token.user_id)
      } else {
        UserDAL.UserClearFromDB(token.user_id)
      }
    }
    return false
  }

  static async ApiRefreshAccessTokenV1(token: ITokenInfo, showMessage: boolean, force: boolean = false): Promise<boolean> {
    if (!token.refresh_token) return false
    if (!force && token.expires_in &&  token.expires_in > Date.now()) {
      return true
    }
    if (force) {
      TokenLockMap.delete(token.user_id)
      TokenReTimeMap.delete(token.user_id)
    }
    while (true) {
      const lock = TokenLockMap.has(token.user_id)
      if (lock) await Sleep(1000)
      else break
    }
    TokenLockMap.set(token.user_id, Date.now())
    const time = TokenReTimeMap.get(token.user_id) || 0
    if (Date.now() - time < 1000 * 60 * 5) {
      TokenLockMap.delete(token.user_id)
      return true
    }

    const url = 'https://auth.aliyundrive.com/v2/account/token'

    const postData = { refresh_token: token.refresh_token, grant_type: 'refresh_token' }
    const resp = await AliHttp.Post(url, postData, '', '')
    TokenLockMap.delete(token.user_id)
    if (AliHttp.IsSuccess(resp.code)) {
      TokenReTimeMap.set(resp.body.user_id, Date.now())
      token.tokenfrom = 'account'
      token.access_token = resp.body.access_token
      token.refresh_token = resp.body.refresh_token
      token.expires_in = Date.now() + resp.body.expires_in * 1000
      token.token_type = resp.body.token_type
      token.user_id = resp.body.user_id
      token.user_name = resp.body.user_name
      token.avatar = resp.body.avatar
      token.nick_name = resp.body.nick_name
      token.default_sbox_drive_id = resp.body.default_sbox_drive_id
      token.role = resp.body.role
      token.status = resp.body.status
      token.expire_time = resp.body.expire_time
      token.state = resp.body.state
      token.pin_setup = resp.body.pin_setup
      token.is_first_login = resp.body.is_first_login
      token.need_rp_verify = resp.body.need_rp_verify
      token.device_id = getUuid(resp.body.user_id.toString(), 5)
      window.WebUserToken({
        user_id: token.user_id,
        name: token.user_name,
        access_token: token.access_token,
        refresh: true
      })
      UserDAL.SaveUserToken(token)
      return true
    } else {
      if (resp.body?.code != 'InvalidParameter.RefreshToken') {
        DebugLog.mSaveWarning('ApiTokenRefreshAccount err=' + (resp.code || '') + ' ' + (resp.body?.code || ''))
      }
      if (showMessage) {
        message.error('刷新账号[' + token.user_name + '] v1 token 失败,需要重新登录')
        UserDAL.UserLogOff(token.user_id)
      } else {
        UserDAL.UserClearFromDB(token.user_id)
      }
    }
    return false
  }


  static async ApiUserInfo(token: ITokenInfo): Promise<boolean> {
    if (!token.user_id || !token.access_token_v2) return false
    const url = 'adrive/v1.0/user/getDriveInfo'
    const spaceUrl = 'adrive/v1.0/user/getSpaceInfo'
    const postData = ''
    const resp = await AliHttp.Post(url, postData, token.user_id, '')
    const spaceResp = await AliHttp.Post(spaceUrl, postData, token.user_id, '')
    if (AliHttp.IsSuccess(spaceResp.code)) {
      token.used_size = spaceResp.body.personal_space_info.used_size
      token.total_size = spaceResp.body.personal_space_info.total_size
      token.spaceinfo = humanSize(token.used_size) + ' / ' + humanSize(token.total_size)
    } else {
      DebugLog.mSaveWarning('getSpaceInfo err=' + (resp.code || ''))
    }
    if (AliHttp.IsSuccess(resp.code)) {
      token.spu_id = ''
      token.phone = resp.body.phone
      token.backup_drive_id = resp.body.backup_drive_id || '';
      token.resource_drive_id = resp.body.resource_drive_id || ''
      if (token.backup_drive_id === '') {
        token.backup_drive_id = resp.body.default_drive_id
      }
      token.is_expires = resp.body.status === 'enabled'
      token.name = resp.body.nick_name===''?resp.body.phone:resp.body.nick_name
      return true
    } else {
      DebugLog.mSaveWarning('ApiUserInfo err=' + (resp.code || ''))
    }
    return false
  }

  static async ApiUserSign(token: ITokenInfo): Promise<number> {
    if (!token.user_id) return -1
    const signUrl = 'https://member.aliyundrive.com/v1/activity/sign_in_list'
    const signResp = await AliHttp.Post(signUrl, {}, token.user_id, '')
    // console.log(JSON.stringify(resp))
    if (AliHttp.IsSuccess(signResp.code)) {
      if (!signResp.body || !signResp.body.result) {
        message.error('签到失败' + signResp.body?.message)
        return -1
      }
      const { signInCount = 0, signInLogs = [] } = signResp.body.result
      const sign_day = new Date().getDate()
      let sign_data: any = {
        calendarDay: sign_day,
        isReward: false,
        reward: { name: '', description: '' }
      }
      for (let signInLog of signInLogs) {
        const calendarDay = signInLog['calendarDay']
        if (calendarDay && parseInt(calendarDay) === sign_day) {
          sign_data = signInLog
          break
        }
      }
      let reward = '无奖励'
      if (!sign_data['isReward']) {
        const rewardUrl = 'https://member.aliyundrive.com/v1/activity/sign_in_reward'
        const rewardResp = await AliHttp.Post(rewardUrl, { signInDay: signInCount }, token.user_id, '')
        if (AliHttp.IsSuccess(rewardResp.code)) {
          if (!rewardResp.body || !rewardResp.body.result || !rewardResp.body.success) {
            message.error('签到后领取奖励失败，请前往手机端领取' + rewardResp.body?.message)
            return -1
          }
          const result = rewardResp.body.result
          reward = `获得【${result['name']}】 - ${result['description']}`
        }
      } else {
        reward = `获得【${sign_data['reward']['name']}】 - ${sign_data['reward']['description']}`
      }
      message.info(`【${token.nick_name || token.user_name}】本月累计签到${signInCount}次，本次签到 ${reward}`)
      return parseInt(sign_data['calendarDay'])
    } else {
      message.error('签到失败' + signResp.body?.message)
    }
    return -1
  }


  static async ApiUserVip(token: ITokenInfo): Promise<boolean> {
    if (!token.user_id) return false
    const url = 'https://openapi.aliyundrive.com/v1.0/user/getVipInfo'
    const postData = {}
    const resp = await AliHttp.Post(url, postData, token.user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {

      token.vipname = resp.body.identity
      token.vipIcon = ''
      if (resp.body.identity === 'member') {
        token.vipexpire = ''
      } else {
          token.viplevel =  resp.body.level
          token.vipexpire = humanDateTime(resp.body.expire)
      }
      return true
    } else {
      DebugLog.mSaveWarning('ApiUserPic err=' + (resp.code || ''))
    }
    return false
  }

  // static async ApiUserVip(token: ITokenInfo): Promise<boolean> {
  //   if (!token.user_id) return false
  //   const url = 'business/v1.0/users/vip/info'
  //
  //
  //   const postData = {}
  //   const resp = await AliHttp.Post(url, postData, token.user_id, '')
  //   if (AliHttp.IsSuccess(resp.code)) {
  //     let vipList = resp.body.vipList || []
  //     vipList = vipList.sort((a: any, b: any) => b.expire - a.expire)
  //     if (vipList.length > 0 && new Date(vipList[0].expire * 1000) > new Date()) {
  //       token.vipname = vipList[0].name
  //       token.vipIcon = resp.body.mediumIcon
  //       token.vipexpire = humanDateTime(vipList[0].expire)
  //     } else {
  //       token.vipname = '免费用户'
  //       token.vipIcon = ''
  //       token.vipexpire = ''
  //     }
  //     return true
  //   } else {
  //     DebugLog.mSaveWarning('ApiUserPic err=' + (resp.code || ''))
  //   }
  //   return false
  // }


  static async ApiUserPic(token: ITokenInfo): Promise<boolean> {
    if (!token.user_id) return false
    const url = 'adrive/v1/user/albums_info'
    const postData = {}
    const resp = await AliHttp.Post(url, postData, token.user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      token.pic_drive_id = resp.body.data.driveId
      return true
    } else {
      DebugLog.mSaveWarning('ApiUserPic err=' + (resp.code || ''))
    }
    return false
  }


  static async ApiUserDriveDetails(user_id: string): Promise<IAliUserDriveDetails> {
    const detail: IAliUserDriveDetails = {
      album_drive_used_size: 0,
      backup_drive_used_size: 0,
      default_drive_used_size: 0,
      drive_total_size: 0,
      drive_used_size: 0,
      note_drive_used_size: 0,
      resource_drive_used_size: 0,
      sbox_drive_used_size: 0,
      share_album_drive_used_size: 0
    }
    if (!user_id) return detail
    const url = 'adrive/v1/user/driveCapacityDetails'
    const postData = '{}'
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      detail.album_drive_used_size = resp.body.album_drive_used_size || 0
      detail.backup_drive_used_size = resp.body.backup_drive_used_size || 0
      detail.default_drive_used_size = resp.body.default_drive_used_size || 0
      detail.drive_total_size = resp.body.drive_total_size || 0
      detail.drive_used_size = resp.body.drive_used_size || 0
      detail.note_drive_used_size = resp.body.note_drive_used_size || 0
      detail.resource_drive_used_size = resp.body.resource_drive_used_size || 0
      detail.sbox_drive_used_size = resp.body.sbox_drive_used_size || 0
      detail.share_album_drive_used_size = resp.body.share_album_drive_used_size || 0
    } else {
      DebugLog.mSaveWarning('ApiUserDriveDetails err=' + (resp.code || ''))
    }
    return detail
  }

  static async ApiUserDriveFileCount(user_id: string, category: string, type: string): Promise<number> {
    if (!user_id) return 0
    const token = await UserDAL.GetUserTokenFromDB(user_id)
    if (!token) return 0
    const url = 'adrive/v1.0/openFile/search'
    const postData = {
      drive_id: token?.backup_drive_id,
      marker: '',
      limit: 1,
      all: false,
      url_expire_sec: 14400,
      fields: 'thumbnail',
      query: type ? 'type="' + type + '"' : 'category="' + category + '"',
      return_total_count: true
    }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        return resp.body.total_count || 0
      } else {
        DebugLog.mSaveWarning('ApiUserDriveFileCount err=' + category + ' ' + (resp.code || ''))
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('ApiUserDriveFileCount' + category, err)
    }
    return 0
  }


  static async ApiUserCapacityDetails(user_id: string): Promise<IAliUserDriveCapacity[]> {
    let result: IAliUserDriveCapacity[] = []
    if (!user_id) return result
    const url = 'adrive/v1/user/capacityDetails'
    const postData = '{}'
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const list = resp.body.capacity_details || []
      const today = new Date()
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        const item = list[i]
        let expiredstr = ''

        if (item.expired == 'permanent_condition') expiredstr = '永久有效，每年激活'
        else if (item.expired == 'permanent') expiredstr = '永久有效'
        else {
          const data = new Date(item.expired)

          if (data > today) expiredstr = humanDateTimeDateStr(item.expired) + ' 到期'
          else expiredstr = '已过期'
        }

        result.push({
          type: item.type,
          size: item.size,
          sizeStr: humanSize(item.size),
          expired: item.expired,
          expiredstr: expiredstr,
          description: item.description,
          latest_receive_time: humanDateTimeDateStr(item.latest_receive_time)
        } as IAliUserDriveCapacity)
      }
      result = result.sort((a, b) => a.latest_receive_time.localeCompare(b.latest_receive_time))
    } else {
      DebugLog.mSaveWarning('ApiUserCapacityDetails err=' + (resp.code || ''))
    }
    return result
  }
}

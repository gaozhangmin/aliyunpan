import DB from '../utils/db'
import AliUser from '../aliapi/user'
import message from '../utils/message'
import useUserStore, { ITokenInfo } from './userstore'
import {
  useAppStore,
  useFootStore,
  useMyFollowingStore,
  useMyShareStore,
  useOtherFollowingStore,
  usePanFileStore,
  usePanTreeStore,
  useSettingStore
} from '../store'
import PanDAL from '../pan/pandal'
import DebugLog from '../utils/debuglog'
import { refreshCloud123AccessToken } from '../utils/cloud123'
import { build115UserId, refresh115AccessToken } from '../utils/drive115'
import { refreshBaiduAccessToken } from '../utils/baidu'
import { isBaiduUser, isCloud123User, isDrive115User } from '../aliapi/utils'

export const UserTokenMap = new Map<string, ITokenInfo>()

export default class UserDAL {
  private static async ensureTokenReady(token: ITokenInfo): Promise<ITokenInfo | null> {
    try {
      if (isCloud123User(token)) {
        const expireTime = new Date(token.expire_time || 0).getTime()
        if (!token.access_token || (expireTime && expireTime <= Date.now())) {
          const refreshed = await refreshCloud123AccessToken(token.refresh_token)
          if (!refreshed) return null
          refreshed.user_id = token.user_id || refreshed.user_id
          refreshed.user_name = refreshed.user_name || token.user_name
          refreshed.nick_name = refreshed.nick_name || token.nick_name
          refreshed.avatar = refreshed.avatar || token.avatar
          refreshed.tokenfrom = 'cloud123'
          this.SaveUserToken(refreshed)
          return refreshed
        }
        return token
      }
      if (isBaiduUser(token)) {
        const expireTime = new Date(token.expire_time || 0).getTime()
        if (!token.access_token || (expireTime && expireTime <= Date.now())) {
          const refreshed = await refreshBaiduAccessToken(token.refresh_token)
          if (!refreshed) return null
          refreshed.user_id = token.user_id || refreshed.user_id
          refreshed.user_name = refreshed.user_name || token.user_name
          refreshed.nick_name = refreshed.nick_name || token.nick_name
          refreshed.avatar = refreshed.avatar || token.avatar
          refreshed.tokenfrom = 'baidu'
          this.SaveUserToken(refreshed)
          return refreshed
        }
        return token
      }
      if (isDrive115User(token)) {
        if (!token.user_id) {
          const nextId = build115UserId(token.refresh_token, token.access_token)
          if (nextId) token.user_id = nextId
        }
        const expireTime = new Date(token.expire_time || 0).getTime()
        if (!token.access_token || (expireTime && expireTime <= Date.now())) {
          const refreshed = await refresh115AccessToken(token.refresh_token)
          if (!refreshed?.access_token) return null
          token.access_token = refreshed.access_token
          if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
          if (typeof refreshed.expires_in === 'number') token.expires_in = refreshed.expires_in
          token.token_type = refreshed.token_type || token.token_type
          token.expire_time = new Date(Date.now() + (token.expires_in || 0) * 1000).toISOString()
          this.SaveUserToken(token)
        }
        return token.user_id ? token : null
      }
      const ok = !!(token.user_id && (await AliUser.ApiTokenRefreshAccount(token, false)))
      return ok ? token : null
    } catch (err: any) {
      DebugLog.mSaveDanger('ensureTokenReady', err)
      return null
    }
  }

  static async aLoadFromDB() {
    const tokenList = await DB.getUserAll()
    const defaultUser = await DB.getValueString('uiDefaultUser')
    let defaultUserAdd = false
    let hasLogin = false
    UserTokenMap.clear()
    try {
      for (const token of tokenList) {
        const prepared = await this.ensureTokenReady(token)
        if (!prepared?.user_id) continue
        const shouldLogin = (prepared.user_id && prepared.user_id === defaultUser) || (!defaultUser && !hasLogin)
        if (shouldLogin) {
          await this.UserLogin(prepared).catch()
          hasLogin = true
          if (!defaultUser || prepared.user_id === defaultUser) defaultUserAdd = true
        } else {
          await this.UserAutoSign(prepared)
        }
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('aLoadFromDB loadUser', err)
    }
    console.log('defaultUserAdd', defaultUserAdd)
    if (!defaultUserAdd && !hasLogin) {
      useUserStore().userShowLogin = true
    }
  }


  static async aRefreshAllUserToken() {
    const tokenList = await DB.getUserAll()
    const dateNow = new Date().getTime()
    for (let i = 0, maxi = tokenList.length; i < maxi; i++) {
      const token = tokenList[i]
      try {
        if (isCloud123User(token)) {
          const expireTime = new Date(token.expire_time || 0).getTime()
          if (expireTime && expireTime - dateNow <= 1000 * 60 * 5) {
            const refreshed = await refreshCloud123AccessToken(token.refresh_token)
            if (refreshed) {
              refreshed.user_id = token.user_id
              UserTokenMap.set(refreshed.user_id, refreshed)
              await DB.saveUser(refreshed)
            }
          }
          continue
        }
        if (isBaiduUser(token)) {
          const expireTime = new Date(token.expire_time || 0).getTime()
          if (expireTime && expireTime - dateNow <= 1000 * 60 * 5) {
            const refreshed = await refreshBaiduAccessToken(token.refresh_token)
            if (refreshed) {
              refreshed.user_id = token.user_id
              UserTokenMap.set(refreshed.user_id, refreshed)
              await DB.saveUser(refreshed)
            }
          }
          continue
        }
        const expire_time = new Date(token.expire_time).getTime()
        const session_expire_time = new Date(token.session_expires_in).getTime()
        // 自动刷新Token(过期前5分钟)
        if (expire_time - dateNow <= 1000 * 60 * 5) {
          await AliUser.ApiTokenRefreshAccount(token, false, true)
          await AliUser.OpenApiTokenRefreshAccount(token, false, true)
        }
        if (session_expire_time - dateNow <= 1000 * 60) {
          await AliUser.ApiSessionRefreshAccount(token, false, true)
        }
      } catch (err: any) {
        DebugLog.mSaveDanger('aRefreshAllUserToken', err)
      }
    }
  }

  static GetUserToken(user_id: string): ITokenInfo {
    if (user_id && UserTokenMap.has(user_id)) return UserTokenMap.get(user_id)!

    return {
      tokenfrom: 'unknown',
      access_token: '',
      refresh_token: '',

      session_expires_in: 0,
      open_api_token_type: '',
      open_api_access_token: '',
      open_api_refresh_token: '',
      open_api_expires_in: 0,

      expires_in: 0,
      token_type: '',
      user_id: '',
      user_name: '',
      avatar: '',
      nick_name: '',
      default_drive_id: '',
      default_sbox_drive_id: '',
      resource_drive_id: '',
      backup_drive_id: '',
      sbox_drive_id: '',
      role: '',
      status: '',
      expire_time: '',
      state: '',
      pin_setup: false,
      is_first_login: false,
      need_rp_verify: false,
      name: '',
      spu_id: '',
      is_expires: false,
      used_size: 0,
      total_size: 0,
      free_size: 0,
      space_expire: false,
      spaceinfo: '',
      vipname: '',
      vipexpire: '',
      vipIcon: '',
      pic_drive_id: '',
      device_id: '',
      signature: '',
      signInfo: {
        signMon: -1,
        signDay: -1
      }
    }
  }

  static async GetUserTokenFromDB(user_id: string) {
    if (!user_id) return undefined
    if (UserTokenMap.has(user_id)) return UserTokenMap.get(user_id)
    const user = await DB.getUser(user_id)
    if (user) UserTokenMap.set(user.user_id, user)
    return user
  }


  static async ClearUserTokenMap() {
    UserTokenMap.clear()
  }

  static GetUserList() {
    const list: ITokenInfo[] = []
    // eslint-disable-next-line no-unused-vars
    for (const [_, token] of UserTokenMap) {
      list.push(token)
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }

  static async GetUserListFromDB(): Promise<ITokenInfo[]> {
    const list = await DB.getUserAll()
    for (const token of list) {
      if (token.user_id && !UserTokenMap.has(token.user_id)) {
        UserTokenMap.set(token.user_id, token)
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }


  static SaveUserToken(token: ITokenInfo) {
    if (token.user_id) {
      UserTokenMap.set(token.user_id, token)
      DB.saveUser(token)
        .then(() => {
          window.WinMsgToUpload({ cmd: 'ClearUserToken' })
          window.WinMsgToDownload({ cmd: 'ClearUserToken' })
        })
        .catch(() => {
        })
    }
  }


  static async UserLogin(token: ITokenInfo) {
    const loadingKey = 'userlogin_' + Date.now().toString()
    message.loading('加载用户信息中...', 0, loadingKey)
    const initialUserId = token.user_id
    if (initialUserId) {
      await DB.saveValueString('uiDefaultUser', initialUserId)
      useUserStore().userLogin(initialUserId)
      UserTokenMap.set(initialUserId, token)
    }
    if (isCloud123User(token)) {
      // 非阿里云盘仅刷新 OpenApi Token（123 走自己的刷新逻辑）
      await AliUser.OpenApiTokenRefreshAccount(token, false)
      await AliUser.Drive123UserInfo(token)
    } else if (isBaiduUser(token)) {
      await AliUser.DriveBaiduUserInfo(token)
    } else if (isDrive115User(token)) {
      await AliUser.Drive115UserInfo(token)
    } else {
      // 加载用户信息
      await Promise.all([
        AliUser.ApiUserInfo(token),
        AliUser.ApiUserDriveInfo(token),
        AliUser.ApiUserPic(token),
        AliUser.ApiUserVip(token),
        // 刷新Session
        AliUser.ApiSessionRefreshAccount(token, false),
        // 刷新OpenApiToken
        AliUser.OpenApiTokenRefreshAccount(token, false),
        // 登陆后自动签到
        UserDAL.UserAutoSign(token)
      ])
    }
    if (token.user_id && token.user_id !== initialUserId) {
      if (initialUserId) {
        UserTokenMap.delete(initialUserId)
        await DB.deleteUser(initialUserId)
      }
      await DB.saveValueString('uiDefaultUser', token.user_id)
      useUserStore().userLogin(token.user_id)
    } else if (token.user_id) {
      useUserStore().userLogin(token.user_id)
    }
    UserDAL.SaveUserToken(token)
    window.WebUserToken({
      user_id: token.user_id,
      name: token.user_name,
      access_token: token.access_token,
      open_api_access_token: token.open_api_access_token,
      login: true
    })
    // 加载网盘文件
    await UserDAL.LoadPanData(token)
    // 刷新所有状态
    PanDAL.aReLoadQuickFile(token.user_id)
    useAppStore().resetTab()
    useMyShareStore().$reset()
    useMyFollowingStore().$reset()
    useOtherFollowingStore().$reset()
    useFootStore().mSaveUserInfo(token)
    message.success('加载用户成功!', 2, loadingKey)
  }

  static async LoadPanData(token: ITokenInfo) {
    console.warn('LoadPanData....')
    if (isCloud123User(token)) {
      await PanDAL.aReLoadCloudDrive(token)
      await PanDAL.aReLoadOneDirToShow(token.default_drive_id || 'cloud123', 'cloud_root', true)
      return
    }
    if (isBaiduUser(token)) {
      await PanDAL.aReLoadBaiduDrive(token)
      await PanDAL.aReLoadOneDirToShow(token.default_drive_id || 'baidu', 'baidu_root', true)
      return
    }
    if (isDrive115User(token)) {
      await PanDAL.aReLoadDrive115(token)
      await PanDAL.aReLoadOneDirToShow(token.default_drive_id || 'drive115', 'drive115_root', true)
      return
    }
    // 刷新网盘数据
    if (!useSettingStore().securityHideResourceDrive) {
      await PanDAL.aReLoadResourceDrive(token)
    }
    if (!useSettingStore().securityHideBackupDrive) {
      await PanDAL.aReLoadBackupDrive(token)
    }
    if (useSettingStore().uiShowPanRootFirst === 'resource') {
      await PanDAL.aReLoadOneDirToShow(token.resource_drive_id, 'resource_root', true)
    } else if (useSettingStore().uiShowPanRootFirst === 'backup')  {
      await PanDAL.aReLoadOneDirToShow(token.backup_drive_id, 'backup_root', true)
    } else {
      await PanDAL.aReLoadOneDirToShow(token.resource_drive_id, 'resource_root', true)
      await PanDAL.aReLoadOneDirToShow(token.backup_drive_id, 'backup_root', true)
    }
  }

  static async UserLogOff(user_id: string): Promise<boolean> {
    await DB.deleteUser(user_id)
    UserTokenMap.delete(user_id)

    let newUserID = ''
    for (const [user_id, token] of UserTokenMap) {
      const isLogin = (isDrive115User(token) || isBaiduUser(token))
        ? !!token.user_id
        : (token.user_id && (await AliUser.ApiTokenRefreshAccount(token, false)))
      if (isLogin) {
        await this.UserLogin(token)
        newUserID = user_id
        break
      }
    }
    if (!newUserID) {
      useUserStore().userLogOff()
      usePanTreeStore().$reset()
      usePanFileStore().$reset()
      useUserStore().userShowLogin = true
    }
    return newUserID != ''
  }

  static async UserClearFromDB(user_id: string): Promise<void> {
    DB.deleteUser(user_id)
    UserTokenMap.delete(user_id)
  }


  static async UserChange(user_id: string): Promise<boolean> {
    if (!UserTokenMap.has(user_id)) return false
    const token = UserTokenMap.get(user_id)!
    // 切换账号
    let isLogin = false
    if (isDrive115User(token)) {
      const expireTime = new Date(token.expire_time || 0).getTime()
      if (!token.access_token || (expireTime && expireTime <= Date.now())) {
        const refreshed = await refresh115AccessToken(token.refresh_token)
        if (refreshed?.access_token) {
          token.access_token = refreshed.access_token
          if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
          if (typeof refreshed.expires_in === 'number') token.expires_in = refreshed.expires_in
          token.token_type = refreshed.token_type || token.token_type
          token.expire_time = new Date(Date.now() + (token.expires_in || 0) * 1000).toISOString()
          UserDAL.SaveUserToken(token)
        }
      }
      isLogin = !!token.access_token && !!token.user_id
    } else if (isBaiduUser(token)) {
      const expireTime = new Date(token.expire_time || 0).getTime()
      if (!token.access_token || (expireTime && expireTime <= Date.now())) {
        const refreshed = await refreshBaiduAccessToken(token.refresh_token)
        if (refreshed?.access_token) {
          token.access_token = refreshed.access_token
          if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
          if (typeof refreshed.expires_in === 'number') token.expires_in = refreshed.expires_in
          token.token_type = refreshed.token_type || token.token_type
          token.expire_time = new Date(Date.now() + (token.expires_in || 0) * 1000).toISOString()
          UserDAL.SaveUserToken(token)
        }
      }
      isLogin = !!token.access_token && !!token.user_id
    } else {
      isLogin = !!(token.user_id && (await AliUser.ApiTokenRefreshAccount(token, false)))
    }
    if (!isLogin) {
      message.warning('该账号需要重新登陆[' + token.name + ']')
      return false
    }
    await this.UserLogin(token).catch()
    return true
  }


  static async UserRefreshByUserFace(user_id: string, force: boolean): Promise<boolean> {
    const token = UserDAL.GetUserToken(user_id)
    if (!token || !token.access_token) {
      return false
    }
    let expires_in = new Date(token.expire_time).getTime() - token.expires_in * 1000
    let time = Date.now() - expires_in
    if (!force || time / 1000 < 600) {
      if (isCloud123User(token)) {
        await AliUser.Drive123UserInfo(token)
        return true
      } else if (isBaiduUser(token)) {
        await AliUser.DriveBaiduUserInfo(token)
        return true
      } else if (isDrive115User(token)) {
        await AliUser.Drive115UserInfo(token)
        return true
      } else {
        // 仅刷新个人信息
        await Promise.all([
          AliUser.ApiUserInfo(token),
          AliUser.ApiUserPic(token),
          AliUser.ApiUserVip(token)
        ])
        UserDAL.SaveUserToken(token)
        return true
      }

    } else {
      // 刷新token和session
      if (token.user_id) {
        if (isCloud123User(token)) {
          const isToken = await AliUser.OpenApiTokenRefreshAccount(token, true)
          if (!isToken) return false
        } else if (isBaiduUser(token)) {
          const refreshed = await refreshBaiduAccessToken(token.refresh_token)
          if (!refreshed?.access_token) return false
          token.access_token = refreshed.access_token
          if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
          if (typeof refreshed.expires_in === 'number') token.expires_in = refreshed.expires_in
          token.token_type = refreshed.token_type || token.token_type
          token.expire_time = new Date(Date.now() + (token.expires_in || 0) * 1000).toISOString()
          UserDAL.SaveUserToken(token)
        } else if (isDrive115User(token)) {
          const refreshed = await refresh115AccessToken(token.refresh_token)
          if (refreshed?.error || !refreshed?.access_token) return false
          token.access_token = refreshed.access_token
          if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
          if (typeof refreshed.expires_in === 'number') token.expires_in = refreshed.expires_in
          token.token_type = refreshed.token_type || token.token_type
          token.expire_time = new Date(Date.now() + (token.expires_in || 0) * 1000).toISOString()
          UserDAL.SaveUserToken(token)
        } else {
          const isToken = await AliUser.ApiTokenRefreshAccount(token, true)
          if (!isToken) return false
          await AliUser.ApiSessionRefreshAccount(token, true)
          await AliUser.OpenApiTokenRefreshAccount(token, true)
        }

      } else {
        return false
      }
      if (isCloud123User(token)) {
        await AliUser.Drive123UserInfo(token)
      } else if (isBaiduUser(token)) {
        await AliUser.DriveBaiduUserInfo(token)
      } else if (isDrive115User(token)) {
        await AliUser.Drive115UserInfo(token)
      } else {
        // 刷新用户信息
        await Promise.all([
          AliUser.ApiUserInfo(token),
          AliUser.ApiUserPic(token),
          AliUser.ApiUserVip(token)
        ])
      }
      useUserStore().userLogin(token.user_id)
      UserDAL.SaveUserToken(token)
      return true
    }
  }

  static async UserAutoSign(token: ITokenInfo) {
    // 自动签到
    if (isDrive115User(token) || isCloud123User(token) || isBaiduUser(token)) {
      UserDAL.SaveUserToken(token)
      return
    }
    if (token.user_id && useSettingStore().uiLaunchAutoSign) {
      const nowMonth = new Date().getMonth() + 1
      const nowDay = new Date().getDate()
      if (!token.signInfo) token.signInfo = { signMon: -1, signDay: -1 }
      const signInfo = token.signInfo
      if (signInfo.signMon !== nowMonth || signInfo.signDay !== nowDay) {
        const signDay = await AliUser.ApiUserSign(token)
        if (signDay) {
          signInfo.signMon = nowMonth
          signInfo.signDay = signDay
        }
      }
    }
    UserDAL.SaveUserToken(token)
  }
}

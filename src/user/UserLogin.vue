<script setup lang='ts'>
import { h, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { ITokenInfo, useSettingStore, useUserStore } from '../store'
import UserDAL from '../user/userdal'
import Config from '../config'
import message from '../utils/message'
import DebugLog from '../utils/debuglog'
import { GetSignature } from '../aliapi/utils'
import getUuid from 'uuid-by-string'
import AliUser from '../aliapi/user'
import { Input, Modal, Space } from '@arco-design/web-vue'
import { buildCloud123AuthUrl, exchangeCloud123CodeForToken } from '../utils/cloud123'
import { buildBaiduAuthUrl, exchangeBaiduCodeForToken } from '../utils/baidu'
import { buildQrImageUrl, DRIVE115_APP_ID, exchangeDeviceCode, generatePkce, normalize115Token, pollDeviceStatus, requestDeviceCode } from '../utils/drive115'
import appConfig from '../utils/appconfig'

const useUser = useUserStore()
const settingStore = useSettingStore()
const loginCur = ref(1)
const loginToken = ref<ITokenInfo>()
const loginStatus = ref<'wait' | 'error' | 'finish' | 'process'>('process')
const loginLoading = ref(true)
const { appId: defaultAppId, appSecret: defaultAppSecret } = appConfig.getAliyunConfig()
const client_id = ref(defaultAppId || '')
const client_secret = ref(defaultAppSecret || '')

const intervalId = ref()
const qrCodeUrl = ref('')
const qrCodeStatusType = ref()
const qrCodeStatusTips = ref()

const loginProvider = ref<'aliyun' | 'cloud123' | '115' | 'baidu'>('aliyun')
const cloud123Code = ref('')
const cloud123Loading = ref(false)
const baiduCode = ref('')
const baiduLoading = ref(false)
const drive115ClientId = ref(localStorage.getItem('drive115_client_id') || DRIVE115_APP_ID || '')
const drive115Verifier = ref('')
const drive115Uid = ref('')
const drive115Time = ref('')
const drive115Sign = ref('')
const drive115Tips = ref('请使用 115 App 扫码')
const drive115Loading = ref(false)
const drive115Polling = ref(false)
let drive115Timer: any = null
let loginOpenTimer: any = null
let cloud123OpenTimer: any = null
let baiduOpenTimer: any = null

const clearOpenTimers = () => {
  if (loginOpenTimer) {
    clearTimeout(loginOpenTimer)
    loginOpenTimer = null
  }
  if (cloud123OpenTimer) {
    clearTimeout(cloud123OpenTimer)
    cloud123OpenTimer = null
  }
  if (baiduOpenTimer) {
    clearTimeout(baiduOpenTimer)
    baiduOpenTimer = null
  }
}

const handleModalOpen = () => {
  const stored = localStorage.getItem('login_provider')
  if (stored === 'cloud123' || stored === 'aliyun' || stored === '115' || stored === 'baidu') {
    loginProvider.value = stored
  }
  if (loginProvider.value === 'cloud123') {
    handleOpenCloud123()
  } else if (loginProvider.value === 'baidu') {
    handleOpenBaidu()
  } else if (loginProvider.value === '115') {
    handleOpen115()
  } else {
    handleOpen()
  }
}

const handleOauthCallback = (event: any) => {
  if (loginProvider.value !== 'cloud123' && loginProvider.value !== 'baidu') return
  const url = event?.detail || ''
  if (!url) return
  try {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code') || ''
    if (code) {
      if (loginProvider.value === 'cloud123') {
        cloud123Code.value = code
        submitCloud123Code()
      } else if (loginProvider.value === 'baidu') {
        baiduCode.value = code
        submitBaiduCode()
      }
    }
  } catch {
    // ignore parse errors
  }
}

onMounted(() => {
  window.addEventListener('cloud123-oauth-callback', handleOauthCallback as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('cloud123-oauth-callback', handleOauthCallback as EventListener)
})

watch(loginProvider, () => {
  if (!useUser.userShowLogin) return
  clearOpenTimers()
  if (loginProvider.value === 'cloud123') {
    handleOpenCloud123()
  } else if (loginProvider.value === 'baidu') {
    handleOpenBaidu()
  } else if (loginProvider.value === '115') {
    handleOpen115()
  } else {
    handleOpen()
  }
})


const cb = (val: any) => {
  settingStore.updateStore(val)
}

function b64decode(e: string) {
  const t = atob(e)
  let r = t.length
  const n = new Uint8Array(r)
  while (r--) n[r] = t.charCodeAt(r)
  return new Blob([n])
}

function readData(e: string) {
  return new Promise<string>(function(resolve, reject) {
    const n = b64decode(e)
    const i = new FileReader()
    i.onloadend = function(e) {
      resolve((e?.target?.result as string | undefined) || '')
    }
    i.onerror = function(e) {
      return reject(e)
    }
    i.readAsText(n, 'gbk')
  })
}

const refreshStepTips = (status: 'error' | 'finish' | 'process', index: number) => {
  loginStatus.value = status
  loginLoading.value = index !== loginCur.value
  loginCur.value = index
}

const refreshQrCodeStatus = (codeUrl: string = '', type: string = 'info', tips: string = '请用阿里云盘 App 扫码') => {
  qrCodeUrl.value = codeUrl
  qrCodeStatusType.value = type
  qrCodeStatusTips.value = tips
}

const handleOpen = () => {
  clearOpenTimers()
  loginOpenTimer = setTimeout(() => {
    if (loginProvider.value !== 'aliyun' || !useUser.userShowLogin) return
    const webview = document.getElementById('loginiframe') as any
    if (!webview) {
      message.error('严重错误：无法打开登录弹窗，请退出小白羊后重新运行')
      return
    }
    webview.openDevTools({ mode: 'bottom', activate: false })
    webview.loadURL(Config.loginUrl, { httpReferrer: Config.referer })
    webview.addEventListener('did-finish-load', () => {
      loginLoading.value = false
    })
    webview.addEventListener('did-fail-load', () => {
      loginLoading.value = false
    })
    webview.addEventListener('console-message', (e: any) => {
      const msg = e.message || ''
      loginLoading.value = false
      if (msg.indexOf('bizExt') > 0) {
        loginStepFirst(msg)
        webview.stop()
      }
    })
  }, 1000)
}

const handleClose = () => {
  loginLoading.value = true
  const { appId: defaultAppId, appSecret: defaultAppSecret } = appConfig.getAliyunConfig()
  client_id.value = defaultAppId
  client_secret.value = defaultAppSecret
  clearInterval(intervalId.value)
  clearOpenTimers()
  if (drive115Timer) {
    clearTimeout(drive115Timer)
    drive115Timer = null
  }
  refreshStepTips('process', 1)
  refreshQrCodeStatus()
  cloud123Code.value = ''
  cloud123Loading.value = false
  baiduCode.value = ''
  baiduLoading.value = false
  drive115Verifier.value = ''
  drive115Uid.value = ''
  drive115Time.value = ''
  drive115Sign.value = ''
  drive115Tips.value = '请使用 115 App 扫码'
  drive115Loading.value = false
  drive115Polling.value = false
}

const handleOpenCloud123 = () => {
  loginLoading.value = true
  clearOpenTimers()
  cloud123OpenTimer = setTimeout(() => {
    if (loginProvider.value !== 'cloud123' || !useUser.userShowLogin) return
    const webview = document.getElementById('loginiframe123') as any
    if (!webview) {
      message.error('无法打开登录弹窗')
      return
    }
    const authUrl = buildCloud123AuthUrl()
    webview.loadURL(authUrl)
    webview.addEventListener('did-finish-load', () => {
      loginLoading.value = false
    })
    webview.addEventListener('did-fail-load', () => {
      loginLoading.value = false
    })
    const handleNav = (event: any) => {
      const url = event?.url || ''
      if (!url.includes('xbyboxplayer-oauth://callback')) return
      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code') || ''
        if (code) {
          cloud123Code.value = code
          submitCloud123Code()
        }
      } catch {
        // ignore parse errors
      }
    }
    webview.addEventListener('did-navigate', handleNav)
    webview.addEventListener('will-redirect', handleNav)
  }, 300)
}

const handleOpenBaidu = () => {
  loginLoading.value = true
  clearOpenTimers()
  baiduOpenTimer = setTimeout(() => {
    if (loginProvider.value !== 'baidu' || !useUser.userShowLogin) return
    const webview = document.getElementById('loginiframebaidu') as any
    if (!webview) {
      message.error('无法打开登录弹窗')
      return
    }
    const authUrl = buildBaiduAuthUrl()
    webview.loadURL(authUrl)
    webview.addEventListener('did-finish-load', () => {
      loginLoading.value = false
    })
    webview.addEventListener('did-fail-load', () => {
      loginLoading.value = false
    })
    const handleNav = (event: any) => {
      const url = event?.url || ''
      if (!url.includes('xbyboxplayer-oauth://callback')) return
      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code') || ''
        if (code) {
          baiduCode.value = code
          submitBaiduCode()
        }
      } catch {
        // ignore parse errors
      }
    }
    webview.addEventListener('did-navigate', handleNav)
    webview.addEventListener('will-redirect', handleNav)
  }, 300)
}

const submitCloud123Code = async () => {
  if (cloud123Loading.value) return
  if (!cloud123Code.value.trim()) {
    message.error('未获取到授权 code')
    return
  }
  cloud123Loading.value = true
  try {
    const token = await exchangeCloud123CodeForToken(cloud123Code.value.trim())
    if (token) {
      await UserDAL.UserLogin(token)
      useUserStore().userShowLogin = false
    }
  } catch (error) {
    console.error('123网盘登录失败:', error)
    message.error('123网盘登录失败')
  } finally {
    cloud123Loading.value = false
  }
}

const submitBaiduCode = async () => {
  if (baiduLoading.value) return
  if (!baiduCode.value.trim()) {
    message.error('未获取到授权 code')
    return
  }
  baiduLoading.value = true
  try {
    const token = await exchangeBaiduCodeForToken(baiduCode.value.trim())
    if (token) {
      await UserDAL.UserLogin(token)
      useUserStore().userShowLogin = false
    }
  } catch (error) {
    console.error('百度网盘登录失败:', error)
    message.error('百度网盘登录失败')
  } finally {
    baiduLoading.value = false
  }
}

const handleOpen115 = async () => {
  if (!drive115ClientId.value.trim() && !DRIVE115_APP_ID) {
    loginLoading.value = false
    drive115Tips.value = '请先填写 App ID'
    return
  }
  loginLoading.value = true
  drive115Loading.value = true
  try {
    const { codeVerifier, codeChallenge } = await generatePkce()
    drive115Verifier.value = codeVerifier
    const resp = await requestDeviceCode(drive115ClientId.value.trim(), codeChallenge, 'sha256')
    if (resp.error) {
      drive115Tips.value = resp.error
      loginLoading.value = false
      drive115Loading.value = false
      return
    }
    drive115Uid.value = resp.uid || ''
    drive115Time.value = resp.time || ''
    drive115Sign.value = resp.sign || ''
    qrCodeUrl.value = buildQrImageUrl(resp.qrcode || '')
    qrCodeStatusType.value = 'info'
    drive115Tips.value = '请使用 115 App 扫码'
    loginLoading.value = false
    drive115Loading.value = false
    drive115Polling.value = true
    poll115Status()
  } catch (err: any) {
    drive115Tips.value = err?.message || '获取二维码失败'
    loginLoading.value = false
    drive115Loading.value = false
  }
}

const poll115Status = async () => {
  if (!drive115Polling.value) return
  if (!drive115Uid.value || !drive115Time.value || !drive115Sign.value) return
  try {
    const status = await pollDeviceStatus(drive115Uid.value, drive115Time.value, drive115Sign.value)
    if (status.error) {
      drive115Tips.value = status.error
    } else if (status.state === 0) {
      drive115Tips.value = '二维码已失效，请刷新'
      drive115Polling.value = false
      return
    } else if (status.status === 1) {
      drive115Tips.value = status.msg || '扫码成功，等待确认'
    } else if (status.status === 2) {
      drive115Tips.value = status.msg || '授权成功，正在登录'
      drive115Polling.value = false
      const tokenResp = await exchangeDeviceCode(drive115Uid.value, drive115Verifier.value)
      if (tokenResp.error) {
        drive115Tips.value = tokenResp.error
        return
      }
      const token = normalize115Token(tokenResp.data)
      if (!token) {
        drive115Tips.value = '登录失败'
        return
      }
      await AliUser.Drive115UserInfo(token)
      await UserDAL.UserLogin(token)
      useUserStore().userShowLogin = false
      return
    }
  } catch (err: any) {
    drive115Tips.value = err?.message || '获取扫码状态失败'
  }
  drive115Timer = setTimeout(poll115Status, 1500)
}

const handleRefresh115Qr = () => {
  if (drive115Loading.value) return
  handleOpen115()
}

const handleStorageChange = (val: any) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('drive115_client_id', String(val || ''))
  }
}

const loginStepFirst = async (msg: string) => {
  let data = { bizExt: '' }
  try {
    data = JSON.parse(msg)
  } catch {
  }
  if (!data.bizExt) {
    refreshStepTips('error', 1)
    DebugLog.mSaveDanger('登录失败：' + msg)
    return
  }
  readData(data.bizExt).then((jsonstr: string) => {
    try {
      const result = JSON.parse(jsonstr).pds_login_result
      const deviceId = getUuid(result.userId.toString(), 5)
      const { signature } = GetSignature(0, result.userId.toString(), deviceId)
      const token: ITokenInfo = {
        tokenfrom: 'aliyun',
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        session_expires_in: 0,
        open_api_token_type: '',
        open_api_access_token: '',
        open_api_refresh_token: '',
        open_api_expires_in: 0,
        expires_in: result.expiresIn,
        token_type: result.tokenType,
        user_id: result.userId,
        user_name: result.userName,
        avatar: result.avatar,
        nick_name: result.nickName,
        default_drive_id: '',
        default_sbox_drive_id: result.defaultSboxDriveId,
        resource_drive_id: '',
        backup_drive_id: '',
        sbox_drive_id: '',
        role: result.role,
        status: result.status,
        expire_time: result.expireTime,
        state: result.state,
        pin_setup: result.dataPinSetup,
        is_first_login: result.isFirstLogin,
        need_rp_verify: result.needRpVerify,
        name: '',
        spu_id: '',
        is_expires: false,
        used_size: 0,
        total_size: 0,
        free_size: 0,
        space_expire: false,
        spaceinfo: '',
        pic_drive_id: '',
        vipname: '',
        vipexpire: '',
        vipIcon: '',
        device_id: deviceId,
        signature: signature,
        signInfo: {
          signMon: -1,
          signDay: -1
        }
      }
      loginToken.value = token
      if (settingStore.uiEnableOpenApiType === 'custom') {
        client_id.value = settingStore.uiOpenApiClientId.trim()
        client_secret.value = settingStore.uiOpenApiClientSecret.trim()
      } else {
        const { appId, appSecret } = appConfig.getAliyunConfig()
        client_id.value = appId
        client_secret.value = appSecret
      }
      refreshStepTips('process', 2)
      loginStepSecond(token)
    } catch (err: any) {
      refreshStepTips('error', 1)
      message.error('登录失败：' + (err.message || '解析失败'))
      DebugLog.mSaveDanger('登录失败：' + (err.message || '解析失败'), JSON.stringify(err))
    }
  })
}

const loginStepSecond = async (token: ITokenInfo) => {
  if (!token) {
    refreshStepTips('process', 1)
    message.error('请重新登录')
    return
  }
  loginLoading.value = false
  clearInterval(intervalId.value)
  let codeUrl = await AliUser.OpenApiQrCodeUrl(client_id.value, client_secret.value, 250, 250)
  if (!codeUrl) {
    refreshQrCodeStatus('', 'error', '获取二维码失败')
    refreshStepTips('error', 2)
    handlerChangeType()
    return
  }
  refreshQrCodeStatus(codeUrl, 'info', '状态：等待扫码登录')
  refreshStepTips('process', 2)
  // 监听状态
  intervalId.value = setInterval(async () => {
    const { authCode, statusCode, statusType, statusTips } = await AliUser.OpenApiQrCodeStatus(codeUrl)
    if (!statusCode) {
      refreshQrCodeStatus()
      clearInterval(intervalId.value)
      return
    }
    refreshQrCodeStatus(codeUrl, statusType, statusTips)
    if (statusCode === 'QRCodeExpired') {
      clearInterval(intervalId.value)
      refreshQrCodeStatus()
      return
    }
    if (authCode && statusCode === 'LoginSuccess') {
      // 构造请求体
      await AliUser.OpenApiLoginByAuthCode(token, client_id.value, client_secret.value, authCode)
      loginSuccess(token)
      clearInterval(intervalId.value)
    }
  }, 1500)
}

const handlerChangeType = () => {
  clearInterval(intervalId.value)
  refreshQrCodeStatus()
  if (settingStore.uiEnableOpenApiType === 'custom') {
    Modal.open({
      title: '输入开发者账号',
      bodyStyle: { minWidth: '340px' },
      content: () => h(Space, { direction: 'vertical' }, () => [
        h(Input, {
          type: 'text',
          tabindex: '-1',
          allowClear: true,
          modelValue: settingStore.uiOpenApiClientId.trim(),
          style: { width: '340px' },
          placeholder: '客户端ID',
          'onUpdate:modelValue': (e) => cb({ uiOpenApiClientId: e.trim() })
        }),
        h(Input, {
          type: 'text',
          tabindex: '-1',
          allowClear: true,
          modelValue: settingStore.uiOpenApiClientSecret.trim(),
          style: { width: '340px' },
          placeholder: '客户端密钥',
          'onUpdate:modelValue': (e) => cb({ uiOpenApiClientSecret: e.trim() })
        })
      ]),
      okText: '确认',
      cancelText: '取消',
      onBeforeOk: async (e: any) => {
        if (settingStore.uiOpenApiClientId && settingStore.uiOpenApiClientSecret) {
          client_id.value = settingStore.uiOpenApiClientId
          client_secret.value = settingStore.uiOpenApiClientSecret
          handleRefreshQrCodeUrl()
          return true
        } else {
          message.error('请输入开发者账号')
          return false
        }
      }
    })
  } else {
    const { appId, appSecret } = appConfig.getAliyunConfig()
    client_id.value = appId
    client_secret.value = appSecret
    handleRefreshQrCodeUrl()
  }
}

const handleRefreshQrCodeUrl = () => {
  refreshQrCodeStatus()
  clearInterval(intervalId.value)
  loginStepSecond(loginToken.value!!)
}

const loginSuccess = (token: ITokenInfo) => {
  UserDAL.UserLogin(token)
    .then(() => {
      if (window.WebClearCookies) {
        window.WebClearCookies({
          origin: 'https://auth.aliyundrive.com',
          storages: ['cookies', 'localstorage']
        })
      }
      refreshStepTips('process', 3)
      refreshQrCodeStatus()
      useUserStore().userShowLogin = false
    })
    .catch(() => {
      useUserStore().userShowLogin = false
      if (window.WebClearCookies) {
        window.WebClearCookies({
          origin: 'https://auth.aliyundrive.com',
          storages: ['cookies', 'localstorage']
        })
      }
      refreshQrCodeStatus()
    })
}

</script>

<template>
  <a-modal title="网盘账号登录" v-model:visible='useUser.userShowLogin'
           :mask-closable='false' unmount-on-close :footer='false'
           class='userloginmodal' @before-open='handleModalOpen' @close='handleClose'>
    <div class="modalbody" style="width: fit-content;height: fit-content;overflow: hidden">
      <a-tabs size="small" v-model:active-key="loginProvider" style="margin: 8px 0 12px">
        <a-tab-pane key="aliyun" title="阿里云盘" />
        <a-tab-pane key="cloud123" title="123网盘" />
        <a-tab-pane key="115" title="115网盘" />
        <a-tab-pane key="baidu" title="百度网盘" />
      </a-tabs>

      <div v-if="loginProvider === 'aliyun'">
        <a-steps v-model:current="loginCur" :status="loginStatus">
          <a-step description="扫码或账号登录">第一次扫码</a-step>
          <a-step description="手机授权">第二次扫码</a-step>
        </a-steps>
        <div id='logindiv'>
          <div class='logincontent'>
            <div id="loginframediv" class="loginframe">
              <a-spin class="loading" :size="32" v-if='loginLoading' tip="加载中，请稍后..." />
              <Webview id="loginiframe" v-show='!loginLoading && loginCur === 1'
                       plugins nodeintegration disablewebsecurity
                       webpreferences="allowRunningInsecureContent"
                       src="about:blank" style="width: 100%; height: 400px; border: none; overflow: hidden" />
              <div class="qrcodeframe" v-if="loginCur === 2 && !loginLoading">
                <a-image
                  width='250'
                  height='250'
                  :hide-footer='true'
                  :preview='false'
                  :show-loader="true"
                  @click="handleRefreshQrCodeUrl"
                  style="display:inline-block;"
                  :src="qrCodeUrl">
                </a-image>
                <a-alert banner center :show-icon="false" :type='qrCodeStatusType'>
                  {{ qrCodeStatusTips }}
                </a-alert>
              </div>
              <div class='settingrow' v-if="loginCur === 2">
                <a-radio-group
                  type='button' tabindex='-1'
                  :model-value='settingStore.uiEnableOpenApiType'
                  @change="handlerChangeType"
                  @update:model-value='cb({ uiEnableOpenApiType: $event })'>
                  <a-radio tabindex='-1' value='inline'>内置方式</a-radio>
                  <a-radio tabindex='-1' value='custom'>自定义方式</a-radio>
                </a-radio-group>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loginProvider === 'cloud123'">
        <div id='logindiv'>
          <div class='logincontent'>
            <div id="loginframediv" class="loginframe">
              <a-spin class="loading" :size="32" v-if='loginLoading' tip="加载中，请稍后..." />
              <Webview id="loginiframe123" v-show='!loginLoading'
                       plugins nodeintegration disablewebsecurity
                       webpreferences="allowRunningInsecureContent"
                       src="about:blank" style="width: 100%; height: 400px; border: none; overflow: hidden" />
            </div>
            <div class="cloud123-code">
              <a-input v-model="cloud123Code" placeholder="授权 code（自动填充）" allow-clear />
              <a-button type="primary" :loading="cloud123Loading" @click="submitCloud123Code">确认登录</a-button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loginProvider === '115'">
        <div id='logindiv'>
          <div class='logincontent'>
            <div id="loginframediv" class="loginframe">
              <a-spin class="loading" :size="32" v-if='loginLoading' tip="加载中，请稍后..." />
              <div class="qrcodeframe" v-if="!loginLoading">
                <a-image
                  width='250'
                  height='250'
                  :hide-footer='true'
                  :preview='false'
                  :show-loader="true"
                  @click="handleRefresh115Qr"
                  style="display:inline-block;"
                  :src="qrCodeUrl">
                </a-image>
                <a-alert banner center :show-icon="false" :type="qrCodeStatusType || 'info'">
                  {{ drive115Tips }}
                </a-alert>
              </div>
            </div>
            <div class="cloud123-code">
              <a-input v-model="drive115ClientId" placeholder="App ID（client_id）" allow-clear
                       @change="handleStorageChange" />
              <a-button type="primary" :loading="drive115Loading" @click="handleRefresh115Qr">刷新二维码</a-button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="loginProvider === 'baidu'">
        <div id='logindiv'>
          <div class='logincontent'>
            <div id="loginframediv" class="loginframe">
              <a-spin class="loading" :size="32" v-if='loginLoading' tip="加载中，请稍后..." />
              <Webview id="loginiframebaidu" v-show='!loginLoading'
                       plugins nodeintegration disablewebsecurity
                       webpreferences="allowRunningInsecureContent"
                       src="about:blank" style="width: 100%; height: 400px; border: none; overflow: hidden" />
            </div>
            <div class="cloud123-code">
              <a-input v-model="baiduCode" placeholder="授权 code（自动填充）" allow-clear />
              <a-button type="primary" :loading="baiduLoading" @click="submitBaiduCode">确认登录</a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>
<style lang="less" scoped>
#logindiv {
  overflow: hidden;
  text-align: center;

  .logincontent {
    position: relative;
    width: 348px;
    height: 367px;
    min-height: 400px;
    margin: 0 auto;
    overflow: hidden;
    text-align: center;

    .loginframe {
      overflow: hidden;
      position: relative;
      width: 100%;
      height: 100%
    }

    .qrcodeframe {
      border-radius: 10px;
      padding: 5px;
      box-shadow: grey 0 0 10px;
      margin: 40px 15px 15px 15px;
    }

    .loading {
      min-height: 60px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}

.userloginmodal .arco-modal-body {
  min-height: 400px;
  padding: 0 16px 16px 16px !important;
}

.cloud123-code {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
}

.cloud123-code .arco-input-wrapper {
  width: 260px;
}
</style>

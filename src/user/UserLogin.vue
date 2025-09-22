<script setup lang='ts'>
import { h, ref } from 'vue'
import { ITokenInfo, useSettingStore, useUserStore } from '../store'
import UserDAL from '../user/userdal'
import Config from '../config'
import message from '../utils/message'
import DebugLog from '../utils/debuglog'
import { GetSignature } from '../aliapi/utils'
import getUuid from 'uuid-by-string'
import AliUser from '../aliapi/user'
import { Input, Modal, Space } from '@arco-design/web-vue'

const useUser = useUserStore()
const settingStore = useSettingStore()
const loginCur = ref(1)
const loginToken = ref<ITokenInfo>()
const loginStatus = ref<'wait' | 'error' | 'finish' | 'process'>('process')
const loginLoading = ref(true)
const client_id = ref('df43e22f022d4c04b6e29964f3b8b46d')
const client_secret = ref('63f06c3c5c5d4e1196e2c13e8588ae29')

const intervalId = ref()
const qrCodeUrl = ref('')
const qrCodeStatusType = ref()
const qrCodeStatusTips = ref()


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
  setTimeout(() => {
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
  client_id.value = 'df43e22f022d4c04b6e29964f3b8b46d'
  client_secret.value = '63f06c3c5c5d4e1196e2c13e8588ae29'
  clearInterval(intervalId.value)
  refreshStepTips('process', 1)
  refreshQrCodeStatus()
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
        tokenfrom: 'account',
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
        // 63f06c3c5c5d4e1196e2c13e8588ae29
        client_id.value = 'df43e22f022d4c04b6e29964f3b8b46d'
        client_secret.value = '63f06c3c5c5d4e1196e2c13e8588ae29'
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
    client_id.value = 'df43e22f022d4c04b6e29964f3b8b46d'
    client_secret.value = '63f06c3c5c5d4e1196e2c13e8588ae29'
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
  <a-modal title="登录阿里云盘账号" v-model:visible='useUser.userShowLogin'
           :mask-closable='false' unmount-on-close :footer='false'
           class='userloginmodal' @before-open='handleOpen' @close='handleClose'>
    <div class="modalbody" style="width: fit-content;height: fit-content;overflow: hidden">
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
</style>

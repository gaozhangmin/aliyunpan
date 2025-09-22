<script setup lang='ts'>
import message from '../utils/message'
import UserDAL, { UserTokenMap } from '../user/userdal'
import { ITokenInfo, useSettingStore, useUserStore } from '../store'
import { copyToClipboard, openExternal } from '../utils/electronhelper'
import Db from '../utils/db'
import fs from 'node:fs'
import path from 'path'
import { localPwd } from '../utils/aria2c'
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AliUser from '../aliapi/user'
import clipboard = Electron.clipboard

const settingStore = useSettingStore()
const qrCodeLoading = ref(false)
const intervalId = ref()
const qrCodeUrl = ref('')
const qrCodeStatusType = ref()
const qrCodeStatusTips = ref()

const cb = (val: any) => {
  settingStore.updateStore(val)
}

const openWebUrl = (type: string) => {
  switch (type) {
    case 'developer':
      openExternal('https://www.aliyundrive.com/developer')
      break
    case 'pkce':
      openExternal('https://www.yuque.com/aliyundrive/zpfszx/eam8ls1lmawwwksv')
      break
    case 'AList':
      openExternal('https://alist.nn.ci/tool/aliyundrive/request.html')
      break
  }
}

const copyCookies = async () => {
  let cookies = await window.WebGetCookies({ url: 'https://www.aliyundrive.com' }) as []
  if (cookies.length == 0) cookies = await window.WebGetCookies({ url: 'https://www.aliyundrive.com' }) as []
  if (cookies.length > 0) {
    let cookiesText = ''
    cookies.forEach(cookie => {
      cookiesText += cookie['name'] + '=' + cookie['value'] + ';'
    })
    copyToClipboard(cookiesText)
    message.success('当前账号的Cookies已复制到剪切板')
  } else {
    message.error('当前账号的Cookies不存在')
  }
}

const refreshStatus = () => {
  qrCodeLoading.value = false
  qrCodeUrl.value = ''
  qrCodeStatusType.value = 'info'
  qrCodeStatusTips.value = ''
}

const refreshQrCode = async () => {
  let client_id = 'df43e22f022d4c04b6e29964f3b8b46d'
  let client_secret = '63f06c3c5c5d4e1196e2c13e8588ae29'
  const { uiEnableOpenApiType, uiOpenApiClientId, uiOpenApiClientSecret } = storeToRefs(settingStore)
  if (uiEnableOpenApiType.value === 'custom') {
    if (!uiOpenApiClientId.value || !uiOpenApiClientSecret.value) {
      message.error('客户端ID或客户端密钥不能为空！')
      return
    }
    client_id = uiOpenApiClientId.value
    client_secret = uiOpenApiClientSecret.value
  } else {
    client_id = 'df43e22f022d4c04b6e29964f3b8b46d'
    client_secret = '63f06c3c5c5d4e1196e2c13e8588ae29'
  }
  qrCodeLoading.value = true
  const token = await UserDAL.GetUserTokenFromDB(useUserStore().user_id)
  if (!token) {
    refreshStatus()
    message.error('未登录账号，该功能无法开启')
    return
  }
  const codeUrl = await AliUser.OpenApiQrCodeUrl(client_id, client_secret)
  if (!codeUrl) {
    refreshStatus()
    return
  }
  qrCodeLoading.value = false
  qrCodeUrl.value = codeUrl
  qrCodeStatusType.value = 'info'
  qrCodeStatusTips.value = '状态：等待扫码登录'
  // 监听状态
  intervalId.value = setInterval(async () => {
    const { authCode, statusCode, statusType, statusTips } = await AliUser.OpenApiQrCodeStatus(codeUrl)
    if (!statusCode) {
      refreshStatus()
      clearInterval(intervalId.value)
      return
    }
    qrCodeStatusType.value = statusType
    qrCodeStatusTips.value = statusTips
    if (statusCode === 'QRCodeExpired') {
      message.error('二维码已超时，请刷新二维码')
      clearInterval(intervalId.value)
      refreshStatus()
      return
    }
    if (authCode && statusCode === 'LoginSuccess') {
      await AliUser.OpenApiLoginByAuthCode(token, client_id, client_secret, authCode, true)
      clearInterval(intervalId.value)
      refreshStatus()
      copyToClipboard(token.access_token)
      message.success('AccessToken已复制到剪切板')
    }
  }, 1500)
}

const closeQrCode = () => {
  refreshStatus()
  clearInterval(intervalId.value)
}
</script>

<template>
  <div class='settingcard'>
    <div class='settinghead'>阿里云盘账号</div>
    <div class='settingrow'>
      <a-button type='outline' size='small' tabindex='-1' @click='copyCookies()'>
        复制当前账号Cookies
      </a-button>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>自定义阿里云盘开发者帐号</div>
    <div class='settingrow'>
      <a-radio-group
          type='button' tabindex='-1'
          :model-value='settingStore.uiEnableOpenApiType'
          @update:model-value='cb({ uiEnableOpenApiType: $event })'>
        <a-radio tabindex='-1' value='inline'>内置开发者帐号</a-radio>
        <a-radio tabindex='-1' value='custom'>自定义开发者帐号</a-radio>
      </a-radio-group>
      <template v-if="settingStore.uiEnableOpenApiType === 'custom'">
        <div class='settingspace'></div>
        <div class='settinghead'>客户端ID(ClientId)</div>
        <div class='settingrow'>
          <a-input
              v-model.trim='settingStore.uiOpenApiClientId'
              :style="{ width: '340px' }"
              placeholder='客户端ID（该项必填）'
              @update:model-value='cb({ uiOpenApiClientId: $event })' />
        </div>
        <div class='settingspace'></div>
        <div class='settinghead'>客户端密钥(ClientSecret)</div>
        <div class='settingrow'>
          <a-input
              v-model.trim='settingStore.uiOpenApiClientSecret'
              :style="{ width: '340px' }"
              placeholder='客户端密钥（该项必填）'
              @update:model-value='cb({ uiOpenApiClientSecret: $event })' />
        </div>
      </template>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>
            扫码后，获取AccessToken，用于访问API<br />
            官方文档：<span class='opblue' @click="openWebUrl('developer')">开发者门户</span>
            <br />
          </div>
        </template>
      </a-popover>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>二维码(手机扫码)</div>
    <div class='settingrow' >
      <a-button type='outline' size='small' tabindex='-1' :loading='qrCodeLoading' @click='refreshQrCode()'>
        <template #icon>
          <i class='iconfont iconreload-1-icon' />
        </template>
        刷新二维码
      </a-button>
      <a-button style='margin-left: 10px' status='success' type='outline' v-if='qrCodeUrl' size='small'
                tabindex='-1' @click='closeQrCode()'>
        <template #icon>
          <i class='iconfont iconclose' />
        </template>
        关闭二维码
      </a-button>
    </div>
    <div v-if='qrCodeUrl'>
      <div class='settingspace'></div>
      <a-alert :type='qrCodeStatusType'> {{ qrCodeStatusTips }}</a-alert>
      <a-image
          width='200'
          height='200'
          :hide-footer='true'
          :preview='false'
          :show-loader="true"
          :src="qrCodeUrl" />
    </div>
  </div>
</template>

<style scoped>
.settinghead {
  display: flex;
  margin-right: 20px;
}
.settinghead::after {
  width: 0;
  height: 0;
}
.settinghead, .settingrow {
  display: inline-flex;
  width: 50%;
  padding: 10px;
  box-sizing: border-box;
  vertical-align: top;
}
</style>

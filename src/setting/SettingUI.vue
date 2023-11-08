<script setup lang="ts">
import { ref } from 'vue'
import message from '../utils/message'
import useSettingStore from './settingstore'
import MySwitch from '../layout/MySwitch.vue'
import Config from '../utils/config'
import ServerHttp from '../aliapi/server'
import os from 'os'
import {copyToClipboard, getResourcesPath} from '../utils/electronhelper'
import { existsSync, readFileSync } from 'fs'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const copyCookies = async () => {
  const cookies = await window.WebGetCookies({ url: 'https://www.aliyundrive.com' }) as []
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

const getAppVersion = () => {
  if (os.platform() === 'linux') {
    return Config.appVersion
  }
  let appVersion = ''
  const localVersion = getResourcesPath('localVersion')
  if (localVersion && existsSync(localVersion)) {
    appVersion = readFileSync(localVersion, 'utf-8')
  } else {
    appVersion = Config.appVersion
  }
  return appVersion
}

const verLoading = ref(false)
const handleCheckVer = () => {
  verLoading.value = true
  ServerHttp.CheckUpgrade().then(() => {
    verLoading.value = false
  })
}
</script>

<template>
  <div class="settingcard">
    <div class="appver">小白羊 {{ getAppVersion() }}</div>
    <div class="settingspace"></div>
    <div class="settinghead">检查更新</div>
    <div class="settingrow">
        <a-button type="outline" size="small" tabindex="-1"  @click="handleCheckVer">检查更新</a-button>
    </div>
    <div class="settingspace"></div>
    <div class='settinghead'>阿里云盘账号</div>
    <div class='settingrow'>
      <a-button type='outline' size='small' tabindex='-1' @click='copyCookies()'>
        复制Cookie
      </a-button>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">外观</div>
    <div class="settingrow">
      <button class="theme-button system-theme" @click="cb({ uiTheme: 'system' })">
        <span></span>
      </button>
      <button class="theme-button light-theme" @click="cb({ uiTheme: 'light' })">
        <span></span>
      </button>
      <button class="theme-button dark-theme" @click="cb({ uiTheme: 'dark' })">
        <span></span>
      </button>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">关闭窗口</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.uiExitOnClose" @update:value="cb({ uiExitOnClose: $event })"></MySwitch>
      <a-popover position="right">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">关闭</span>
            <hr />
            默认是点击窗口上的关闭按钮时<br />最小化到托盘，继续上传/下载<br /><br />开启此设置后直接彻底退出小白羊程序
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">启动时检查更新</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.uiLaunchAutoCheckUpdate" @update:value="cb({ uiLaunchAutoCheckUpdate: $event })">自动检查更新</MySwitch>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">自动签到</div>
    <div class="settingrow">
        <MySwitch :value="settingStore.uiLaunchAutoSign" @update:value="cb({ uiLaunchAutoSign: $event })">自动签到</MySwitch>
    </div>
    <template v-if="['win32', 'darwin'].includes(os.platform())">
        <div class="settingspace"></div>
        <div class="settinghead">开机自启</div>
        <div class="settingrow">
            <a-row class="grid-demo">
                <a-col flex="180px">
                    <MySwitch :value="settingStore.uiLaunchStart" @update:value="cb({ uiLaunchStart: $event })">开机启动</MySwitch>
                </a-col>
                <a-col flex="180px">
                    <MySwitch :value="settingStore.uiLaunchStartShow" @update:value="cb({ uiLaunchStartShow: $event })">显示主窗口</MySwitch>
                </a-col>
            </a-row>
        </div>
    </template>
  </div>

</template>

<style scoped>
.settinghead {
  display: flex;
  margin-right: 20px;
}
.theme-button {
  display: flex;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: #fff;
  padding: 15px 40px;
  border-radius: 5px;
  margin-right: 30px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  flex-direction: row;
  /*align-items: flex-start;*/
}

.theme-button span {
  display: flex;
  margin-top: 10px;
}

/*.settingrow {*/
/*  display: flex;*/
/*}*/

.system-theme {
  background-image: url('../../public/images/follow_button.png');
  background-color: #888;
}

.light-theme {
  background-image: url('../../public/images/light_button.png');
  background-color: #eee;
}

.dark-theme {
  background-image: url('../../public/images/dark_button.png');
  background-color: #333;
}
.settinghead, .settingrow {
  display: inline-flex;
  width: 50%;
  padding: 10px;
  box-sizing: border-box;
  vertical-align: top;
}

.appver {
  margin-bottom: 0.5em;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.4;
  text-align: center;
}
</style>


<script setup lang='ts'>
import { computed, ref } from 'vue'
import useSettingStore from './settingstore'
import MySwitch from '../layout/MySwitch.vue'
import ServerHttp from '../aliapi/server'
import os from 'os'
import { getAppNewPath, getResourcesPath } from '../utils/electronhelper'
import { existsSync, readFileSync } from 'fs'
import { getPkgVersion } from '../utils/utils'
import { modalUpdateLog } from '../utils/modal'
import fs from 'node:fs'
import message from '../utils/message'
import { Sleep } from '../utils/format'

const platform = window.platform
const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const getAppVersion = computed(() => {
  const pkgVersion = getPkgVersion()
  if (os.platform() === 'linux') {
    return pkgVersion
  }
  let appVersion = ''
  const localVersion = getResourcesPath('localVersion')
  if (localVersion && existsSync(localVersion)) {
    appVersion = readFileSync(localVersion, 'utf-8')
  } else {
    appVersion = pkgVersion
  }
  return appVersion
})

const verLoading = ref(false)
const handleCheckVer = () => {
  verLoading.value = true
  setTimeout(() => {
    ServerHttp.CheckUpgrade()
    verLoading.value = false
  }, 200)
}
const handleUpdateLog = () => {
  modalUpdateLog()
}

const handleImportAsar = () => {
  window.WebShowOpenDialogSync({
    title: '选择需要导入的Asar文件',
    buttonLabel: '导入更新文件',
    filters: [{ name: 'app.asar', extensions: ['asar'] }],
    properties: ['openFile', 'showHiddenFiles', 'noResolveAliases', 'treatPackageAsDirectory', 'dontAddToRecent']
  }, async (files: string[] | undefined) => {
    if (files && files.length > 0) {
      // 导入到app.new
      await fs.promises.cp(files[0], getAppNewPath())
      message.info('导入更新文件成功，重新打开应用...', 0)
      await Sleep(1000)
      window.WebToElectron({ cmd: 'relaunch' })
    }
  })
}
</script>

<template>
  <div class='settingcard'>
    <div class='appver'>小白羊 {{ getAppVersion }}</div>
    <div class='appver'>
      <a-button type='outline' status='success' size='small' tabindex='-1' @click='handleUpdateLog'>
        更新日志
      </a-button>
      <a-button style='margin-left: 10px' type='outline' size='small' tabindex='-1' :loading='verLoading'
                @click='handleCheckVer'>
        检查更新
      </a-button>
      <a-button style='margin-left: 10px'
                v-if='platform !== "linux"'
                status='warning' type='outline' size='small' tabindex='-1'
                @click='handleImportAsar'>
        手动导入app.asar更新
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
    <template v-if="['win32', 'darwin'].includes(os.platform())">
      <div class='settingspace'></div>
      <div class='settinghead'>开机自启</div>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiLaunchStart' @update:value='cb({ uiLaunchStart: $event })'>
          开机时自动启动
        </MySwitch>
      </div>
      <div class='settingrow' v-if="settingStore.uiLaunchStart">
        <MySwitch :value='settingStore.uiLaunchStartShow'
                  @update:value='cb({ uiLaunchStartShow: $event })'>
          自动启动后显示主窗口
        </MySwitch>
      </div>
    </template>
    <div class='settingspace'></div>
    <div class='settinghead'>检查更新</div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.uiLaunchAutoCheckUpdate'
                @update:value='cb({ uiLaunchAutoCheckUpdate: $event })'>
        启动时检查更新
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>自动签到</div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.uiLaunchAutoSign' @update:value='cb({ uiLaunchAutoSign: $event })'>
        启动时自动签到
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>关闭时彻底退出</div>
    <div class='settingrow'>
      <MySwitch class='switcher' :value='settingStore.uiExitOnClose' @update:value='cb({ uiExitOnClose: $event })'>
        关闭窗口时彻底退出小白羊
      </MySwitch>
      <a-popover position='right'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div>
            默认：<span class='opred'>关闭</span>
            <hr />
            默认是点击窗口上的关闭按钮时<br />最小化到托盘，继续上传/下载<br /><br />开启此设置后直接彻底退出小白羊程序
          </div>
        </template>
      </a-popover>

    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>软件更新代理</div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.uiUpdateProxyEnable' @update:value='cb({ uiUpdateProxyEnable: $event })'>
        开启软件更新代理
      </MySwitch>
      <div class='settingrow' v-if="settingStore.uiUpdateProxyEnable">
        <a-input v-model.trim='settingStore.uiUpdateProxyUrl'
                 allow-clear
                 :style="{ width: '280px' }"
                 placeholder='软件更新代理'
                 @update:model-value='cb({ uiUpdateProxyUrl: $event })' />
      </div>
    </div>
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
}

.switcher {
  height: 30px !important;
  align-items: center !important;
  user-select: none !important;
  display: inline !important;
}

.appver {
  margin-bottom: 0.5em;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.4;
  text-align: center;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import useSettingStore from './settingstore'
import {CreatLocalAria2c} from '../utils/aria2c'
import message from '../utils/message'

import 'ant-design-vue/es/checkbox/style/css'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const handleSelectAria2cPath = () => {
    if (window.WebShowOpenDialogSync) {
        window.WebShowOpenDialogSync(
            {
                title: '选择aria2c可执行程序路径',
                buttonLabel: '选择',
                properties: ['openFile'],
                defaultPath: settingStore.localAria2cPath
            },
            (result: string[] | undefined) => {
                if (result && result[0]) {
                    settingStore.updateStore({ localAria2cPath: result[0] })
                }
            }
        )
    }
}

const handleSelectAria2cConfPath = () => {
    if (window.WebShowOpenDialogSync) {
        window.WebShowOpenDialogSync(
            {
                title: '选择aria2c配置文件路径',
                buttonLabel: '选择',
                properties: ['openFile'],
                defaultPath: settingStore.localAria2cConfPath
            },
            (result: string[] | undefined) => {
                if (result && result[0]) {
                    settingStore.updateStore({ localAria2cConfPath: result[0] })
                }
            }
        )
    }
}

const hanldeLanucnLocalAria2c = () => {
  try {
    console.log("aria2c", settingStore.localAria2cPath, settingStore.localAria2cConfPath)
    CreatLocalAria2c(settingStore.localAria2cPath, settingStore.localAria2cConfPath)
  } catch (e: any) {
    settingStore.ariaLoading = false
    message.error('数据格式错误！' + e.message)
  }
}

</script>

<template>
  <div class="settingcard">
      <div class="settinghead">aria2c路径</div>
      <div class="settingrow">
          <a-input-search tabindex="-1" style="max-width: 420px" :readonly="true" button-text="更改" search-button :model-value="settingStore.localAria2cPath"  @search="handleSelectAria2cPath"/>
      </div>
      <div class="settingspace"></div>
      <div class="settinghead">配置文件路径</div>
      <div class="settingrow">
          <a-input-search tabindex="-1" style="max-width: 420px" :readonly="true" button-text="更改" search-button :model-value="settingStore.localAria2cConfPath"  @search="handleSelectAria2cConfPath"/>
      </div>
      <div class="settinghead"></div>
      <div class="settingrow" v-show="settingStore.AriaIsLocal">
          <a-button type="outline" size="small" tabindex="-1" :loading="settingStore.ariaLoading" @click="hanldeLanucnLocalAria2c">尝试启动本地Aria2c</a-button>
      </div>

  </div>
</template>

<style></style>

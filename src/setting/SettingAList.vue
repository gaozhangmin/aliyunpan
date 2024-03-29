<script setup lang="ts">
import { ref } from 'vue'
import useSettingStore from './settingstore'
import { AriaChangeToLocal, AriaChangeToRemote, AriaTest } from '../utils/aria2c'
import message from '../utils/message'

import { Checkbox as AntdCheckbox } from 'ant-design-vue'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}
const alistPwd = ref(settingStore.alistPwd)


const handleResetAListPwd = () => {
  if (window.WebResetAlistPwd) {
    window.WebResetAlistPwd({ cmd: alistPwd.value })
    message.info("重置成功")
  }
}
</script>

<template>
  <div class="settingcard">
    <div class="settingspace"></div>
    <div class="settinghead">重置Alist登录密码</div>
    <div class="settingrow">
      <a-input tabindex="-1" :style="{ width: '200px'}" placeholder="Alist登录密码" v-model:model-value="alistPwd" />
      <a-button type="primary"  :style="{ marginLeft: '5px' }" @click="handleResetAListPwd()">重置</a-button>
      <a-popover position="right">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            如果第一次配置alist, 或者忘记登录密码, 先执行重置登录密码
          </div>
        </template>
      </a-popover>
    </div>
  </div>
</template>

<style>
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

<script setup lang="ts">
import useSettingStore from './settingstore'
import MySwitch from '../layout/MySwitch.vue'
import {AriaGlobalSpeed} from "../utils/aria2c";
const settingStore = useSettingStore()
const cb = async (val: any) => {
    // 限速实时生效
    if (Object.hasOwn(val, 'downGlobalSpeed')){
        await AriaGlobalSpeed()
    }
    await settingStore.updateStore(val)
}
const handleSelectDownSavePath = () => {
  if (window.WebShowOpenDialogSync) {
    window.WebShowOpenDialogSync(
      {
        title: '选择一个文件夹，把所有文件下载到此文件夹内',
        buttonLabel: '选择',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: settingStore.downSavePath
      },
      (result: string[] | undefined) => {
        if (result && result[0]) {
          settingStore.updateStore({ downSavePath: result[0] })
        }
      }
    )
  }
}
</script>

<template>
  <div class="settingcard">
    <div class="settinghead">下载文件保存的位置</div>
    <div class="settingrow">
      <a-input-search tabindex="-1" style="max-width: 420px" :readonly="true" button-text="更改" search-button :model-value="settingStore.downSavePath" @search="handleSelectDownSavePath" />
    </div>
    <div class="settingspace"></div>
    <div class="settinghead"></div>
    <div class="settingrow">
      <MySwitch :value="settingStore.downSavePathDefault" @update:value="cb({ downSavePathDefault: $event })"> 新建下载任务时 默认使用此路径</MySwitch>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">开启</span>
            <hr />
            推荐开启，点击下载按钮直接下载不询问<br /><br />
            关闭此设置后，点击下载按钮会弹窗提示选择保存路径
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">使用网盘完整路径</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.downSavePathFull" @update:value="cb({ downSavePathFull: $event })"> </MySwitch>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">开启</span>
            <hr />
            推荐开启，因为关闭此设置后，遇到重名的文件会下载失败
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">自动跳过违规文件</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.downSaveBreakWeiGui" @update:value="cb({ downSaveBreakWeiGui: $event })"> </MySwitch>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">开启</span>
            <hr />
            推荐开启，遇到违规文件跳过不下载<br /><br />
            关闭此设置后，会正常的下载，3MB的违规视频文件
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">最大并行任务数</div>
    <div class="settingrow">
      <a-select tabindex="-1" :style="{ width: '252px' }" :model-value="settingStore.downFileMax" :popup-container="'#SettingDiv'" @update:model-value="cb({ downFileMax: $event })">
        <a-option :value="1">
          1 个文件
          <template #suffix>大文件</template>
        </a-option>
        <a-option :value="3">3 个文件</a-option>
        <a-option :value="5">
          5 个文件
          <template #suffix>推荐</template>
        </a-option>
        <a-option :value="10">10个文件</a-option>
        <a-option :value="20">20个文件</a-option>
        <a-option :value="30">30个文件<template #suffix>大量小文件</template></a-option>
      </a-select>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">单个文件线程数</div>
    <div class="settingrow">
      <a-select tabindex="-1" :style="{ width: '252px' }" :model-value="settingStore.downThreadMax" :popup-container="'#SettingDiv'" @update:model-value="cb({ downThreadMax: $event })">
        <a-option :value="1">1个线程</a-option>
        <a-option :value="2">2个线程</a-option>
        <a-option :value="4">4个线程<template #suffix>   推荐</template></a-option>
        <a-option :value="8">8个线程</a-option>
        <a-option :value="16">16个线程</a-option>
      </a-select>
      <a-popover position="right">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">4个线程</span>
            <hr />
            下载线程太多，时间久了账号容易被限速<br /><br />
            请设置为可以跑满 你的宽带的 最小值
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">下载速度限制</div>
    <div class="settingrow">
      <a-input-number tabindex="-1" :style="{ width: '128px' }" mode="button" :min="0" :max="settingStore.downGlobalSpeedM == 'MB' ? 100 : 999" :step="settingStore.downGlobalSpeedM == 'MB' ? 4 : 40" :model-value="settingStore.downGlobalSpeed" @update:model-value="cb({ downGlobalSpeed: $event })">
      </a-input-number>
      <div style="height: 32px; border-left: 1px solid var(--color-neutral-3)"></div>
      <a-radio-group type="button" tabindex="-1" :model-value="settingStore.downGlobalSpeedM" @update:model-value="cb({ downGlobalSpeedM: $event, downGlobalSpeed: 0 })">
        <a-radio tabindex="-1" value="MB">MB/s</a-radio>
        <a-radio tabindex="-1" value="KB">KB/s</a-radio>
      </a-radio-group>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div :style="{ width: '360px' }">
            默认：<span class="opred">0 (不限速，满速下载)</span>
            <hr />
            <span class="opred">0-100MB/s</span> 百兆宽带最高跑到 12MB/s<br />
            <span class="opred">0-999KB/s</span> 超慢的宽带请选择KB/s (1MB/s=1000KB/s)<br />
            适当的限速可以不影响其他人上网
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

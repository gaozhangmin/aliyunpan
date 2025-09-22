<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '../../store'
import { Sleep } from '../../utils/format'
import MyTags from '../../layout/MyTags.vue'
import MySwitch from '../../layout/MySwitch.vue'
import message from '../../utils/message'
import { DoXiMa } from './jiami'

const Loading = ref(false)
const dirPath = ref('')
const breakSmall = ref(true)
const copyMode = ref(false)
const videoMode = ref(true)
const passwored = ref('')
const mode = ref('加密')
const matchExtList = ref<string[]>([])

const handleAddExtList = (addList: string[]) => {
  const list: string[] = []
  let ext = ''
  for (let i = 0, maxi = addList.length; i < maxi; i++) {
    ext = addList[i].toLowerCase().trim()
    while (ext.endsWith(' ') || ext.endsWith('.')) ext = ext.substring(0, ext.length - 1)
    while (ext.startsWith(' ') || ext.startsWith('.')) ext = ext.substr(1)
    if (!ext) continue
    ext = '.' + ext
    if (list.includes(ext) == false) list.push(ext)
  }
  matchExtList.value = list
}

const handleSelectDir = () => {
  if (window.WebShowOpenDialogSync) {
    window.WebShowOpenDialogSync(
      {
        title: '选择一个文件夹，对文件夹内全部文件执行加密',
        buttonLabel: '选择',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: useSettingStore().downSavePath
      },
      (result: string[] | undefined) => {
        if (result && result[0]) {
          dirPath.value = result[0]
        }
      }
    )
  }
}

const handleClickXiMa = async () => {
  if (Loading.value) return
  if (!dirPath.value) {
    message.error('还没有选择要执行加密的文件夹')
    return
  }
  Loading.value = true

  const runCount = await DoXiMa(dirPath.value, breakSmall.value, matchExtList.value)
  await Sleep(2000)
  if (runCount > 0) message.success('成功加密 ' + runCount + ' 个文件')
  Loading.value = false
}
</script>

<template>
  <div class="fullscroll rightbg">
    <div class="settingcard">
      <div class="settinghead">文件加解密</div>
      <div class="settingrow">
        <a-radio-group v-model="mode" type="button" tabindex="-1">
          <a-radio tabindex="-1" value="加密">加密</a-radio>
          <a-radio tabindex="-1" value="解密">解密</a-radio>
        </a-radio-group>
      </div>

      <div class="settingspace"></div>
      <div class="settinghead">1:文件夹</div>
      <div class="settingrow">
        <a-input-search  tabindex="-1" :readonly="true" button-text="选择" search-button :model-value="dirPath" @search="handleSelectDir" />
      </div>

      <div v-if="mode == '加密'">
        <div class="settinghead"></div>
        <div class="settingrow">
          <MySwitch :value="breakSmall" @update:value="breakSmall = $event"> 跳过小于5MB的小文件</MySwitch>
        </div>
        <div class="settinghead"></div>
        <div class="settingrow">
          <MySwitch :value="copyMode" @update:value="copyMode = $event"> 保留原文件</MySwitch>
        </div>
        <div class="settingspace"></div>
        <div class="settinghead">2:文件格式</div>
        <div class="settingrow">
          <MyTags :value="matchExtList" :maxlen="20" @update:value="handleAddExtList" />
          <a-popover position="bottom">
            <i class="iconfont iconbulb" />
            <template #content>
              <div>
                默认：<span class="opred">全部</span>
                <hr />
                对文件夹内的全部文件，执行一次加密<br /><br />
                例如填写 .mp4 就是只加密.mp4结尾的文件
              </div>
            </template>
          </a-popover>
        </div>
        <div class="settingspace"></div>
        <div class="settinghead">3:设置解密密码</div>
        <div class="settingrow">
          <a-input v-model="passwored" tabindex="-1" :style="{ width: '120px', height: '30px'}" placeholder="" allow-clear />
          <a-popover position="bottom">
            <i class="iconfont iconbulb" />
            <template #content>
              <div>
                默认：<span class="opred">为空</span>
                <hr />
                解密时无需密码直接解密<br /><br />
                解密时必须输入正确的密码才能解密
              </div>
            </template>
          </a-popover>
        </div>
      </div>
      <div v-else>
        <div class="settingspace"></div>
        <div class="settinghead">2:解密的密码</div>
        <div class="settingrow">
          <a-input v-model="passwored" tabindex="-1" :style="{ width: '120px', height: '30px'}" placeholder="没有则不填" allow-clear />
          <a-popover position="bottom">
            <i class="iconfont iconbulb" />
            <template #content>
              <div>
                如果文件加密时设置了密码，则解密必须提供密码
              </div>
            </template>
          </a-popover>
        </div>
      </div>
      <div class="settingspace"></div>
      <div class="settingrow">
        <a-button v-if="mode == '加密'"  disabled type="primary" tabindex="-1" status="danger" :loading="Loading" @click="handleClickXiMa">执行加密</a-button>
        <a-button v-else  disabled type="primary" tabindex="-1" status="success" :loading="Loading" @click="handleClickXiMa">执行解密</a-button>
        <div><span class="opred">文件加密功能仍在测试阶段，暂未开放公众使用</span></div>
      </div>
    </div>

    <div class="settingcard">
      <span class="oporg">警告</span>：会对文件夹内 全部子文件、子文件夹 递归执行，会直接修改原文件！ <br />
      <span class="oporg">警告</span>：复制后加密模式，会把原文件复制一份然后加密，请确认硬盘剩余空间！ <br />
      <span class="oporg">警告</span>：仅支持加密文件，不限制文件格式！ <br />
      <span class="oporg">警告</span>：不能把文件夹打包加密成一个文件！ <br />
    </div>
  </div>
</template>

<style>
.rightbg {
  background: var(--rightbg2);
  padding: 0 20px !important;
}
.helptxt {
  color: var(--color-text-3);
}
</style>

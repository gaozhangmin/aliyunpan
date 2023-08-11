<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '../../store'
import { Sleep } from '../../utils/format'
import MyTags from '../../layout/MyTags.vue'
import MySwitch from '../../layout/MySwitch.vue'
import message from '../../utils/message'
import { DoXiMa } from './xima'

const ximaLoading = ref(false)
const dirPath = ref('')
const breakSmall = ref(true)
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
        title: '选择一个文件夹，对文件夹内全部文件执行洗码',
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
  if (ximaLoading.value) return
  if (!dirPath.value) {
    message.error('还没有选择要执行洗码的文件夹')
    return
  }
  ximaLoading.value = true

  const runCount = await DoXiMa(dirPath.value, breakSmall.value, matchExtList.value)
  await Sleep(2000)
  if (runCount > 0) message.success('成功洗码 ' + runCount + ' 个文件')
  ximaLoading.value = false
}
</script>

<template>
  <div class="fullscroll rightbg">
    <div class="settingcard">
      <div class="settinghead">1:选择要洗码的文件夹</div>
      <div class="settingrow">
        <a-input-search style="max-width: 500px" tabindex="-1" :readonly="true" button-text="选择" search-button :model-value="dirPath" @search="handleSelectDir" />
      </div>
      <div class="settinghead"></div>
      <div class="settingrow">
        <MySwitch :value="breakSmall" @update:value="breakSmall = $event">跳过小于5MB文件</MySwitch>
      </div>
      <div class="settingspace"></div>
      <div class="settinghead">2:选择要洗码的格式</div>
      <div class="settingrow">
        <MyTags :value="matchExtList" :maxlen="20" @update:value="handleAddExtList" />
        <a-popover position="bottom">
          <i class="iconfont iconbulb" />
          <template #content>
            <div>
              默认：<span class="opred">全部</span>
              <hr />
              对文件夹内的全部文件，执行一次洗码<br /><br />
              例如填写 .mp4 就是只洗码.mp4结尾的文件
            </div>
          </template>
        </a-popover>
      </div>
      <div class="settingspace"></div>
      <div class="settingrow">
        <a-button type="primary" tabindex="-1" status="danger" :loading="ximaLoading" @click="handleClickXiMa">执行洗码</a-button>
        <a-popover position="bottom">
          <i class="iconfont iconbulb" />
          <template #content>
            <div>
              默认：<span class="opred">全部</span>
              <hr />
              对文件夹内的全部文件，执行一次洗码<br /><br />
              例如填写 .mp4 就是只洗码.mp4结尾的文件
            </div>
          </template>
        </a-popover>
      </div>
    </div>

    <div class="settingcard">
      <div :style="{ display: 'flex' }">
        <a-card :style="{ width: '800px' , fontSize: '20px'}" title="注意" hoverable>
          1.会对文件夹内 全部子文件、子文件夹 递归执行，会直接修改原文件！ <br />
          2.洗码操作不可逆，不可恢复，如果原文件很重要请提前自己 备份一份！<br />
          3.洗码并不能对抗分享审查<br />
          4.测试通过：<a-typography-text type="danger">mp4 mkv mov avi wmv flv jpg png apng tif gif heic zip rar 7z tar</a-typography-text>
        </a-card>
      </div>
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

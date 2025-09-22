<script setup lang="ts">

import { modalCloseAll } from '../../utils/modal'
import { nextTick, PropType, ref } from 'vue'
import { IServerVerData } from '../../aliapi/server'
import MarkdownIt from 'markdown-it'
import { getAppNewPath, getResourcesPath, getUserDataPath, openExternal } from '../../utils/electronhelper'
import fs, { existsSync, rmSync, writeFile } from 'fs'
import message from '../../utils/message'
import axios, { AxiosResponse } from 'axios'
import { Sleep } from '../../utils/format'
import { execFile, SpawnOptions } from 'child_process'
import { shell } from 'electron'
import path from 'path'
import { Progress as AntdProgress } from 'ant-design-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  verData: {
    type: Object as PropType<IServerVerData>,
    required: true
  }
})
const okLoading = ref(false)
const percent = ref(0)
const loaded = ref(0)

const handleOpen = async () => {
  const markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  })
  await nextTick(() => {
    document.getElementById('markdown-content')!!.innerHTML = markdown.render(props.verData.verInfo)
  })
}

const handleHide = () => {
  if (okLoading.value) okLoading.value = false
  percent.value = 0
  loaded.value = 0
  if (props.verData.verName) {
    let resourcesPath = getResourcesPath(props.verData.verName)
    if (existsSync(resourcesPath)) {
      rmSync(resourcesPath, { force: true })
    }
  }
  modalCloseAll()
}
const handleOK = async () => {
  let { version, verName, verUrl, verHtml } = props.verData
  let isHot = props.verData.fileExt.includes('asar')
  if (verUrl && window.platform !== 'linux') {
    okLoading.value = true
    // 下载安装
    const flag = await AutoDownload(verUrl, verName, verHtml, isHot)
    okLoading.value = false
    // 更新本地版本号
    if (flag && version) {
      const localVersion = getResourcesPath('localVersion')
      if (localVersion) {
        writeFile(localVersion, version, async (err) => {
          if (err) {
            message.error('更新本地版本号失败，请检查【Resources文件夹】是否有写入权限【不要安装到系统盘】', 5)
          } else {
            message.info('热更新完毕，重新打开应用...', 0)
            await Sleep(500)
            window.WebToElectron({ cmd: 'relaunch' })
          }
        })
      }
    } else {
      percent.value = 0
      message.error('新版本下载失败，请前往github下载最新版本', 8)
      openExternal(verHtml)
    }
  } else {
    openExternal(verHtml)
  }
}

const AutoDownload = async (url: string, name: string, html_url: string, hot: boolean) => {
  const downPath = hot ? getAppNewPath() : getUserDataPath(name)
  if (!hot && existsSync(downPath) && fs.statSync(downPath).size == props.verData.fileSize) {
    await autoInstallNewVersion(downPath)
    return true
  } else {
    await fs.promises.rm(downPath, { force: true })
  }
  return axios
    .get(url, {
      withCredentials: false,
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Expires: '0'
      },
      onDownloadProgress: (progressEvent) => {
        let total = props.verData.fileSize
        loaded.value = progressEvent.loaded
        if (total) {
          let progress = (loaded.value > 0) ? Math.ceil(loaded.value / (total / 100)) : 0
          percent.value = (progress > 100) ? 100 : progress
        }
      }
    })
    .then(async (response: AxiosResponse) => {
      writeFile(downPath, Buffer.from(response.data), (err) => {
        if (err) {
          return false
        }
      })
      if (!hot) {
        await autoInstallNewVersion(downPath)
      }
      return true
    })
    .catch(() => {
      rmSync(downPath, { force: true })
      return false
    })
}

const autoInstallNewVersion = async (resourcesPath: string) => {
  // 自动安装
  const options: SpawnOptions = { shell: true, windowsVerbatimArguments: true }
  const subProcess = execFile(`${resourcesPath}`, options)
  if (subProcess.pid && process.kill(subProcess.pid, 0)) {
    await Sleep(2000)
    window.WebToElectron({ cmd: 'exit' })
  } else {
    message.info('安装失败，请前往文件夹手动安装', 5)
    const resources = getResourcesPath('')
    await shell.openPath(path.join(resources, '/'))
  }
}
</script>

<template>
  <a-modal :visible='visible'
           modal-class='modalclass updatemodal'
           :unmount-on-close='true'
           :mask-closable='false'
           :closable="false"
           @cancel='handleHide'
           @before-open='handleOpen'>
    <template #title>
      <span class='vermodaltitle' style="max-width: 540px">
        发现新版本<span class='vertip'>{{ verData.version }}</span><i class='verupdate'></i>
      </span>
    </template>
    <div class='vermodalbody'>
      <div id='markdown-content' />
    </div>
    <template #footer>
      <div class='modalfoot'>
        <AntdProgress
          v-show="percent > 0"
          size="small"
          style="width: 250px;"
          status='active'
          :stroke-color="{
              '0%': '#ffba7a',
              '8.56%': '#ff74c7',
              '26.04%': '#637dff',
              '100%': 'rgba(99, 125, 255, 0.2)',
            }"
          :percent="percent">
          <template #format="percent">
            {{ `${percent}%(${loaded}/${props.verData.fileSize})` }}
          </template>
        </AntdProgress>
        <div style='flex-grow: 1'></div>
        <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
        <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>更新</a-button>
      </div>
    </template>
  </a-modal>
</template>

<style scoped>
.vermodaltitle {
  display: flex;
  align-items: center;
  line-height: 48px;
}

.vermodalbody {
  width: 540px;
  max-height: calc(70vh - 100px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow-x: hidden;
  padding: 0 16px 16px 16px !important;
}

.verupdate {
  width: 48px;
  height: 48px;
  display: inline-block;
  background-size: contain;
  background-image: url(data:image/png;base64,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MSJbtyrnpukiR4/anoPIQkBghz7rEmnYUJSzT2T5cttzwpZypol06iQiBATljktYAAAjBAQAYISAAACM8BwIgJAR/Kt+PFh70SKnr+Q4B95555IfWF8GB1sWF8trto8gshAQACEjWOejvLu2rlgRFGkoW22vwX/DJSwAgBECAgAwQkAAAEYICADACAEBABghIAAAIwQEAGCEgAAAjBAQAIARAgIAMEJAAABGCAgAwAgBAQAYISAAACMEBABghIAAAIwQEACAEQICADDCLW1hiT4nUlAgIj6Rt96yvSZs6WAbkfx82zMQmQgIrFDOzSNFvv76wkc9e9reE8b+YnsAIheXsAAARggIAMAIAQEAGCEgAAAjBAQAYISAAACMEBAAgBECAgAwQkAAAEYICADACAEBABghIAAAIwQEAGCEgAAAjBAQAIARAgIAMEJAAABG/h+9SX6edMAaRQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMi0wMi0xNlQxODo0ODozOCswODowMJ6ZayIAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjItMDItMTZUMTg6NDg6MzgrMDg6MDDvxNOeAAAASnRFWHRzdmc6YmFzZS11cmkAZmlsZTovLy9ob21lL2FkbWluL2ljb24tZm9udC90bXAvaWNvbl94bjhrYnQ4OHZkai9jcy1zai0xLnN2Z7EpmJkAAAAASUVORK5CYII=);
}

.vertip {
  padding-left: 12px;
  color: rgb(40, 104, 240);
  flex-grow: 1;
}
</style>
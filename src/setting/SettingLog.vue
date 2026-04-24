<script setup lang="ts">
import { computed } from 'vue'
import message from '../utils/message'
import DebugLog from '../utils/debuglog'
import { useLogStore, useWinStore } from '../store'
import { copyToClipboard } from '../utils/electronhelper'

const logStore = useLogStore()
const winStore = useWinStore()

const logHeight = computed(() => winStore.height - 316)

const handleSaveLogRefresh = () => {
  DebugLog.aLoadFromDB()
}

const handleSaveLogClear = () => {
  DebugLog.mSaveLogClear()
}

const handleSaveLogCopy = () => {
  let logstr = ''
  const logList = DebugLog.logList
  for (let i = 0, maxi = logList.length; i < maxi; i++) {
    const item = logList[i]
    logstr += item.logtime + ' : ' + item.logtype + ' : ' + item.logmessage + '\n'
  }
  copyToClipboard(logstr)
  message.success('运行日志已复制到剪切板')
}
</script>

<template>
  <div class="settingcard">
    <div class="settings-log-header">
      <div>
        <div class="settings-log-kicker">Diagnostics</div>
        <div class="settinghead">运行日志</div>
      </div>
      <div class="settings-log-caption">用于排查启动、网络、播放器与同步相关问题</div>
    </div>
    <a-list
      :bordered="false"
      :max-height="logHeight"
      :style="{ height: logHeight + 'px' }"
      :data="DebugLog.logList"
      class="loglist"
      :data-refresh="logStore.logTime"
      :virtual-list-props="{
        height: logHeight,
        threshold: 50
      }">
      <template #item="{ item, index }">
        <a-list-item :key="index">
          <a-typography-text :type="item.logtype"> [{{ item.logtime }}] </a-typography-text>
          {{ item.logmessage }}
        </a-list-item>
      </template>
    </a-list>

    <div class="settingspace"></div>
    <div class="settingrow">
      <a-button type="outline" size="small" tabindex="-1" @click="handleSaveLogRefresh">刷新</a-button>
      <span style="margin-right: 16px"></span>
      <a-button type="outline" size="small" tabindex="-1" @click="handleSaveLogClear">清空日志</a-button>
      <span style="margin-right: 16px"></span>
      <a-button type="outline" size="small" tabindex="-1" @click="handleSaveLogCopy">复制日志</a-button>
    </div>
  </div>
</template>

<style>
.loglist {
  box-sizing: content-box;
  overflow: hidden;
  border: 1px solid rgba(120, 138, 165, 0.2);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.settings-log-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.settings-log-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(88, 130, 255, 0.12);
  color: var(--color-primary-6);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.settings-log-caption {
  color: var(--color-text-3);
  font-size: 13px;
  line-height: 1.6;
  text-align: right;
}
.loglist .arco-list {
  height: 100%;
  overflow-y: hidden !important;
}
.loglist .arco-list-item {
  padding: 8px 12px !important;
  font-size: 12px;
}
.loglist .arco-list-item-content {
  user-select: text;
  -webkit-user-drag: none;
}
html.dark .loglist {
  border-color: rgba(140, 158, 183, 0.2);
  background: rgba(28, 34, 45, 0.55);
}
html.dark .settings-log-kicker {
  background: rgba(120, 160, 255, 0.2);
  color: #dbe6ff;
}
html.dark .settings-log-caption {
  color: rgba(236, 242, 255, 0.62);
}
</style>

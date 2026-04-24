<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../store'
import SettingPlay from './SettingPlay.vue'
import SettingPan from './SettingPan.vue'
import SettingUI from './SettingUI.vue'
import SettingAccount from './SettingAccount.vue'
import SettingDown from './SettingDown.vue'
import SettingDebug from './SettingDebug.vue'
import SettingUpload from './SettingUpload.vue'
import SettingAria from './SettingAria.vue'
import SettingLog from './SettingLog.vue'
import SettingProxy from './SettingProxy.vue'
import SettingWebDav from './SettingWebDav.vue'
import SettingSecurity from './SettingSecurity.vue'

const appStore = useAppStore()

let observer: any

const hideSetting = computed(() => appStore.appTab !== 'setting')

onMounted(() => {
  const root = document.getElementById('SettingObserver')
  if (!root) return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.length > 0 && entries[0].isIntersecting) {
        appStore.toggleTabSetting('setting', entries[0].target.id)
      }
    },
    {
      root,
      threshold: 0.5
    }
  )

  const sectionIds = [
    'SettingUI',
    'SettingAccount',
    'SettingSecurity',
    'SettingPlay',
    'SettingPan',
    'SettingDown',
    'SettingUpload',
    'SettingWebDav',
    'SettingDebug',
    'SettingProxy',
    'SettingAria',
    'SettingLog'
  ]

  sectionIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element instanceof Element) {
      observer.observe(element)
    }
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <a-layout class="settings-shell">
    <a-layout-sider hide-trigger :width="188" class="xbyleft settings-sider" tabindex="-1" @keydown.tab.prevent="() => true">
      <div class='headdesc settings-side-title'>
        <span class="settings-side-kicker">Preferences</span>
        <strong>设置中心</strong>
        <small>统一管理应用、播放、网盘、安全和网络能力</small>
      </div>
      <a-menu :selected-keys="[appStore.GetAppTabMenu]" :style="{ width: '100%' }" class="xbyleftmenu"
              @update:selected-keys="appStore.toggleTabMenu('setting', $event[0])">
        <a-menu-item key="SettingUI">
          <template #icon><i class="iconfont iconui" /></template>
          应用设置
        </a-menu-item>
        <a-menu-item key="SettingAccount">
          <template #icon><i class="iconfont iconrobot" /></template>
          账户设置
        </a-menu-item>
        <a-menu-item key="SettingSecurity">
          <template #icon><i class="iconfont iconchrome" /></template>
          安全设置
        </a-menu-item>
        <a-menu-item key="SettingPlay">
          <template #icon><i class="iconfont iconshipin" /></template>
          在线预览
        </a-menu-item>
        <a-menu-item key="SettingPan">
          <template #icon><i class="iconfont iconfile-folder" /></template>
          网盘设置
        </a-menu-item>
        <a-menu-item key="SettingDown">
          <template #icon><i class="iconfont icondownload" /></template>
          下载文件
        </a-menu-item>
        <a-menu-item key="SettingUpload">
          <template #icon><i class="iconfont iconupload" /></template>
          上传文件
        </a-menu-item>
        <a-menu-item key='SettingWebDav'>
          <template #icon><i class='iconfont iconchuanshu2' /></template>
          WebDav
        </a-menu-item>
        <a-menu-item key="SettingDebug">
          <template #icon><i class="iconfont iconlogoff" /></template>
          高级选项
        </a-menu-item>
        <a-menu-item key="SettingProxy">
          <template #icon><i class="iconfont iconyuanduanfuzhi" /></template>
          网络代理
        </a-menu-item>
        <a-menu-item key="SettingAria">
          <template #icon><i class="iconfont iconchuanshu" /></template>
          远程Aria
        </a-menu-item>
        <a-menu-item key="SettingLog">
          <template #icon><i class="iconfont icondebug" /></template>
          运行日志
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout-content id="SettingObserver" class="xbyright fullscroll settings-content" tabindex="-1" @keydown.tab.prevent="() => true">
      <div id="SettingDiv" class="settings-content-inner">
<!--        <div class="settings-hero">-->
<!--          <div>-->
<!--            <div class="settings-hero-kicker">BoxPlayer Workspace</div>-->
<!--            <h2>按照你的使用方式定制整个 App</h2>-->
<!--            <p>从界面风格到播放方式、从网盘策略到安全控制，所有配置集中在这里完成。</p>-->
<!--          </div>-->
<!--          <div class="settings-hero-meta">-->
<!--            <span>12 个模块</span>-->
<!--            <span>即时生效</span>-->
<!--          </div>-->
<!--        </div>-->

        <section id="SettingUI" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">应用设置</a-divider>
          </div>
          <SettingUI />
        </section>
<!--        <div id="SettingAccount">-->
<!--          <div>-->
<!--            <a-divider :size="2" orientation="center" class="settinghr">账户设置</a-divider>-->
<!--          </div>-->
<!--          <SettingAccount />-->
<!--        </div>-->
        <section id="SettingSecurity" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">安全设置</a-divider>
          </div>
          <SettingSecurity />
        </section>
        <section id="SettingPlay" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">在线预览</a-divider>
          </div>
          <SettingPlay />
        </section>
        <section id="SettingPan" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">网盘设置</a-divider>
          </div>
          <SettingPan />
        </section>
        <section id="SettingDown" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">下载文件</a-divider>
          </div>
          <SettingDown />
        </section>

        <section id="SettingUpload" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">上传文件</a-divider>
          </div>
          <SettingUpload />
        </section>
        <section id='SettingWebDav' class="settings-section">
          <div>
            <a-divider :size="2" orientation='center' class='settinghr'>WebDav</a-divider>
          </div>
          <SettingWebDav />
        </section>
        <section id="SettingDebug" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">高级选项</a-divider>
          </div>
          <SettingDebug />
        </section>
        <section id="SettingProxy" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">网络代理</a-divider>
          </div>
          <SettingProxy />
        </section>
        <section id="SettingAria" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">远程Aria</a-divider>
          </div>
          <SettingAria />
        </section>
        <section id="SettingLog" class="settings-section">
          <div>
            <a-divider :size="2" orientation="center" class="settinghr">运行日志</a-divider>
          </div>
          <div v-if="hideSetting" style="min-height: 602px"></div>
          <SettingLog v-else />
        </section>
        <div style="height: 28px"></div>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<style>
.settings-shell {
  height: 100%;
  background:
    radial-gradient(circle at top left, rgba(106, 154, 255, 0.18), transparent 24%),
    radial-gradient(circle at top right, rgba(255, 197, 122, 0.14), transparent 22%),
    linear-gradient(180deg, #f5f7fb 0%, #eef2f7 100%);
}

#SettingObserver {
  background: transparent;
  padding: 0 26px 0 18px !important;
}

.settings-sider {
  padding: 20px 16px 20px 20px;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(249, 251, 255, 0.84), rgba(239, 244, 252, 0.74)) !important;
  border-right: 1px solid rgba(148, 163, 184, 0.14);
  backdrop-filter: blur(26px) saturate(140%);
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.58),
    12px 0 32px rgba(148, 163, 184, 0.08);
}

.settings-side-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 2px 4px 18px;
  padding: 16px 16px 18px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.74), transparent 46%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(241, 246, 255, 0.68));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow:
    0 20px 42px rgba(86, 104, 136, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.settings-side-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6d7c95;
}

.settings-side-title strong {
  font-size: 24px;
  line-height: 1.15;
  color: #162033;
}

.settings-side-title small {
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
}

.settings-content {
  padding-block: 18px 28px !important;
}

.settings-content-inner {
  position: relative;
  width: min(1180px, 100%);
  margin: 0 auto;
}

.settings-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 2px 0 26px;
  padding: 24px 28px;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, rgba(109, 154, 255, 0.2), transparent 26%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(245, 248, 255, 0.66));
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 24px 48px rgba(78, 97, 128, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(24px) saturate(130%);
}

.settings-hero-kicker {
  margin-bottom: 8px;
  color: #5670a5;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.settings-hero h2 {
  margin: 0;
  color: #182237;
  font-size: 34px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.settings-hero p {
  max-width: 720px;
  margin: 10px 0 0;
  color: #68758b;
  font-size: 15px;
  line-height: 1.8;
}

.settings-hero-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-hero-meta span {
  padding: 8px 14px;
  border-radius: 999px;
  color: #2b3a59;
  font-size: 13px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.86);
}

.settings-section {
  position: relative;
}

.settinghr {
  margin: 30px 0 22px !important;
  user-select: none;
}

.settingcard {
  padding: 26px 28px;
  margin: 18px 0;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(246, 249, 255, 0.62));
  border: 1px solid rgba(255, 255, 255, 0.88);
  user-select: none;
  -webkit-user-drag: none;
  box-shadow:
    0 18px 40px rgba(78, 97, 128, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(22px) saturate(135%);
}

.settingcard .iconbulb,
.settingrow .iconbulb {
  display: inline-block;
  height: 26px;
  width: 26px;
  margin-left: 8px;
  border-radius: 999px;
  color: #b7791f;
  font-size: 16px;
  line-height: 26px;
  text-align: center;
  background: rgba(255, 196, 82, 0.18);
  cursor: help;
}

.settinghead {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  width: 100%;
  margin-bottom: 12px;
  padding: 0 0 14px 0;
  color: #1a2740;
  font-size: 17px;
  line-height: 1.45;
  font-weight: 800;
  user-select: none;
  word-break: keep-all;
}

.settinghead > :deep(*) {
  flex: 0 0 auto;
}

.settinghead::after {
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
  width: 112px;
  max-width: 100%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.78), rgba(125, 211, 252, 0.22));
  opacity: 0.9;
  content: '';
}

.settingrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
  max-width: 760px;
  margin-right: auto;
  color: #4b5565;
  line-height: 1.75;
}

.settingspace {
  height: 22px;
  user-select: none;
}

.hrspace {
  padding-top: 8px;
}

.opred {
  padding: 0 2px;
  color: rgb(223, 86, 89);
  background: rgba(223, 86, 89, 0.1);
}

.oporg {
  padding: 0 2px;
  color: rgb(255, 111, 0);
  background: rgba(255, 111, 0, 0.1);
}

.opblue {
  padding: 0 2px;
  color: rgb(30, 136, 229);
  background: rgba(30, 136, 229, 0.1);
}

.arco-popover-content hr {
  opacity: 0.2;
  border-top: none;
}

.xbyleftmenu {
  padding: 10px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.56), rgba(245, 248, 255, 0.42));
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 18px 36px rgba(105, 124, 154, 0.08);
}

.xbyleftmenu .arco-menu-inner {
  padding: 0 !important;
}

.xbyleftmenu .arco-menu-item {
  position: relative;
  height: 48px;
  margin-bottom: 6px !important;
  padding: 0 14px !important;
  border-radius: 18px;
  color: #4f5f79;
  font-weight: 800;
  letter-spacing: 0.01em;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.xbyleftmenu .arco-menu-item:hover {
  background: rgba(255, 255, 255, 0.72) !important;
  color: #1f2f4c !important;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.12);
  transform: translateX(2px);
}

.xbyleftmenu .arco-menu-selected {
  background:
    linear-gradient(135deg, rgba(191, 219, 254, 0.9), rgba(255, 255, 255, 0.92)) !important;
  color: #1d4ed8 !important;
  box-shadow:
    0 14px 28px rgba(82, 140, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.xbyleftmenu .arco-menu-selected::before {
  position: absolute;
  left: 10px;
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #3b82f6, #60a5fa);
  content: '';
}

.xbyleftmenu .arco-menu-icon {
  font-size: 17px;
  margin-right: 12px !important;
  opacity: 0.92;
}

.settingcard .arco-input-wrapper,
.settingcard .arco-input,
.settingcard .arco-select-view,
.settingcard .arco-textarea-wrapper,
.settingcard .arco-input-number,
.settingcard .arco-picker,
.settingcard .arco-picker-size-medium,
.settingcard .arco-input-group-wrapper,
.settingcard .arco-input-search {
  border-radius: 16px !important;
}

.settingcard .arco-input-wrapper,
.settingcard .arco-select-view,
.settingcard .arco-textarea-wrapper,
.settingcard .arco-input-number,
.settingcard .arco-picker,
.settingcard .arco-picker-size-medium {
  background: rgba(255, 255, 255, 0.66) !important;
  border-color: rgba(148, 163, 184, 0.22) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.settingcard .arco-btn {
  border-radius: 14px;
  font-weight: 700;
}

.settingcard .arco-radio-group-button .arco-radio-button {
  border-radius: 14px;
  margin-right: 8px;
  border-color: rgba(148, 163, 184, 0.18);
}

.settingcard .arco-radio-group-button .arco-radio-button-content {
  font-weight: 700;
}

.settingcard .arco-switch {
  transform: translateY(1px);
}

.settingcard .arco-divider-text {
  padding: 0 14px;
  color: #2a3a56;
  font-size: 18px;
  font-weight: 800;
  background: transparent;
}

.settingcard .arco-divider-line {
  border-color: rgba(148, 163, 184, 0.18);
}

body[arco-theme='dark'] .settings-shell {
  background:
    radial-gradient(circle at top left, rgba(74, 108, 179, 0.26), transparent 24%),
    radial-gradient(circle at top right, rgba(155, 116, 54, 0.18), transparent 22%),
    linear-gradient(180deg, #0e131a 0%, #121822 100%);
}

body[arco-theme='dark'] .settings-sider {
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(28, 32, 42, 0.9), rgba(20, 24, 33, 0.84)) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.04),
    12px 0 30px rgba(0, 0, 0, 0.22) !important;
  backdrop-filter: blur(24px) saturate(135%);
}

body[arco-theme='dark'] .settings-side-title {
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.08), transparent 42%),
    linear-gradient(180deg, rgba(28, 32, 42, 0.92), rgba(20, 24, 33, 0.86)) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
}

body[arco-theme='dark'] .settings-hero,
body[arco-theme='dark'] .settingcard {
  background: rgba(18, 24, 34, 0.74) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
}

body[arco-theme='dark'] .xbyleftmenu {
  background:
    linear-gradient(180deg, rgba(28, 32, 42, 0.92), rgba(20, 24, 33, 0.88)) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 36px rgba(0, 0, 0, 0.24) !important;
  backdrop-filter: blur(22px) saturate(130%);
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu {
  background: transparent !important;
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu-inner {
  background: transparent !important;
}

body[arco-theme='dark'] .settings-side-kicker,
body[arco-theme='dark'] .settings-side-title small,
body[arco-theme='dark'] .settings-hero-kicker,
body[arco-theme='dark'] .settings-hero p,
body[arco-theme='dark'] .settingrow {
  color: rgba(191, 201, 216, 0.76) !important;
}

body[arco-theme='dark'] .settings-side-title strong,
body[arco-theme='dark'] .settings-hero h2,
body[arco-theme='dark'] .settinghead,
body[arco-theme='dark'] .settingcard .arco-divider-text,
body[arco-theme='dark'] .xbyleftmenu .arco-menu-item {
  color: rgba(244, 247, 252, 0.96) !important;
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu-item {
  background:
    linear-gradient(180deg, rgba(34, 38, 50, 0.72), rgba(25, 29, 39, 0.64)) !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 10px 24px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(20px) saturate(125%);
}

body[arco-theme='dark'] .settinghead::after {
  background: linear-gradient(90deg, rgba(129, 176, 255, 0.9), rgba(110, 231, 255, 0.24));
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu-item:hover {
  background:
    linear-gradient(180deg, rgba(42, 48, 62, 0.8), rgba(29, 34, 46, 0.72)) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 28px rgba(0, 0, 0, 0.2);
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu-selected {
  background:
    linear-gradient(135deg, rgba(31, 54, 96, 0.88), rgba(20, 30, 52, 0.8)) !important;
  border-color: rgba(96, 165, 250, 0.16) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 14px 30px rgba(37, 99, 235, 0.18) !important;
}

body[arco-theme='dark'] .xbyleftmenu .arco-menu-selected::before {
  background: linear-gradient(180deg, #60a5fa, #93c5fd);
}

body[arco-theme='dark'] .settingcard .arco-input-wrapper,
body[arco-theme='dark'] .settingcard .arco-select-view,
body[arco-theme='dark'] .settingcard .arco-textarea-wrapper,
body[arco-theme='dark'] .settingcard .arco-input-number,
body[arco-theme='dark'] .settingcard .arco-picker,
body[arco-theme='dark'] .settingcard .arco-picker-size-medium {
  background: rgba(255, 255, 255, 0.04) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

@media (max-width: 1080px) {
  .settings-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  #SettingObserver {
    padding: 0 16px !important;
  }

  .settingrow {
    max-width: 100%;
  }
}
</style>

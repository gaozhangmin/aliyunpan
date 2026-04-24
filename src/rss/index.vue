<script setup lang="ts">
import { useAppStore } from '../store'
import usePanTreeStore from '../pan/pantreestore'
import { computed, watch } from 'vue'
import { isAliyunUser } from '../aliapi/utils'
import RssScanClean from './rssscanclean/RssScanClean.vue'
import AppSame from './appsame/AppSame.vue'
import RssXiMa from './rssxima/RssXiMa.vue'
import RssScanSame from './rssscansame/RssScanSame.vue'
import RssScanPunish from './rssscanpunish/RssScanPunish.vue'
import RssScanEnmpty from './rssscanenmpty/RssScanEnmpty.vue'
import RssUserCopy from './rssusercopy/RssUserCopy.vue'
import RssJiaMi from './rssjiami/RssJiaMi.vue'
import RssDriveCopy from './rssdrivecopy/RssDriveCopy.vue'
import RssRename from './rssrename/RssRename.vue'

const appStore = useAppStore()
const panTreeStore = usePanTreeStore()
const isAliyunAccount = computed(() => isAliyunUser(panTreeStore.user_id || ''))
const aliyunOnlyMenus = new Set(['AppSame', 'RssScanClean', 'RssScanSame', 'RssScanPunish', 'RssScanEnmpty', 'RssDriveCopy'])

watch(
  () => [isAliyunAccount.value, appStore.GetAppTabMenu],
  ([isAliyun]) => {
    if (!isAliyun && aliyunOnlyMenus.has(appStore.GetAppTabMenu)) {
      appStore.toggleTabMenu('rss', 'RssXiMa')
    }
  },
  { immediate: true }
)
</script>

<template>
  <a-layout style="height: 100%">
    <a-layout-sider hide-trigger :width="208" class="xbyleft rss-sider">
      <div class="headdesc">好玩的插件</div>
      <a-menu :style="{ width: '100%' }" class="xbyleftmenu rss-leftmenu"
              :selected-keys="[appStore.GetAppTabMenu]"
              @update:selected-keys="appStore.toggleTabMenu('rss', $event[0])">
        <a-menu-item key="RssXiMa">
          <template #icon><i class="iconfont iconcameraadd" /></template>
          视频文件洗码
        </a-menu-item>
        <a-menu-item key="RssJiaMi">
          <template #icon><i class="iconfont iconsafebox" /></template>
          文件加密解密
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="AppSame">
          <template #icon><i class="iconfont iconcopy" /></template>
          重复文件清理
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="RssScanClean">
          <template #icon><i class="iconfont iconclear" /></template>
          扫描大文件
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="RssScanSame">
          <template #icon><i class="iconfont iconcopy" /></template>
          扫描重复文件
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="RssScanPunish">
          <template #icon><i class="iconfont iconweixiang" /></template>
          扫描违规文件
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="RssScanEnmpty">
          <template #icon><i class="iconfont iconempty" /></template>
          扫描空文件夹
        </a-menu-item>
        <a-menu-item v-if="isAliyunAccount" key="RssDriveCopy">
          <template #icon><i class="iconfont iconchuanshu2" /></template>
          网盘相册间复制
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout-content>
      <a-tabs type="text" :direction="'horizontal'" class="hidetabs" :justify="true" :active-key="appStore.GetAppTabMenu">
        <a-tab-pane key="RssXiMa" title="1"><RssXiMa /></a-tab-pane>
        <a-tab-pane key="RssRename" title="2"><RssRename /></a-tab-pane>
        <a-tab-pane key="RssJiaMi" title="3"><RssJiaMi /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="AppSame" title="4"><AppSame /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="RssScanClean" title="5"><RssScanClean /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="RssScanSame" title="6"><RssScanSame /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="RssScanPunish" title="7"><RssScanPunish /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="RssScanEnmpty" title="8"><RssScanEnmpty /></a-tab-pane>
        <a-tab-pane v-if="isAliyunAccount" key="RssDriveCopy" title="9"><RssDriveCopy /></a-tab-pane>
        <a-tab-pane key="RssUserCopy" title="10"><RssUserCopy /></a-tab-pane>
      </a-tabs>
    </a-layout-content>
  </a-layout>
</template>

<style>
.iconnode-tree1,
.iconshuzhuangtu {
  opacity: 0.8;
}

.rss-sider {
  min-width: 208px;
}

.rss-leftmenu .arco-menu-item {
  padding-right: 14px !important;
}
</style>

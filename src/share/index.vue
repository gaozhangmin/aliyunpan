<script setup lang='ts'>
import ShareSiteRight from './share/ShareSiteRight.vue'
import MyShareRight from './share/MyShareRight.vue'
import MyTransferShareRight from './share/MyTransferShareRight.vue'
import OtherShareRight from './share/OtherShareRight.vue'
import MyFollowingRight from './following/MyFollowingRight.vue'
import OtherFollowingRight from './following/OtherFollowingRight.vue'

import { useAppStore, useUserStore } from '../store'
import ShareDAL from './share/ShareDAL'
import FollowingDAL from './following/FollowingDAL'
import { ref } from 'vue'
import ShareHistoryRight from './share/ShareHistoryRight.vue'
import ShareBottleFishRight from './share/ShareBottleFishRight.vue'

const appStore = useAppStore()
const hideLeft = ref(false)

appStore.$subscribe(() => {
  const appPage = appStore.GetAppTabMenu

  if (appPage == 'ShareSiteRight') ShareDAL.aLoadShareSite()
  if (appPage == 'MyShareRight') ShareDAL.aReloadMyShare(useUserStore().user_id, false)
  if (appPage == 'ShareHistoryRight') ShareDAL.aReloadShareHistory(useUserStore().user_id, false)
  if (appPage == 'MyTransferShareRight') ShareDAL.aReloadMyTransferShare(useUserStore().user_id, false)
  if (appPage == 'ShareBottleFishRight') ShareDAL.aReloadShareBottleFish(useUserStore().user_id, false)
  if (appPage == 'MyFollowingRight') FollowingDAL.aReloadMyFollowing(useUserStore().user_id, false)
  if (appPage == 'OtherFollowingRight') FollowingDAL.aReloadOtherFollowingList(useUserStore().user_id, false)
})

const handleHideLeft = (val: boolean) => {
  hideLeft.value = val
}
</script>

<template>
  <a-layout style='height: 100%'>
    <a-layout-sider hide-trigger :width='158' class='xbyleft' :hidden='hideLeft'>
      <div class='headdesc'>阿里云盘分享</div>
      <a-menu :selected-keys='[appStore.GetAppTabMenu]' :style="{ width: '100%' }" class='xbyleftmenu'
              @update:selected-keys="appStore.toggleTabMenu('share', $event[0])">
        <a-menu-item key='ShareSiteRight'>
          <template #icon><i class='iconfont iconrvip' /></template>
          资源网站
        </a-menu-item>
        <a-menu-item key='OtherShareRight'>
          <template #icon><i class='iconfont iconfenxiang1' /></template>
          我的导入
        </a-menu-item>
        <a-menu-item key='ShareHistoryRight'>
          <template #icon><i class='iconfont iconfenxiang1' /></template>
          历史导入
        </a-menu-item>
        <a-menu-item key='MyShareRight'>
          <template #icon><i class='iconfont iconfenxiang' /></template>
          我的分享
        </a-menu-item>
        <a-menu-item key='MyTransferShareRight'>
          <template #icon><i class='iconfont iconfenxiang' /></template>
          我的快传
        </a-menu-item>
        <a-menu-item key='ShareBottleFishRight'>
          <template #icon><i class='iconfont icontuijian' /></template>
          好运分享
        </a-menu-item>
        <a-menu-item key='MyFollowingRight'>
          <template #icon><i class='iconfont icondingyue' /></template>
          我的订阅
        </a-menu-item>
        <a-menu-item key='OtherFollowingRight'>
          <template #icon><i class='iconfont icontuijian' /></template>
          订阅推荐
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout-content class='xbyright'>
      <a-tabs :type="'text'" :direction="'horizontal'" class='hidetabs' :justify='true'
              :active-key='appStore.GetAppTabMenu'>
        <a-tab-pane key='ShareSiteRight' title='1'>
          <ShareSiteRight @hide-left='handleHideLeft' />
        </a-tab-pane>
        <a-tab-pane key='OtherShareRight' title='2'>
          <OtherShareRight />
        </a-tab-pane>
        <a-tab-pane key='MyShareRight' title='3'>
          <MyShareRight />
        </a-tab-pane>
        <a-tab-pane key='ShareHistoryRight' title='3'>
          <ShareHistoryRight />
        </a-tab-pane>
        <a-tab-pane key='MyTransferShareRight' title='4'>
          <MyTransferShareRight />
        </a-tab-pane>
        <a-tab-pane key='ShareBottleFishRight' title='5'>
          <ShareBottleFishRight />
        </a-tab-pane>
        <a-tab-pane key='MyFollowingRight' title='5'>
          <MyFollowingRight />
        </a-tab-pane>
        <a-tab-pane key='OtherFollowingRight' title='6'>
          <OtherFollowingRight />
        </a-tab-pane>
      </a-tabs>
    </a-layout-content>
  </a-layout>
</template>

<style></style>

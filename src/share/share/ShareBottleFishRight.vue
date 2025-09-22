<script setup lang="ts">
import { ref } from 'vue'
import { KeyboardState, useAppStore, useKeyboardStore, useUserStore, useWinStore } from '../../store'
import ShareDAL from './ShareDAL'
import {
  onHideRightMenuScroll,
  onShowRightMenu,
  TestCtrl,
  TestKey,
  TestKeyboardScroll,
  TestKeyboardSelect
} from '../../utils/keyboardhelper'
import { copyToClipboard, openExternal } from '../../utils/electronhelper'
import message from '../../utils/message'

import { Tooltip as AntdTooltip } from 'ant-design-vue'
import { modalShowShareLink } from '../../utils/modal'
import { GetShareUrlFormate } from '../../utils/shareurl'
import useShareBottleFishStore from './ShareBottleFishStore'

const viewlist = ref()
const inputsearch = ref()

const appStore = useAppStore()
const winStore = useWinStore()
const shareBottleFishStore = useShareBottleFishStore()

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (appStore.appTab != 'share' || appStore.GetAppTabMenu != 'ShareBottleFishRight') return
  if (TestCtrl('a', state.KeyDownEvent, () => shareBottleFishStore.mSelectAll())) return
  if (TestCtrl('b', state.KeyDownEvent, handleBrowserLink)) return
  if (TestCtrl('c', state.KeyDownEvent, handleCopySelectedLink)) return
  if (TestCtrl('f', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f3', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey(' ', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f5', state.KeyDownEvent, handleRefresh)) return
  if (TestKeyboardSelect(state.KeyDownEvent, viewlist.value, shareBottleFishStore, handleOpenLink)) return
  if (TestKeyboardScroll(state.KeyDownEvent, viewlist.value, shareBottleFishStore)) return
})

const handleRefresh = () => ShareDAL.aReloadShareBottleFish(useUserStore().user_id, true)
const handleSelectAll = () => shareBottleFishStore.mSelectAll()
const handleOrder = (order: string) => shareBottleFishStore.mOrderListData(order)
const handleSelect = (shareId: string, event: any, isCtrl: boolean = false) => {
  onHideRightMenuScroll()
  shareBottleFishStore.mMouseSelect(shareId, event.ctrlKey || isCtrl, event.shiftKey)
}

const handleOpenLink = (share: any) => {
  if (share && share.shareId) {
    // donothing
  } else {
    share = shareBottleFishStore.GetSelectedFirst()
  }
  if (!share.shareId) {
    message.error('没有选中分享链接！')
  } else {
    modalShowShareLink(share.shareId, share.share_pwd, '', true, [])
  }
}
const handleCopySelectedLink = () => {
  const list = shareBottleFishStore.GetSelected()
  let link = ''
  for (let i = 0, maxi = list.length; i < maxi; i++) {
    const item = list[i]
    link += GetShareUrlFormate(item.share_name, 'https://www.aliyundrive.com/s/' + item.shareId, '') + '\n'
  }
  if (list.length == 0) {
    message.error('没有选中分享链接！')
  } else {
    copyToClipboard(link)
    message.success('分享链接已复制到剪切板(' + list.length.toString() + ')')
  }
}
const handleBrowserLink = () => {
  const first = shareBottleFishStore.GetSelectedFirst()
  if (!first) return
  if (first.shareId) {
    openExternal('https://www.aliyundrive.com/s/' + first.shareId)
  }
}

const handleSearchInput = (value: string) => {
  shareBottleFishStore.mSearchListData(value)
  viewlist.value.scrollIntoView(0)
}
const handleSearchEnter = (event: any) => {
  event.target.blur()
  viewlist.value.scrollIntoView(0)
}
const handleRightClick = (e: { event: MouseEvent; node: any }) => {
  const key = e.node.key
  if (!shareBottleFishStore.ListSelected.has(key)) shareBottleFishStore.mMouseSelect(key, false, false)
  onShowRightMenu('rightsharebottlefishmenu', e.event.clientX, e.event.clientY)
}
</script>

<template>
  <div style="height: 7px"></div>
  <div class='toppanbtns' style='height: 26px'>
    <div style="min-height: 26px; max-width: 100%; flex-shrink: 0; flex-grow: 0">
      <div class="toppannav">
        <div class="toppannavitem" title="好运分享">
          <span> 好运分享 </span>
        </div>
      </div>
    </div>
    <div class='flex flexauto'></div>
  </div>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :loading="shareBottleFishStore.ListLoading" title="F5"
                @click="handleRefresh">
        <template #icon>
          <i class="iconfont iconreload-1-icon" />
        </template>
        刷新
      </a-button>
    </div>
    <div v-show="shareBottleFishStore.IsListSelected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+O" @click="handleOpenLink">
        <i class="iconfont iconchakan" />查看
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+C" @click="handleCopySelectedLink">
        <i class="iconfont iconcopy" />复制链接
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+B" @click="handleBrowserLink">
        <i class="iconfont iconchrome" />浏览器
      </a-button>
    </div>
    <div style="flex-grow: 1"></div>
    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search ref="inputsearch" tabindex="-1" size="small" title="Ctrl+F / F3 / Space" placeholder="快速筛选"
                      v-model="shareBottleFishStore.ListSearchKey" allow-clear
                      @clear='(e:any)=>handleSearchInput("")'
                      @input="(val:any)=>handleSearchInput(val as string)"
                      @press-enter="handleSearchEnter"
                      @keydown.esc=";($event.target as any).blur()" />
    </div>
    <div></div>
  </div>
  <div style="height: 9px"></div>
  <div class="toppanarea">
    <div style="margin: 0 3px">
      <AntdTooltip title="点击全选" placement="left">
        <a-button shape="circle" type="text" tabindex="-1" class="select all" title="Ctrl+A" @click="handleSelectAll">
          <i :class="shareBottleFishStore.IsListSelectedAll ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class="selectInfo">{{ shareBottleFishStore.ListDataSelectCountInfo }}</div>

    <div style="flex-grow: 1"></div>
    <div :class="'cell sharetime'">
      是否保存
    </div>
    <div :class="'cell sharetime order ' + (shareBottleFishStore.ListOrderKey == 'mtime' ? 'active' : '')" @click="handleOrder('mtime')">
      修改时间
      <i class="iconfont iconxia" />
    </div>
    <div class="cell pr"></div>
  </div>
  <div class="toppanlist" @keydown.space.prevent="() => true">
    <a-list
      ref="viewlist"
      :bordered="false"
      :split="false"
      :max-height="winStore.GetListHeightNumber"
      :virtual-list-props="{
        height: winStore.GetListHeightNumber,
        fixedSize: true,
        estimatedSize: 50,
        threshold: 1,
        itemKey: 'shareId'
      }"
      style="width: 100%"
      :data="shareBottleFishStore.ListDataShow"
      tabindex="-1"
      @scroll="onHideRightMenuScroll">
      <template #empty>
        <a-empty description="没导入过任何分享链接" />
      </template>
      <template #item="{ item, index }">
        <div :key="item.shareId" class="listitemdiv">
          <div
            :class="'fileitem' + (shareBottleFishStore.ListSelected.has(item.shareId) ? ' selected' : '') + (shareBottleFishStore.ListFocusKey == item.shareId ? ' focus' : '')"
            @click="handleSelect(item.shareId, $event)"
            @contextmenu="(event:MouseEvent)=>handleRightClick({event,node:{key:item.shareId}} )">
            <div style="margin: 2px">
              <a-button shape="circle" type="text" tabindex="-1" class="select" :title="index"
                        @click.prevent.stop="handleSelect(item.shareId, $event, true)">
                <i
                  :class="shareBottleFishStore.ListSelected.has(item.shareId) ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
              </a-button>
            </div>
            <div class="fileicon">
              <i class="iconfont iconlink2" aria-hidden="true"></i>
            </div>
            <div class="filename">
              <div :title="'https://www.aliyundrive.com/s/' + item.shareId" @click="handleOpenLink(item)">
                {{ item.share_name }}
              </div>
            </div>
            <div class="cell sharestate active">{{ item.saved_msg }}</div>
            <div class="cell sharetime">{{ item.gmt_created }}</div>
          </div>
        </div>
      </template>
    </a-list>

    <a-dropdown id="rightsharebottlefishmenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
      <template #content>
        <a-doption @click="handleOpenLink">
          <template #icon><i class="iconfont iconchakan" /></template>
          <template #default>查看</template>
        </a-doption>

        <a-doption @click="handleCopySelectedLink">
          <template #icon><i class="iconfont iconcopy" /></template>
          <template #default>复制链接</template>
        </a-doption>
        <a-doption @click="handleBrowserLink">
          <template #icon><i class="iconfont iconchrome" /></template>
          <template #default>浏览器</template>
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<style></style>

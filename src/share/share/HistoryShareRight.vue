<script setup lang="ts">
import { ref } from 'vue'
import {
  useAppStore,
  useKeyboardStore,
  KeyboardState,
  useWinStore,
  useUserStore
} from '../../store'
import ShareDAL from './ShareDAL'
import { onShowRightMenu, onHideRightMenuScroll, TestCtrl, TestKey, TestKeyboardScroll, TestKeyboardSelect } from '../../utils/keyboardhelper'
import { copyToClipboard, openExternal } from '../../utils/electronhelper'
import message from '../../utils/message'

import { Tooltip as AntdTooltip } from 'ant-design-vue'

import { modalShowShareLink } from '../../utils/modal'
import { GetShareUrlFormate } from '../../utils/shareurl'
import useHistoryShareStore from './HistoryShareStore'
import { humanCount } from '../../utils/format'

const daoruModel = ref(false)
const daoruModelLoading = ref(false)
const daoruModelText = ref('')

const viewlist = ref()
const inputsearch = ref()

const appStore = useAppStore()
const winStore = useWinStore()
const historyshareStore = useHistoryShareStore()

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (appStore.appTab != 'share' || appStore.GetAppTabMenu != 'HistoryShareRight') return

  if (TestCtrl('a', state.KeyDownEvent, () => historyshareStore.mSelectAll())) return
  if (TestCtrl('b', state.KeyDownEvent, handleBrowserLink)) return
  if (TestCtrl('c', state.KeyDownEvent, handleCopySelectedLink)) return
  if (TestCtrl('f', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f3', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey(' ', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestCtrl('u', state.KeyDownEvent, handleRefreshStats)) return

  if (TestKey('f5', state.KeyDownEvent, handleRefresh)) return

  if (TestKeyboardSelect(state.KeyDownEvent, viewlist.value, historyshareStore, handleOpenLink)) return
  if (TestKeyboardScroll(state.KeyDownEvent, viewlist.value, historyshareStore)) return
})

const handleRefresh = () => ShareDAL.aReloadHistoryShare(useUserStore().user_id, false)
const handleSelectAll = () => historyshareStore.mSelectAll()
const handleOrder = (order: string) => historyshareStore.mOrderListData(order)
const handleSelect = (share_id: string, event: any, isCtrl: boolean = false) => {
  onHideRightMenuScroll()
  historyshareStore.mMouseSelect(share_id, event.ctrlKey || isCtrl, event.shiftKey)
}

const handleOpenLink = (share: any) => {
  if (share && share.share_id) {
    // donothing
  } else {
    share = historyshareStore.GetSelectedFirst()
  }
  if (!share.share_id) {
    message.error('没有选中分享链接！')
  } else {
    modalShowShareLink(share.share_id, share.share_pwd, '', true, [])
  }
}


const handleCopySelectedLink = () => {
  const list = historyshareStore.GetSelected()
  let link = ''
  for (let i = 0, maxi = list.length; i < maxi; i++) {
    const item = list[i]
    link += GetShareUrlFormate(item.share_name, 'https://www.alipan.com/s/' + item.share_id, '') + '\n'
  }
  if (list.length == 0) {
    message.error('没有选中分享链接！')
  } else {
    copyToClipboard(link)
    message.success('分享链接已复制到剪切板(' + list.length.toString() + ')')
  }
}
const handleBrowserLink = () => {
  const first = historyshareStore.GetSelectedFirst()
  if (!first) return
  if (first.share_id) openExternal('https://www.alipan.com/s/' + first.share_id)
}

const handleSaveDaoRuLink = () => {
  const list = historyshareStore.GetSelected()
  let link = ''
  for (let i = 0, maxi = list.length; i < maxi; i++) {
    const item = list[i]
    link += GetShareUrlFormate(item.share_name, 'https://www.alipan.com/s/' + item.share_id, '') + '\n'
  }
  if (list.length == 0) {
    message.error('没有选中分享链接！')
  } else {
    ShareDAL.SaveOtherShareText(link).then((success: boolean) => {
      daoruModelLoading.value = false
      if (success) {
        daoruModelText.value = ''
        daoruModel.value = false
      }
    })
  }
}
const handleRefreshStats = () => {
  ShareDAL.SaveOtherShareRefresh()
}

const handleSearchInput = (value: string) => {
  historyshareStore.mSearchListData(value)
  viewlist.value.scrollIntoView(0)
}
const handleSearchEnter = (event: any) => {
  event.target.blur()
  viewlist.value.scrollIntoView(0)
}
const handleRightClick = (e: { event: MouseEvent; node: any }) => {
  const key = e.node.key

  if (!historyshareStore.ListSelected.has(key)) historyshareStore.mMouseSelect(key, false, false)
  onShowRightMenu('righthistorysharemenu', e.event.clientX, e.event.clientY)
}
</script>

<template>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :loading="historyshareStore.ListLoading" title="F5" @click="handleRefresh">
        <template #icon>
          <i class="iconfont iconreload-1-icon" />
        </template>
        刷新</a-button
      >
    </div>
    <div v-show="historyshareStore.IsListSelected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+O" @click="handleOpenLink"><i class="iconfont iconchakan" />查看</a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+C" @click="handleCopySelectedLink"><i class="iconfont iconcopy" />复制链接</a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+B" @click="handleBrowserLink"><i class="iconfont iconchrome" />浏览器</a-button>
      <a-button type="text" size="small" tabindex="-1" class="danger" title="Ctrl+N" @click="handleSaveDaoRuLink()"><i class="iconfont icondelete" />一键导入</a-button>
    </div>

    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search ref="inputsearch" tabindex="-1" size="small" title="Ctrl+F / F3 / Space" placeholder="快速筛选" :model-value="historyshareStore.ListSearchKey" @input="(val:any)=>handleSearchInput(val as string)" @press-enter="handleSearchEnter" @keydown.esc=";($event.target as any).blur()" />
    </div>
    <div></div>
  </div>
  <div style="height: 9px"></div>
  <div class="toppanarea">
    <div style="margin: 0 3px">
      <AntdTooltip title="点击全选" placement="left">
        <a-button shape="circle" type="text" tabindex="-1" class="select all" title="Ctrl+A" @click="handleSelectAll">
          <i :class="historyshareStore.IsListSelectedAll ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class="selectInfo" style="min-width: 266px">{{ historyshareStore.ListDataSelectCountInfo }}</div>

    <div style="flex-grow: 1"></div>
    <div :class="'cell sharestate order ' + (historyshareStore.ListOrderKey == 'popularity' ? 'active' : '')" @click="handleOrder('popularity')">
      热度
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count order ' + (historyshareStore.ListOrderKey == 'preview' ? 'active' : '')" @click="handleOrder('preview')">
      浏览数
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count order ' + (historyshareStore.ListOrderKey == 'save' ? 'active' : '')" @click="handleOrder('save')">
      转存数
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count order ' + (historyshareStore.ListOrderKey == 'ctime' ? 'active' : '')" @click="handleOrder('ctime')">
      创建时间
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (historyshareStore.ListOrderKey == 'mtime' ? 'active' : '')" @click="handleOrder('mtime')">
      更新时间
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
        itemKey: 'share_id'
      }"
      style="width: 100%"
      :data="historyshareStore.ListDataShow"
      tabindex="-1"
      @scroll="onHideRightMenuScroll">
      <template #empty><a-empty description="没导入过任何分享链接" /></template>
      <template #item="{ item, index }">
        <div :key="item.share_id" class="listitemdiv">
          <div
            :class="'fileitem' + (historyshareStore.ListSelected.has(item.share_id) ? ' selected' : '') + (historyshareStore.ListFocusKey == item.share_id ? ' focus' : '')"
            @click="handleSelect(item.share_id, $event)"
            @contextmenu="(event:MouseEvent)=>handleRightClick({event,node:{key:item.share_id}} )">
            <div style="margin: 2px">
              <a-button shape="circle" type="text" tabindex="-1" class="select" :title="index" @click.prevent.stop="handleSelect(item.share_id, $event, true)">
                <i :class="historyshareStore.ListSelected.has(item.share_id) ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
              </a-button>
            </div>
            <div class="fileicon">
              <i class="iconfont iconlink2" aria-hidden="true"></i>
            </div>
            <div class="filename">
              <div :title="'https://www.aliyundrive.com/s/' + item.share_id" @click="handleOpenLink(item)">
                {{ item.share_name }}
              </div>
            </div>
            <div v-if="item.is_punished" class="cell sharestate forbidden">分享违规</div>
            <div v-if="item.public" class="cell sharestate forbidden">非公开分享，需要密码访问</div>
            <div v-if="item.status !== 'enabled'" class="cell sharestate forbidden">分享取消</div>
            <div class="cell count">{{ humanCount(item.popularity) }}</div>
            <div class="cell count">{{ humanCount(item.preview_count) }}</div>
            <div class="cell count">{{ humanCount(item.save_count) }}</div>
            <div class="cell sharetime">{{ item.gmt_created.replace(' ', '\n') }}</div>
            <div class="cell sharetime">{{ item.gmt_modified.replace(' ', '\n') }}</div>
          </div>
        </div>
      </template>
    </a-list>

    <a-dropdown id="righthistorysharemenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
      <template #content>
        <a-doption @click="handleOpenLink">
          <template #icon> <i class="iconfont iconchakan" /> </template>
          <template #default>查看</template>
        </a-doption>
        <a-doption @click="handleCopySelectedLink">
          <template #icon> <i class="iconfont iconcopy" /> </template>
          <template #default>复制链接</template>
        </a-doption>
        <a-doption @click="handleBrowserLink">
          <template #icon> <i class="iconfont iconchrome" /> </template>
          <template #default>浏览器</template>
        </a-doption>
        <a-doption @click="handleSaveDaoRuLink">
          <template #icon> <i class="iconfont iconchakan" /> </template>
          <template #default>保存到的我的导入</template>
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<style>
.cellcount {
  align-items: center;
  margin-right: 16px;
}
.cellcount .arco-badge .arco-badge-status-text {
  margin-left: 4px;
  color: var(--color-text-3);
  line-height: 26px;
}
body[arco-theme='dark'] .toppanarea .cell {
  color: rgba(211, 216, 241, 0.45);
}

.cell {
  color: var(--color-text-3);
  overflow: hidden;
  text-align: center;
  flex-grow: 0;
  flex-shrink: 0;
  display: inline-block;
  line-height: 18px;
  min-height: 18px;
  padding: 0 4px;
  justify-content: center;
}

.cell.tiquma {
  width: 60px;
  font-size: 12px;
}
.cell.count {
  width: 70px;
  font-size: 12px;
  line-height: 14px;
  text-align: right;
  word-wrap: break-word;
  word-break: keep-all;
}
.cell.sharetime {
  width: 80px;
  font-size: 12px;
  line-height: 14px;
  text-align: right;
  word-wrap: break-word;
  word-break: keep-all;
}
.cell.sharetime.active {
  color: rgb(217, 48, 37);
}
.cell.sharestate {
  width: 70px;
  font-size: 12px;
}
.cell.sharestate.active {
  color: rgb(var(--primary-6));
}
.cell.sharestate.forbidden {
  color: rgb(217, 48, 37);
}
.cell.sharestate.deleted {
  text-decoration: line-through;
}
.cell.p5 {
  width: 5px;
}
.cell.pr {
  width: 12px;
}

.toppanarea .cell.order {
  cursor: pointer;
}
.toppanarea .cell.order:hover {
  color: rgb(var(--primary-6));
}
</style>

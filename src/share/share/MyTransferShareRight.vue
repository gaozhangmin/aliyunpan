<script setup lang="ts">
import { ref } from 'vue'
import { IAliShareItem } from '../../aliapi/alimodels'
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
import 'ant-design-vue/es/tooltip/style/css'
import { ArrayKeyList } from '../../utils/utils'
import { GetShareUrlFormate } from '../../utils/shareurl'
import useMyTransferShareStore from './MyShareTransferStore'
import AliTransferShare from '../../aliapi/transfershare'

const viewlist = ref()
const inputsearch = ref()

const appStore = useAppStore()
const winStore = useWinStore()
const myTransferShare = useMyTransferShareStore()

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (appStore.appTab != 'share' || appStore.GetAppTabMenu != 'MyTransferShareRight') return

  if (TestCtrl('a', state.KeyDownEvent, () => myTransferShare.mSelectAll())) return
  if (TestCtrl('b', state.KeyDownEvent, handleBrowserLink)) return
  if (TestCtrl('c', state.KeyDownEvent, handleCopySelectedLink)) return
  if (TestCtrl('Delete', state.KeyDownEvent, () => handleDeleteSelectedLink('selected'))) return
  if (TestCtrl('f', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f3', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey(' ', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f5', state.KeyDownEvent, handleRefresh)) return

  if (TestKeyboardSelect(state.KeyDownEvent, viewlist.value, myTransferShare, undefined)) return
  if (TestKeyboardScroll(state.KeyDownEvent, viewlist.value, myTransferShare)) return
})

const handleRefresh = () => ShareDAL.aReloadMyTransferShare(useUserStore().user_id, true)
const handleSelectAll = () => myTransferShare.mSelectAll()
const handleOrder = (order: string) => myTransferShare.mOrderListData(order)
const handleSelect = (share_id: string, event: any, isCtrl: boolean = false) => {
  onHideRightMenuScroll()
  myTransferShare.mMouseSelect(share_id, event.ctrlKey || isCtrl, event.shiftKey)
}

const handleClickName = (share: any) => {
  let list: IAliShareItem[]
  if (share && share.share_id) {
    list = [share]
  } else {
    list = myTransferShare.GetSelected()
  }
  if (list && list.length > 0) handleBrowserLink()
  else {
    message.error('没有选中任何快传链接！')
  }
}

const handleCopySelectedLink = () => {
  const list = myTransferShare.GetSelected()
  let link = ''
  for (let i = 0, maxi = list.length; i < maxi; i++) {
    const item = list[i]
    link += GetShareUrlFormate(item.share_name, item.share_url, item.share_pwd) + '\n'
  }
  if (list.length == 0) {
    message.error('没有选中快传链接！')
  } else {
    copyToClipboard(link)
    message.success('快传链接已复制到剪切板(' + list.length.toString() + ')')
  }
}
const handleBrowserLink = () => {
  const first = myTransferShare.GetSelectedFirst()
  if (!first) return
  if (first.share_url) {
    openExternal(first.share_url)
  }
}
const handleDeleteSelectedLink = (delby: any) => {
  const name = delby == 'selected' ? '取消选中的快传' : delby == 'expired' ? '清理全部过期已失效' : '清理全部文件已删除'
  let list: IAliShareItem[]
  if (delby == 'selected') {
    list = myTransferShare.GetSelected()
  } else {
    list = []
    const allList = myTransferShare.ListDataRaw
    let item: IAliShareItem
    for (let i = 0, maxi = allList.length; i < maxi; i++) {
      item = allList[i]
      if (delby == 'expired') {
        if (item.expired) list.push(item)
      }
    }
  }

  if (list.length == 0) {
    message.error('没有需要清理的快传链接！')
    return
  }

  const selectKeys = ArrayKeyList<string>('share_id', list)
  AliTransferShare.ApiCancelTransferShareBatch(useUserStore().user_id, selectKeys).then((success: string[]) => {
    myTransferShare.mDeleteFiles(success)
    message.success(name + '成功！')
  })
}

const handleSearchInput = (value: string) => {
  myTransferShare.mSearchListData(value)
  viewlist.value.scrollIntoView(0)
}
const handleSearchEnter = (event: any) => {
  event.target.blur()
  viewlist.value.scrollIntoView(0)
}
const handleRightClick = (e: { event: MouseEvent; node: any }) => {
  const key = e.node.key

  if (!myTransferShare.ListSelected.has(key)) myTransferShare.mMouseSelect(key, false, false)
  onShowRightMenu('rightmytransfersharemenu', e.event.clientX, e.event.clientY)
}
</script>

<template>
  <div style="height: 7px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="flex flexauto"></div>
    <div class="flex flexnoauto cellcount" title="2天内过期">
      <a-badge color="#637dff" :text="'临期 ' + myTransferShare.ListStats.expir2day" />
    </div>
    <div class="flex flexnoauto cellcount" title="总过期">
      <a-badge color="#637dff" :text="'过期 ' + myTransferShare.ListStats.expired" />
    </div>
    <div class="flex flexnoauto cellcount" title="总违规">
      <a-badge color="#637dff" :text="'违规 ' + myTransferShare.ListStats.forbidden" />
    </div>
  </div>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :loading="myTransferShare.ListLoading" title="F5" @click="handleRefresh"
        ><template #icon> <i class="iconfont iconreload-1-icon" /> </template
      ></a-button>
    </div>
    <div v-show="myTransferShare.IsListSelected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+O" @click="handleClickName"><i class="iconfont iconchakan" />查看</a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+C" @click="handleCopySelectedLink"><i class="iconfont iconcopy" />复制链接</a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+B" @click="handleBrowserLink"><i class="iconfont iconchrome" />浏览器</a-button>
      <a-button type="text" size="small" tabindex="-1" class="danger" title="Ctrl+Delete" @click="handleDeleteSelectedLink('selected')"><i class="iconfont icondelete" />取消快传</a-button>
    </div>
    <div v-show="!myTransferShare.IsListSelected" class="toppanbtn">
      <a-dropdown trigger="hover" position="bl" @select="handleDeleteSelectedLink">
        <a-button type="text" size="small" tabindex="-1"><i class="iconfont iconrest" />清理全部 <i class="iconfont icondown" /></a-button>

        <template #content>
          <a-doption :value="'expired'" class="danger">删除全部 过期已失效</a-doption>
        </template>
      </a-dropdown>
    </div>
    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search ref="inputsearch" tabindex="-1" size="small" title="Ctrl+F / F3 / Space" placeholder="快速筛选" :model-value="myTransferShare.ListSearchKey" @input="(val:any)=>handleSearchInput(val as string)" @press-enter="handleSearchEnter" @keydown.esc=";($event.target as any).blur()" />
    </div>
    <div></div>
  </div>
  <div style="height: 9px"></div>
  <div class="toppanarea">
    <div style="margin: 0 3px">
      <AntdTooltip title="点击全选" placement="left">
        <a-button shape="circle" type="text" tabindex="-1" class="select all" title="Ctrl+A" @click="handleSelectAll">
          <i :class="myTransferShare.IsListSelectedAll ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class="selectInfo" style="min-width: 266px">{{ myTransferShare.ListDataSelectCountInfo }}</div>

    <div style="flex-grow: 1"></div>
    <div class="cell sharestate" @click="handleOrder('state')">
      有效期
      <i class="iconfont iconxia" />
    </div>
    <div class="cell sharetime" @click="handleOrder('save')">
      保存情况
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (myTransferShare.ListOrderKey == 'time' ? 'active' : '')" @click="handleOrder('time')">
      创建时间
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
      :data="myTransferShare.ListDataShow"
      :loading="myTransferShare.ListLoading"
      tabindex="-1"
      @scroll="onHideRightMenuScroll">
      <template #empty><a-empty description="没创建过任何快传链接" /></template>

      <template #item="{ item, index }">
        <div :key="item.share_id" class="listitemdiv">
          <div :class="'fileitem' + (myTransferShare.ListSelected.has(item.share_id) ? ' selected' : '') + (myTransferShare.ListFocusKey == item.share_id ? ' focus' : '')"
               @click="handleSelect(item.share_id, $event)"
               @contextmenu="(event:MouseEvent)=>handleRightClick({event,node:{key:item.share_id}} )">
            <div style="margin: 2px">
              <a-button shape="circle" type="text" tabindex="-1" class="select" :title="index" @click.prevent.stop="handleSelect(item.share_id, $event, true)">
                <i :class="myTransferShare.ListSelected.has(item.share_id) ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
              </a-button>
            </div>
            <div class="fileicon">
              <i :class="'iconfont ' + item.icon" aria-hidden="true"></i>
            </div>
            <div class="filename">
              <div :title="'https://www.aliyundrive.com/t/' + item.share_id" @click="handleClickName(item)">
                {{ item.share_name }}
              </div>
            </div>
            <div v-if="item.status == 'forbidden'" class="cell sharestate forbidden">分享违规</div>
            <div v-else-if="item.expired" class="cell sharestate expired">过期失效</div>
            <div v-else-if="!item.first_file" class="cell sharestate deleted">文件已删</div>
            <div v-else class="cell sharestate active">{{ item.share_msg }}</div>
            <div class="cell count">{{ item.share_saved }}</div>

            <div class="cell sharetime">{{ item.created_at.replace(' ', '\n') }}</div>
          </div>
        </div>
      </template>
    </a-list>
    <a-dropdown id="rightmytransfersharemenu" class="rightmenu" :popup-visible="true" style="z-index: -1; left: -200px; opacity: 0">
      <template #content>
        <a-doption @click="handleClickName">
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
        <a-doption class="danger" @click="handleDeleteSelectedLink('selected')">
          <template #icon> <i class="iconfont icondelete" /> </template>
          <template #default>取消快传</template>
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

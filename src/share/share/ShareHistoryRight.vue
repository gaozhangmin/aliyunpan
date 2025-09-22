<script setup lang="ts">
import { ref } from 'vue'
import {
  KeyboardState,
  MouseState,
  useAppStore,
  useKeyboardStore,
  useMouseStore,
  useUserStore,
  useWinStore
} from '../../store'
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
import useShareHistoryStore from './ShareHistoryStore'
import AliShare from '../../aliapi/share'
import { TestButton } from '../../utils/mosehelper'
import { xorWith } from 'lodash'

const viewlist = ref()
const inputsearch = ref()

const appStore = useAppStore()
const winStore = useWinStore()
const shareHistoryStore = useShareHistoryStore()

const keyboardStore = useKeyboardStore()
keyboardStore.$subscribe((_m: any, state: KeyboardState) => {
  if (appStore.appTab != 'share' || appStore.GetAppTabMenu != 'ShareHistoryRight') return
  if (TestCtrl('a', state.KeyDownEvent, () => shareHistoryStore.mSelectAll())) return
  if (TestCtrl('b', state.KeyDownEvent, handleBrowserLink)) return
  if (TestCtrl('c', state.KeyDownEvent, handleCopySelectedLink)) return
  if (TestCtrl('f', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f3', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey(' ', state.KeyDownEvent, () => inputsearch.value.focus())) return
  if (TestKey('f5', state.KeyDownEvent, handleRefresh)) return
  if (TestKeyboardSelect(state.KeyDownEvent, viewlist.value, shareHistoryStore, handleOpenLink)) return
  if (TestKeyboardScroll(state.KeyDownEvent, viewlist.value, shareHistoryStore)) return
})

const mouseStore = useMouseStore()
mouseStore.$subscribe((_m: any, state: MouseState) => {
  if (appStore.appTab != 'share') return
  const mouseEvent = state.MouseEvent
  // console.log('MouseEvent', state.MouseEvent)
  if (TestButton(0, mouseEvent, () => {
    if (mouseEvent.srcElement) {
      // @ts-ignore
      if (mouseEvent.srcElement.className && mouseEvent.srcElement.className.toString().startsWith('arco-virtual-list')) {
        onSelectCancel()
      }
    }
  })) return
})

const rangIsSelecting = ref(false)
const rangSelectID = ref('')
const rangSelectStart = ref('')
const rangSelectEnd = ref('')
const rangSelectFiles = ref<{ [k: string]: any }>({})
const onSelectRangStart = () => {
  onHideRightMenuScroll()
  rangIsSelecting.value = !rangIsSelecting.value
  rangSelectID.value = ''
  rangSelectStart.value = ''
  rangSelectEnd.value = ''
  rangSelectFiles.value = {}
  shareHistoryStore.mRefreshListDataShow(false)
}
const onSelectCancel = () => {
  onHideRightMenuScroll()
  shareHistoryStore.ListSelected.clear()
  shareHistoryStore.ListFocusKey = ''
  shareHistoryStore.mRefreshListDataShow(false)
}
const onSelectReverse = () => {
  onHideRightMenuScroll()
  const listData = shareHistoryStore.ListDataShow
  const listSelected = shareHistoryStore.GetSelected()
  const reverseSelect = xorWith(listData, listSelected, (a, b) => a.share_id === b.share_id)
  shareHistoryStore.ListSelected.clear()
  shareHistoryStore.ListFocusKey = ''
  if (reverseSelect.length > 0) {
    shareHistoryStore.mRangSelect(reverseSelect[0].share_id, reverseSelect.map(r => r.share_id))
  }
  shareHistoryStore.mRefreshListDataShow(false)
}
const onSelectRang = (share_id: string) => {
  if (rangIsSelecting.value && rangSelectID.value != '') {
    let startid = rangSelectID.value
    let endid = ''
    const s: { [k: string]: any } = {}
    const children = shareHistoryStore.ListDataShow
    let a = -1
    let b = -1
    for (let i = 0, maxi = children.length; i < maxi; i++) {
      if (children[i].share_id == share_id) a = i
      if (children[i].share_id == startid) b = i
      if (a > 0 && b > 0) break
    }
    if (a >= 0 && b >= 0) {
      if (a > b) {
        ;[a, b] = [b, a]
        endid = share_id
      } else {
        endid = startid
        startid = share_id
      }
      for (let n = a; n <= b; n++) {
        s[children[n].share_id] = true
      }
    }
    rangSelectStart.value = startid
    rangSelectEnd.value = endid
    rangSelectFiles.value = s
    shareHistoryStore.mRefreshListDataShow(false)
  }
}

const handleRefresh = () => ShareDAL.aReloadShareHistory(useUserStore().user_id, true)
const handleSelectAll = () => shareHistoryStore.mSelectAll()
const handleOrder = (order: string) => shareHistoryStore.mOrderListData(order)
const handleSelect = (share_id: string, event: any, isCtrl: boolean = false) => {
  onHideRightMenuScroll()
  if (rangIsSelecting.value) {
    if (!rangSelectID.value) {
      if (!shareHistoryStore.ListSelected.has(share_id)) {
        shareHistoryStore.mMouseSelect(share_id, true, false)
      }
      rangSelectID.value = share_id
      rangSelectStart.value = share_id
      rangSelectFiles.value = { [share_id]: true }
    } else {
      const start = rangSelectID.value
      const children = shareHistoryStore.ListDataShow
      let a = -1
      let b = -1
      for (let i = 0, maxi = children.length; i < maxi; i++) {
        if (children[i].share_id == share_id) a = i
        if (children[i].share_id == start) b = i
        if (a > 0 && b > 0) break
      }
      const fileList: string[] = []
      if (a >= 0 && b >= 0) {
        if (a > b) [a, b] = [b, a]
        for (let n = a; n <= b; n++) {
          fileList.push(children[n].share_id)
        }
      }
      shareHistoryStore.mRangSelect(share_id, fileList)
      rangIsSelecting.value = false
      rangSelectID.value = ''
      rangSelectStart.value = ''
      rangSelectEnd.value = ''
      rangSelectFiles.value = {}
    }
    shareHistoryStore.mRefreshListDataShow(false)
  } else {
    shareHistoryStore.mMouseSelect(share_id, event.ctrlKey || isCtrl, event.shiftKey)
    if (!shareHistoryStore.ListSelected.has(share_id)) {
      shareHistoryStore.ListFocusKey = ''
    }
  }
}

const handleOpenLink = (share: any) => {
  if (share && share.share_id) {
    // donothing
  } else {
    share = shareHistoryStore.GetSelectedFirst()
  }
  if (!share.share_id) {
    message.error('没有选中分享链接！')
  } else {
    modalShowShareLink(share.share_id, share.share_pwd, '', true, [], false)
  }
}
const handleSaveMyImport = () => {
  const selected = shareHistoryStore.GetSelected()
  if (selected.length == 0) {
    message.error('没有选中分享')
    return
  }
  for (let item of selected) {
    AliShare.ApiGetShareAnonymous(item.share_id).then((info) => {
      ShareDAL.SaveOtherShare('', info, false)
    })
  }
  ShareDAL.aReloadOtherShare()
  message.success('已保存所选分享到我的导入，请手动刷新我的导入数据')
}
const handleCopySelectedLink = () => {
  const list = shareHistoryStore.GetSelected()
  let link = ''
  for (let i = 0, maxi = list.length; i < maxi; i++) {
    const item = list[i]
    link += GetShareUrlFormate(item.share_name, 'https://www.aliyundrive.com/s/' + item.share_id, '') + '\n'
  }
  if (list.length == 0) {
    message.error('没有选中分享链接！')
  } else {
    copyToClipboard(link)
    message.success('分享链接已复制到剪切板(' + list.length.toString() + ')')
  }
}
const handleBrowserLink = () => {
  const first = shareHistoryStore.GetSelectedFirst()
  if (!first) return
  if (first.share_id) {
    openExternal('https://www.aliyundrive.com/s/' + first.share_id)
  }
}

const handleSearchInput = (value: string) => {
  shareHistoryStore.mSearchListData(value)
  viewlist.value.scrollIntoView(0)
}
const handleSearchEnter = (event: any) => {
  event.target.blur()
  viewlist.value.scrollIntoView(0)
}
const handleRightClick = (e: { event: MouseEvent; node: any }) => {
  const key = e.node.key
  if (!shareHistoryStore.ListSelected.has(key)) shareHistoryStore.mMouseSelect(key, false, false)
  onShowRightMenu('rightsharehistorymenu', e.event.clientX, e.event.clientY)
}
</script>

<template>
  <div style="height: 7px"></div>
  <div class='toppanbtns' style='height: 26px'>
    <div style="min-height: 26px; max-width: 100%; flex-shrink: 0; flex-grow: 0">
      <div class="toppannav">
        <div class="toppannavitem" title="历史导入">
          <span> 历史导入 </span>
        </div>
      </div>
    </div>
    <div class='flex flexauto'></div>
  </div>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :loading="shareHistoryStore.ListLoading" title="F5"
                @click="handleRefresh">
        <template #icon>
          <i class="iconfont iconreload-1-icon" />
        </template>
        刷新
      </a-button>
    </div>
    <div v-show="shareHistoryStore.IsListSelected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+O" @click="handleOpenLink"><i
        class="iconfont iconchakan" />查看
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="保存到我的导入" @click="handleSaveMyImport">
        <i class="iconfont iconxuanzhuan" />保存导入
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+C" @click="handleCopySelectedLink"><i
        class="iconfont iconcopy" />复制链接
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+B" @click="handleBrowserLink"><i
        class="iconfont iconchrome" />浏览器
      </a-button>
    </div>
    <div style="flex-grow: 1"></div>
    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search ref="inputsearch" tabindex="-1" size="small" title="Ctrl+F / F3 / Space" placeholder="快速筛选"
                      v-model="shareHistoryStore.ListSearchKey" allow-clear
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
          <i :class="shareHistoryStore.IsListSelectedAll ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
        </a-button>
      </AntdTooltip>
      <div class='selectInfo'>{{ shareHistoryStore.ListDataSelectCountInfo }}</div>
      <div style='margin: 0 2px'>
        <AntdTooltip placement='rightTop' v-if="shareHistoryStore.ListDataShow.length > 0">
          <a-button shape='square' type='text' tabindex='-1' class='qujian'
                    :status="rangIsSelecting ? 'danger' : 'normal'" title='Ctrl+Q' @click='onSelectRangStart'>
            {{ rangIsSelecting ? '取消选择' : '区间选择' }}
          </a-button>
          <template #title>
            <div>
              第1步: 点击 区间选择 这个按钮
              <br />
              第2步: 鼠标点击一个文件
              <br />
              第3步: 移动鼠标点击另外一个文件
            </div>
          </template>
        </AntdTooltip>
        <a-button shape='square'
                  v-if='!rangIsSelecting && shareHistoryStore.ListSelected.size > 0 && shareHistoryStore.ListSelected.size < shareHistoryStore.ListDataShow.length'
                  type='text'
                  tabindex='-1'
                  class='qujian'
                  status='normal' @click='onSelectReverse'>
          反向选择
        </a-button>
        <a-button shape='square' v-if='!rangIsSelecting && shareHistoryStore.ListSelected.size > 0' type='text'
                  tabindex='-1' class='qujian'
                  status='normal' @click='onSelectCancel'>
          取消已选
        </a-button>
      </div>
    </div>
    <div style="flex-grow: 1"></div>
    <div :class="'cell count order ' + (shareHistoryStore.ListOrderKey == 'save' ? 'active' : '')"
         @click="handleOrder('save')">
      保存数
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count order ' + (shareHistoryStore.ListOrderKey == 'preview' ? 'active' : '')"
         @click="handleOrder('preview')">
      预览数
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count order ' + (shareHistoryStore.ListOrderKey == 'browse' ? 'active' : '')"
         @click="handleOrder('browse')">
      浏览数
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (shareHistoryStore.ListOrderKey == 'ctime' ? 'active' : '')"
         @click="handleOrder('ctime')">
      创建时间
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (shareHistoryStore.ListOrderKey == 'mtime' ? 'active' : '')"
         @click="handleOrder('mtime')">
      修改时间
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell count'">
      创建者
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
      :data="shareHistoryStore.ListDataShow"
      tabindex="-1"
      @scroll="onHideRightMenuScroll">
      <template #empty>
        <a-empty description="没导入过任何分享链接" />
      </template>
      <template #item="{ item, index }">
        <div :key="item.share_id" class="listitemdiv">
          <div
            :class="'fileitem' + (shareHistoryStore.ListSelected.has(item.share_id) ? ' selected' : '') + (shareHistoryStore.ListFocusKey == item.share_id ? ' focus' : '')"
            @click="handleSelect(item.share_id, $event)"
            @mouseover='onSelectRang(item.share_id)'
            @contextmenu="(event:MouseEvent)=>handleRightClick({event,node:{key:item.share_id}} )">
            <div
              :class="'rangselect ' + (rangSelectFiles[item.share_id] ? (rangSelectStart == item.share_id ? 'rangstart' : rangSelectEnd == item.share_id ? 'rangend' : 'rang') : '')">
              <a-button shape="circle" type="text" tabindex="-1" class="select" :title="index"
                        @click.prevent.stop="handleSelect(item.share_id, $event, true)">
                <i
                  :class="shareHistoryStore.ListSelected.has(item.share_id) ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
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
            <div class="cell sharestate active">{{ item.save_count }}</div>
            <div class="cell sharestate active">{{ item.preview_count }}</div>
            <div class="cell sharestate active">{{ item.browse_count }}</div>
            <div class="cell sharetime">{{ item.gmt_created }}</div>
            <div class="cell sharetime">{{ item.gmt_modified }}</div>
            <div class="cell sharestate">{{ item.creator_name }}</div>
          </div>
        </div>
      </template>
    </a-list>

    <a-dropdown id="rightsharehistorymenu" class="rightmenu" :popup-visible="true"
                style="z-index: -1; left: -200px; opacity: 0">
      <template #content>
        <a-doption @click="handleOpenLink">
          <template #icon><i class="iconfont iconchakan" /></template>
          <template #default>查看</template>
        </a-doption>
        <a-doption @click="handleSaveMyImport">
          <template #icon><i class="iconfont iconxuanzhuan" /></template>
          <template #default>保存导入</template>
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

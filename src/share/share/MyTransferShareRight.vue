<script setup lang="ts">
import { h, ref } from 'vue'
import { IAliShareItem } from '../../aliapi/alimodels'
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
import { ArrayKeyList } from '../../utils/utils'
import { GetShareUrlFormate } from '../../utils/shareurl'
import useMyTransferShareStore from './MyShareTransferStore'
import AliTransferShare from '../../aliapi/transfershare'
import { xorWith } from 'lodash'
import { TestButton } from '../../utils/mosehelper'
import { Modal } from '@arco-design/web-vue'

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
  myTransferShare.mRefreshListDataShow(false)
}
const onSelectCancel = () => {
  onHideRightMenuScroll()
  myTransferShare.ListSelected.clear()
  myTransferShare.ListFocusKey = ''
  myTransferShare.mRefreshListDataShow(false)
}
const onSelectReverse = () => {
  onHideRightMenuScroll()
  const listData = myTransferShare.ListDataShow
  const listSelected = myTransferShare.GetSelected()
  const reverseSelect = xorWith(listData, listSelected, (a, b) => a.share_id === b.share_id)
  myTransferShare.ListSelected.clear()
  myTransferShare.ListFocusKey = ''
  if (reverseSelect.length > 0) {
    myTransferShare.mRangSelect(reverseSelect[0].share_id, reverseSelect.map(r => r.share_id))
  }
  myTransferShare.mRefreshListDataShow(false)
}
const onSelectRang = (share_id: string) => {
  if (rangIsSelecting.value && rangSelectID.value != '') {
    let startid = rangSelectID.value
    let endid = ''
    const s: { [k: string]: any } = {}
    const children = myTransferShare.ListDataShow
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
    myTransferShare.mRefreshListDataShow(false)
  }
}

const handleRefresh = () => ShareDAL.aReloadMyTransferShare(useUserStore().user_id, true)
const handleSelectAll = () => myTransferShare.mSelectAll()
const handleOrder = (order: string) => myTransferShare.mOrderListData(order)
const handleSelect = (share_id: string, event: any, isCtrl: boolean = false) => {
  onHideRightMenuScroll()
  if (rangIsSelecting.value) {
    if (!rangSelectID.value) {
      if (!myTransferShare.ListSelected.has(share_id)) {
        myTransferShare.mMouseSelect(share_id, true, false)
      }
      rangSelectID.value = share_id
      rangSelectStart.value = share_id
      rangSelectFiles.value = { [share_id]: true }
    } else {
      const start = rangSelectID.value
      const children = myTransferShare.ListDataShow
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
      myTransferShare.mRangSelect(share_id, fileList)
      rangIsSelecting.value = false
      rangSelectID.value = ''
      rangSelectStart.value = ''
      rangSelectEnd.value = ''
      rangSelectFiles.value = {}
    }
    myTransferShare.mRefreshListDataShow(false)
  } else {
    myTransferShare.mMouseSelect(share_id, event.ctrlKey || isCtrl, event.shiftKey)
    if (!myTransferShare.ListSelected.has(share_id)) {
      myTransferShare.ListFocusKey = ''
    }
  }
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
  if (delby == 'selected') {
    Modal.open({
      title: name,
      okText: '继续',
      bodyStyle: { minWidth: '340px' },
      content: () => h('div', {
        style: 'color: red',
        innerText: '该操作不可逆，是否继续？'
      }),
      onOk: async () => {
        const selectKeys = ArrayKeyList<string>('share_id', list)
        AliTransferShare.ApiCancelTransferShareBatch(useUserStore().user_id, selectKeys).then((success: string[]) => {
          myTransferShare.mDeleteFiles(success)
          message.success(name + '成功！')
        })
      }
    })
  } else {
    const selectKeys = ArrayKeyList<string>('share_id', list)
    AliTransferShare.ApiCancelTransferShareBatch(useUserStore().user_id, selectKeys).then((success: string[]) => {
      myTransferShare.mDeleteFiles(success)
      message.success(name + '成功！')
    })
  }
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
  <div class='toppanbtns' style='height: 26px'>
    <div style="min-height: 26px; max-width: 100%; flex-shrink: 0; flex-grow: 0">
      <div class="toppannav">
        <div class="toppannavitem" title="我的快传">
          <span> 我的快传 </span>
        </div>
      </div>
    </div>
    <div class='flex flexauto'></div>
    <div class="toppanbtns" style="height: 26px;min-width: fit-content">
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
  </div>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :loading="myTransferShare.ListLoading" title="F5"
                @click="handleRefresh">
        <template #icon><i class="iconfont iconreload-1-icon" />
        </template>
        刷新
      </a-button>
    </div>
    <div v-if="!myTransferShare.IsListSelected" class="toppanbtn">
      <a-button class="danger" type="text" size="small" tabindex="-1"
                @click="handleDeleteSelectedLink">
        <i class="iconfont iconrest" />删除过期
      </a-button>
    </div>
    <div v-show="myTransferShare.IsListSelected" class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+O" @click="handleClickName"><i
        class="iconfont iconchakan" />查看
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+C" @click="handleCopySelectedLink"><i
        class="iconfont iconcopy" />复制链接
      </a-button>
      <a-button type="text" size="small" tabindex="-1" title="Ctrl+B" @click="handleBrowserLink"><i
        class="iconfont iconchrome" />浏览器
      </a-button>
      <a-button type="text" size="small" tabindex="-1" class="danger" title="Ctrl+Delete"
                @click="handleDeleteSelectedLink('selected')"><i class="iconfont icondelete" />取消快传
      </a-button>
    </div>
    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search ref="inputsearch" tabindex="-1" size="small" title="Ctrl+F / F3 / Space"
                      placeholder="快速筛选" allow-clear
                      @clear='(e:any)=>handleSearchInput("")'
                      v-model="myTransferShare.ListSearchKey"
                      @input="(val:any)=>handleSearchInput(val as string)"
                      @press-enter="handleSearchEnter" @keydown.esc=";($event.target as any).blur()" />
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
      <div class='selectInfo'>{{ myTransferShare.ListDataSelectCountInfo }}</div>
      <div style='margin: 0 2px'>
        <AntdTooltip placement='rightTop' v-if="myTransferShare.ListDataShow.length > 0">
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
                  v-if='!rangIsSelecting && myTransferShare.ListSelected.size > 0 && myTransferShare.ListSelected.size < myTransferShare.ListDataShow.length'
                  type='text'
                  tabindex='-1'
                  class='qujian'
                  status='normal' @click='onSelectReverse'>
          反向选择
        </a-button>
        <a-button shape='square' v-if='!rangIsSelecting && myTransferShare.ListSelected.size > 0' type='text'
                  tabindex='-1' class='qujian'
                  status='normal' @click='onSelectCancel'>
          取消已选
        </a-button>
      </div>
    </div>
    <div class="selectInfo" style="min-width: 266px">{{ myTransferShare.ListDataSelectCountInfo }}</div>

    <div style="flex-grow: 1"></div>
    <div :class="'cell sharetime order ' + (myTransferShare.ListOrderKey == 'state' ? 'active' : '')"
         @click="handleOrder('state')">
      有效期
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (myTransferShare.ListOrderKey == 'save' ? 'active' : '')"
         @click="handleOrder('save')">
      保存情况
      <i class="iconfont iconxia" />
    </div>
    <div :class="'cell sharetime order ' + (myTransferShare.ListOrderKey == 'time' ? 'active' : '')"
         @click="handleOrder('time')">
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
      <template #empty>
        <a-empty description="没创建过任何快传链接" />
      </template>

      <template #item="{ item, index }">
        <div :key="item.share_id" class="listitemdiv">
          <div
            :class="'fileitem' + (myTransferShare.ListSelected.has(item.share_id) ? ' selected' : '') + (myTransferShare.ListFocusKey == item.share_id ? ' focus' : '')"
            @click="handleSelect(item.share_id, $event)"
            @mouseover='onSelectRang(item.share_id)'
            @contextmenu="(event:MouseEvent)=>handleRightClick({event,node:{key:item.share_id}} )">
            <div
              :class="'rangselect ' + (rangSelectFiles[item.share_id] ? (rangSelectStart == item.share_id ? 'rangstart' : rangSelectEnd == item.share_id ? 'rangend' : 'rang') : '')">
              <a-button shape="circle" type="text" tabindex="-1" class="select" :title="index"
                        @click.prevent.stop="handleSelect(item.share_id, $event, true)">
                <i
                  :class="myTransferShare.ListSelected.has(item.share_id) ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
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
            <div class="cell sharestate active">{{ item.share_saved }}</div>
            <div class="cell sharetime">{{ item.created_at.replace(' ', '\n') }}</div>
          </div>
        </div>
      </template>
    </a-list>
    <a-dropdown id="rightmytransfersharemenu" class="rightmenu" :popup-visible="true"
                style="z-index: -1; left: -200px; opacity: 0">
      <template #content>
        <a-doption @click="handleClickName">
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
        <a-doption class="danger" @click="handleDeleteSelectedLink('selected')">
          <template #icon><i class="iconfont icondelete" /></template>
          <template #default>取消快传</template>
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<style>

</style>

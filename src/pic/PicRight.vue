<script lang="ts" setup>
import { useFootStore, usePanFileStore, useSettingStore } from '../store'
import { onMounted, ref } from 'vue'
import { throttle } from '../utils/debounce'
import { onHideRightMenuScroll } from '../utils/keyboardhelper'
import { Tooltip as AntdTooltip } from 'ant-design-vue'

import PanDAL from '../pan/pandal'
import PanTopbtn from '../pan/menus/PanTopbtn.vue'
import PicDAL from "./PicDAL";


const settingStore = useSettingStore()
const panfileStore = usePanFileStore()
const handleBack = () => PanDAL.aReLoadOneDirToShow('', 'back', false)
const handleRefresh = () => PicDAL.aReLoadPicListToShow('', 'refresh')
const handleDingWei = () => PanDAL.aTreeScrollToDir('refresh')
const handleSelectAll = () => panfileStore.mSelectAll()

const listGridWidth = ref(0)
const listGridColumn = ref(1)
const listGridItemHeight = ref(50)

const rangIsSelecting = ref(false)
const rangSelectID = ref('')
const rangSelectStart = ref('')
const rangSelectEnd = ref('')
const rangSelectFiles = ref<{ [k: string]: any }>({})

const viewlist = ref()

onMounted(() => {
    const resizeObserver = new ResizeObserver((entries) => {
        let newWidth = 0
        entries.map((t) => {
            newWidth = t.contentRect?.width || 0
            return true
        })
        if (listGridWidth.value != newWidth && newWidth > 400) {
            listGridWidth.value = newWidth
            throttle(() => {
                handleListGridMode(settingStore.uiFileListMode)
                useFootStore().rightWidth = listGridWidth.value
            }, 100)
        }
    })
    resizeObserver.observe(document.getElementById('panfilelist')!)
})

const handleListGridMode = (mode: string) => {
    if (mode == 'list') {
        if (listGridItemHeight.value != 50) {
            listGridItemHeight.value = 50
            listGridColumn.value = 1
        }
    } else if (mode == 'image') {
        const count = Math.max(3, Math.floor(listGridWidth.value / 150))
        if (listGridItemHeight.value != 180) listGridItemHeight.value = 180
        if (listGridColumn.value != count) listGridColumn.value = count
    } else {
        const count = Math.max(2, Math.floor(listGridWidth.value / 200))
        if (listGridItemHeight.value != 180) listGridItemHeight.value = 240
        if (listGridColumn.value != count) listGridColumn.value = count
    }
    settingStore.updateStore({ uiFileListMode: mode })
    panfileStore.mGridListData(mode, listGridColumn.value)
}

const handleSearchInput = (value: string) => {
  panfileStore.mSearchListData(value)
  viewlist.value.scrollIntoView(0)
}
const handleSearchEnter = (event: any) => {
  event.target.blur()
  viewlist.value.scrollIntoView(0)
}

const onSelectRangStart = () => {
  onHideRightMenuScroll()
  rangIsSelecting.value = !rangIsSelecting.value
  rangSelectID.value = ''
  rangSelectStart.value = ''
  rangSelectEnd.value = ''
  rangSelectFiles.value = {}
  panfileStore.mRefreshListDataShow(false)
}

const handleFileListOrder = (order: string) => {
  panfileStore.mOrderListData(order)
}

</script>

<template>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px" tabindex="-1">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" :disabled="false" title="后退 Back Space" @click="handleBack">
        <template #icon>
          <i class="iconfont iconarrow-left-2-icon" />
        </template>
      </a-button>
      <a-button type="text" size="small" tabindex="-1" :loading="false" title="刷新 F5" @click="handleRefresh">
        <template #icon>
          <i class="iconfont iconreload-1-icon" />
        </template>
      </a-button>
      <a-button type="text" size="small" tabindex="-1" :disabled="false" title="定位 F6" @click="handleDingWei">
        <template #icon>
          <i class="iconfont icondingwei" />
        </template>
      </a-button>
    </div>
    <PanTopbtn :dirtype="'pan'" :isselected="false" />
    <div style="flex-grow: 1"></div>
    <div class="toppanbtn">
      <a-input-search
        ref="inputsearch"
        :model-value="panfileStore.ListSearchKey"
        :input-attrs="{ tabindex: '-1' }"
        size="small"
        title="Ctrl+F / F3 / Space"
        placeholder="快速筛选"
        draggable="false"
        @dragenter.stop="() => false"
        @input="(val:any)=>handleSearchInput(val as string)"
        @press-enter="handleSearchEnter"
        @keydown.esc=";($event.target as any).blur()"
      />
    </div>
    <div></div>
  </div>
  <div style="height: 9px"></div>
  <div class="toppanarea" tabindex="-1">
    <div style="margin: 0 3px">
      <AntdTooltip title="点击全选" placement="left">
        <a-button shape="circle" type="text" tabindex="-1" class="select all" title="Ctrl+A" @click="handleSelectAll">
          <i :class="panfileStore.IsListSelectedAll ? 'iconfont iconrsuccess' : 'iconfont iconpic2'" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class="selectInfo">{{ panfileStore.ListDataSelectCountInfo }}</div>
    <div style="margin: 0 2px">
      <AntdTooltip placement="rightTop">
        <a-button shape="square" type="text" tabindex="-1" class="qujian" :status="rangIsSelecting ? 'danger' : 'normal'" title="Ctrl+Q" @click="onSelectRangStart">
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
    </div>
    <div style="flex-grow: 1"></div>
    <div class="fileorder">
      <a-dropdown trigger="hover" position="bl" @select="(val:any)=>handleFileListOrder(val as string)">
        <a-button type="text" size="small" tabindex="-1" :disabled="panfileStore.ListLoading">
            <i class="iconfont iconpaixu1" />
            {{ panfileStore.FileOrderDesc }}
            <i class="iconfont icondown" />
        </a-button>
        <template #content>
          <a-doption value="name asc">
            <template #default>　名称 · 升序　</template>
          </a-doption>
          <a-doption value="name desc">
            <template #default>　名称 · 降序　</template>
          </a-doption>
          <a-doption value="updated_at asc">
            <template #default>　时间 · 升序　</template>
          </a-doption>
          <a-doption value="updated_at desc">
            <template #default>　时间 · 降序　</template>
          </a-doption>
          <a-doption value="size asc">
            <template #default>　大小 · 升序　</template>
          </a-doption>
          <a-doption value="size desc">
            <template #default>　大小 · 降序　</template>
          </a-doption>
        </template>
      </a-dropdown>
    </div>
    <div>
      <AntdTooltip title="列表模式" placement="bottom">
        <a-button shape="square" type="text" tabindex="-1" :class="settingStore.uiFileListMode === 'list' ? 'select active' : 'select'" @click="() => handleListGridMode('list')">
          <i class="iconfont iconliebiaomoshi" />
        </a-button>
      </AntdTooltip>
      <AntdTooltip title="缩略图模式" placement="bottom">
        <a-button shape="square" type="text" tabindex="-1" :class="settingStore.uiFileListMode === 'image' ? 'select active' : 'select'" @click="() => handleListGridMode('image')">
          <i class="iconfont iconxiaotumoshi" />
        </a-button>
      </AntdTooltip>
      <AntdTooltip title="大图模式" placement="bottom">
        <a-button shape="square" type="text" tabindex="-1" :class="settingStore.uiFileListMode === 'bigimage' ? 'select active' : 'select'" @click="() => handleListGridMode('bigimage')">
          <i class="iconfont iconsuoluetumoshi" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class="cell pr"></div>
  </div>
  <a-image-preview-group infinite>
    <a-space>
      <a-image src="https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/cd7a1aaea8e1c5e3d26fe2591e561798.png~tplv-uwbnlip3yd-webp.webp" height="200" width="200" />
      <a-image src="https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/6480dbc69be1b5de95010289787d64f1.png~tplv-uwbnlip3yd-webp.webp" height="200" width="200" />
      <a-image src="https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/0265a04fddbd77a19602a15d9d55d797.png~tplv-uwbnlip3yd-webp.webp" height="200" width="200" />
      <a-image src="https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/24e0dd27418d2291b65db1b21aa62254.png~tplv-uwbnlip3yd-webp.webp" height="200" width="200" />
    </a-space>
  </a-image-preview-group>
</template>

<style>
#panfilelist .fileitem,
#panfilelist .griditem {
  -webkit-user-drag: element;
}
</style>

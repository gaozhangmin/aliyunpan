<!-- MediaPanRight.vue - 媒体库专用的文件列表组件 -->
<template>
  <div class='media-pan-right'>
    <!-- 加载状态 -->
    <a-skeleton v-if='mediaPanFileStore.ListLoading && mediaPanFileStore.ListDataCount == 0' :loading='true' :animation='true'>
      <a-skeleton-line :rows='10' :line-height='50' :line-spacing='50' />
    </a-skeleton>

    <!-- 文件列表 -->
    <a-list
      v-else
      ref='viewlist'
      :bordered='false'
      :split='false'
      :max-height='500'
      :virtual-list-props="{
        height: 500,
        fixedSize: true,
        estimatedSize: 50,
        threshold: 1,
        itemKey: 'file_id'
      }"
      style='width: 100%'
      :data='mediaPanFileStore.ListDataShow'
      tabindex='-1'
      @scroll='handleListScroll'>
      <template #empty>
        <a-empty description='空文件夹' />
      </template>
      <template #item='{ item, index }'>
        <div :key="'l-' + item.file_id" class='listitemdiv'>
          <div
            v-if='item.isDir'
            :class="'fileitem' + (mediaPanFileStore.ListSelected.has(item.file_id) ? ' selected' : '') + (mediaPanFileStore.ListFocusKey == item.file_id ? ' focus' : '')"
            @click='handleSelect(item.file_id, $event)'
            @dblclick='handleOpenFile($event, item)'>
            <!-- 选择框 -->
            <div class='rangselect'>
              <a-button shape='circle' type='text' tabindex='-1' class='select' :title='index'
                        @click.prevent.stop='handleSelect(item.file_id, $event, true)'>
                <i
                  :class="mediaPanFileStore.ListSelected.has(item.file_id) ? (item.starred ? 'iconfont iconcrown3' : 'iconfont iconrsuccess') : item.starred ? 'iconfont iconcrown' : 'iconfont iconpic2'" />
              </a-button>
            </div>
            <!-- 文件图标 -->
            <div class='fileicon'>
              <i :class="'iconfont ' + item.icon" aria-hidden='true'></i>
            </div>
            <!-- 文件名 -->
            <div class='filename' droppable='false'>
              <div @click='handleOpenFile($event, item)'>
                {{ item.name }}
              </div>
            </div>
            <!-- 文件按钮 -->
            <div class='filebtn'>
              <a-popover v-if='item.thumbnail'
                         content-class='popimg' position='lt'>
                <a-button type='text' tabindex='-1' class='gengduo' title='缩略图'>
                  <i class='iconfont icongengduo' />
                </a-button>
                <template #content>
                  <div class='preimg'>
                    <img :src='item.thumbnail' onerror="javascript:this.src='imgerror.png';" />
                  </div>
                </template>
              </a-popover>
              <a-button v-else type='text' tabindex='-1' class='gengduo' disabled></a-button>
            </div>
            <!-- 文件大小 -->
            <div class='filesize'>{{ item.sizeStr }}</div>
            <div v-show='item.file_count' class='filesize'>{{ '文件数: ' + item.file_count }}</div>
            <!-- 修改时间 -->
            <div class='filetime'>{{ item.timeStr }}</div>
          </div>

          <!-- 文件项 -->
          <div
            v-else
            :class="'fileitem' + (mediaPanFileStore.ListSelected.has(item.file_id) ? ' selected' : '') + (mediaPanFileStore.ListFocusKey == item.file_id ? ' focus' : '')"
            @click='handleSelect(item.file_id, $event)'
            @dblclick='handleOpenFile($event, item)'>
            <!-- 选择框 -->
            <div class='rangselect'>
              <a-button shape='circle' type='text' tabindex='-1' class='select' :title='index'
                        @click.prevent.stop='handleSelect(item.file_id, $event, true)'>
                <i
                  :class="mediaPanFileStore.ListSelected.has(item.file_id) ? (item.starred ? 'iconfont iconcrown3' : 'iconfont iconrsuccess') : item.starred ? 'iconfont iconcrown' : 'iconfont iconpic2'" />
              </a-button>
            </div>
            <!-- 文件图标 -->
            <div class='fileicon'>
              <i :class="'iconfont ' + item.icon" aria-hidden='true'></i>
            </div>
            <!-- 文件名 -->
            <div class='filename' droppable='false'>
              <div @click='handleOpenFile($event, item)'>
                {{ item.name }}
              </div>
            </div>
            <!-- 文件按钮 -->
            <div class='filebtn'>
              <a-popover v-if='item.thumbnail' content-class='popimg'
                         position='lt'>
                <a-button type='text' tabindex='-1' class='gengduo'>
                  <i class='iconfont icontupianyulan' />
                </a-button>
                <template #content>
                  <div class='preimg'>
                    <img :src='item.thumbnail' onerror="javascript:this.src='imgerror.png';" />
                  </div>
                </template>
              </a-popover>
              <a-button v-else type='text' tabindex='-1' class='gengduo' disabled></a-button>
            </div>
            <!-- 文件大小 -->
            <div class='filesize'>
              {{ item.sizeStr }}
            </div>
            <!-- 修改时间 -->
            <div class='filetime'>{{ item.timeStr }}</div>
            <!-- 媒体信息 -->
            <div class='filesize' v-show="item.media_duration || item.media_play_cursor">
              <span>{{ '总时:' + (item.media_duration || '未知时长') }}</span>
              <span>{{ '观看:' + (item.media_play_cursor || '未知状态') }}</span>
              <span>{{ item.media_width > 0 ? item.media_width + 'x' + item.media_height : '' }}</span>
            </div>
          </div>
        </div>
      </template>
    </a-list>
  </div>
</template>

<script setup lang='ts'>
import { ref } from 'vue'
import { IAliGetFileModel } from '../aliapi/alimodels'
import { useMediaPanFileStore } from './stores'
import { menuOpenFile } from '../utils/openfile'

// 定义 emit 事件
const emit = defineEmits<{
  enterFolder: [file: IAliGetFileModel]
}>()

const viewlist = ref()
const mediaPanFileStore = useMediaPanFileStore()

const handleListScroll = () => {
  // 处理滚动事件（媒体库中不需要复杂的滚动逻辑）
}

const handleSelect = (file_id: string, event: MouseEvent, isCtrl: boolean = false) => {
  mediaPanFileStore.mMouseSelect(file_id, event.ctrlKey || isCtrl, event.shiftKey)
  if (!mediaPanFileStore.ListSelected.has(file_id)) mediaPanFileStore.ListFocusKey = ''
}

const handleOpenFile = (event: Event, file: IAliGetFileModel | undefined) => {
  if (!file) file = mediaPanFileStore.GetSelectedFirst()
  if (!file) return

  // 如果是文件夹，应该进入子目录而不是打开文件
  if (file.isDir) {
    // 发出事件让 MediaLibrary.vue 处理文件夹导航
    emit('enterFolder', file)
    return
  }

  // 只有文件才执行打开操作
  if (!mediaPanFileStore.ListSelected.has(file.file_id)) {
    mediaPanFileStore.mMouseSelect(file.file_id, false, false)
  }

  // 简化的文件打开逻辑
  menuOpenFile(file)
}

defineExpose({
  viewlist
})
</script>

<style scoped>
.media-pan-right {
  width: 100%;
  height: 100%;
}

.listitemdiv {
  padding: 0;
  margin: 0;
}

.fileitem {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 0;
  min-height: 50px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--color-neutral-3);
  transition: background-color 0.2s ease;
}

.fileitem:hover {
  background-color: var(--color-neutral-1);
}

.fileitem.selected {
  background-color: var(--color-primary-light-1);
}

.fileitem.focus {
  background-color: var(--color-primary-light-2);
}

.rangselect {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rangselect .select {
  width: 24px;
  height: 24px;
  min-width: 24px;
}

.fileicon {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.fileicon .iconfont {
  font-size: 20px;
  color: var(--color-text-2);
}

.filename {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.filename > div {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--color-text-1);
}

.filebtn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.filebtn .gengduo {
  width: 24px;
  height: 24px;
  min-width: 24px;
}

.filebtn .gengduo[disabled] {
  opacity: 0;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  pointer-events: none;
}

.filesize {
  width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: right;
  margin-right: 12px;
}

.filetime {
  width: 120px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: right;
}

.preimg {
  max-width: 300px;
  max-height: 300px;
}

.preimg img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* 响应式 */
@media (max-width: 768px) {
  .filesize,
  .filetime {
    display: none;
  }

  .filename {
    margin-right: 8px;
  }
}
</style>

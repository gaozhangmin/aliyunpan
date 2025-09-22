<script setup lang='ts'>
import message from '../../utils/message'
import { humanSize } from '../../utils/format'
import { computed, ref, watch } from 'vue'
import MyLoading from '../../layout/MyLoading.vue'
import { useSettingStore, useUserStore, useWinStore } from '../../store'
import UserDAL from '../../user/userdal'
import AliFileCmd from '../../aliapi/filecmd'
import {
  foldericonfn,
  LoadScanDir,
  NewScanDriver,
  ResetScanDriver,
  TreeCheckFileChild,
  TreeNodeData,
  TreeSelectAll,
  TreeSelectOne
} from '../ScanDAL'
import { DeleteFromScanDataPunish, GetTreeCheckedSize, GetTreeNodes, GetWeiGuiFile } from './scanpunish'

import { Checkbox as AntdCheckbox, Tree as AntdTree } from 'ant-design-vue'
import { EventDataNode } from 'ant-design-vue/es/tree'
import { modalSelectPanDir } from '../../utils/modal'
import { GetDriveID } from '../../aliapi/utils'

const winStore = useWinStore()
const userStore = useUserStore()
const treeHeight = computed(() => winStore.height - 268)

const treeref = ref()

const scanLoading = ref(false)
const scanLoaded = ref(false)
const delLoading = ref(false)
const Processing = ref(0)
const scanCount = ref(0)
const totalDirCount = ref(0)
const totalFileCount = ref(0)

const ScanPanData = NewScanDriver('')

const checkedKeys = ref<string[]>([])
const checkedSize = ref(0)
let checkedKeysBak: string[] = []
const expandedKeys = ref<string[]>([])
const treeData = ref<TreeNodeData[]>([])

const handleSelectAll = () => {
  TreeSelectAll(checkedKeys, checkedKeysBak)
  checkedSize.value = GetTreeCheckedSize(ScanPanData, panType.value, checkedKeys.value, ShowWeiGui.value, ShowPartWeiGui.value, ShowNoShare.value)
}
const handleTreeSelect = (keys: any, info: {
  node: EventDataNode
}) => TreeSelectOne([info.node.key as string], checkedKeys)
const handleTreeCheck = (keys: any, e: any) => {
  TreeCheckFileChild(e.node, checkedKeys)
  checkedSize.value = GetTreeCheckedSize(ScanPanData, panType.value, checkedKeys.value, ShowWeiGui.value, ShowPartWeiGui.value, ShowNoShare.value)
}

const handleReset = () => {
  scanLoading.value = false
  scanLoaded.value = false
  delLoading.value = false
  Processing.value = 0
  scanCount.value = 0
  totalDirCount.value = 0

  ResetScanDriver(ScanPanData)

  checkedKeys.value = []
  checkedKeysBak = []
  expandedKeys.value = []
  treeData.value = []
}

watch(userStore.$state, handleReset)

const RefreshTree = (checkall: boolean): void => {
  let checkedsize = 0
  const expandedkeys: Set<string> = new Set()
  const checkedkeys: Set<string> = new Set()
  const treeDataMap: Map<string, TreeNodeData> = new Map()
  const treeDataNodes: TreeNodeData[] = GetTreeNodes(ScanPanData, panType.value + '_root', treeDataMap, ShowWeiGui.value, ShowPartWeiGui.value, ShowNoShare.value)
  Object.freeze(treeDataNodes)
  treeData.value = treeDataNodes
  const values: TreeNodeData[] = Array.from(treeDataMap.values())
  for (let node of values) {
    const clen = node.children!.length
    node.selectable = clen == 0 && node.icon != foldericonfn
    if (checkall) node.checkable = true
    if (clen > 0) {
      expandedkeys.add(node.key as string)
    } else if (checkall && node.icon != foldericonfn) {
      checkedkeys.add(node.key as string)
      checkedsize += node.size
    }
  }
  expandedKeys.value = Array.from(expandedkeys)
  checkedKeys.value = Array.from(checkedkeys)
  checkedSize.value = checkedsize
  checkedKeysBak = Array.from(checkedkeys)
  scanCount.value = checkedkeys.size
}

const handleDelete = () => {
  const user = UserDAL.GetUserToken(userStore.user_id)
  if (!user || !user.user_id) {
    message.error('账号错误')
    return
  }
  if (!checkedKeys.value.length) {
    message.error('没有选中需要删除的文件')
    return
  }
  delLoading.value = true
  let drive_id = GetDriveID(user.user_id, panType.value)
  AliFileCmd.ApiTrashBatch(user.user_id, drive_id, checkedKeys.value).then((success: string[]) => {
    delLoading.value = false
    if (checkedKeys.value.length == checkedKeysBak.length) {
      handleReset()
    } else {
      DeleteFromScanDataPunish(ScanPanData, checkedKeys.value)
      checkedKeys.value = []
      checkedSize.value = 0
      RefreshTree(false)
    }
  })
}

const handleMove = () => {
  const user = UserDAL.GetUserToken(userStore.user_id)
  if (!user || !user.user_id) {
    message.error('账号错误')
    return
  }
  modalSelectPanDir('cut', '', function(user_id: string, _drive_id: string, selectFile: any) {
    if (!selectFile.file_id) return
    delLoading.value = true
    let drive_id = GetDriveID(user.user_id, panType.value)
    AliFileCmd.ApiMoveBatch(user.user_id, drive_id, checkedKeys.value, selectFile.drive_id, selectFile.file_id).then((success: string[]) => {
      delLoading.value = false
      if (checkedKeys.value.length == checkedKeysBak.length) {
        handleReset()
      } else {
        DeleteFromScanDataPunish(ScanPanData, checkedKeys.value)
        checkedKeys.value = []
        checkedSize.value = 0
        RefreshTree(false)
      }
    })
  })
}

const handleScan = () => {
  const user = UserDAL.GetUserToken(userStore.user_id)
  if (!user || !user.user_id) {
    message.error('账号错误')
    return
  }
  handleReset()
  scanLoading.value = true

  const add = () => {
    if (Processing.value < 50) {
      Processing.value++
      setTimeout(add, 1500)
    }
  }
  setTimeout(add, 1500)

  const refresh = () => {
    if (scanLoading.value) {
      RefreshTree(false)
      setTimeout(refresh, 3000)
    }
  }
  setTimeout(refresh, 3000)
  let drive_id = GetDriveID(user.user_id, panType.value)
  LoadScanDir(user.user_id, drive_id, panType.value + '_root', totalDirCount, Processing, ScanPanData)
    .then(() => {
      return GetWeiGuiFile(user.user_id, ScanPanData, Processing, scanCount, totalFileCount, scanType.value)
    })
    .catch((err: any) => {
      message.error(err.message || '扫描失败')
    })
    .then(() => {
      scanLoading.value = false
      RefreshTree(true)
      scanLoaded.value = true
      Processing.value = 0
    })
}


const ShowWeiGui = ref(true)
const ShowPartWeiGui = ref(true)
const ShowNoShare = ref(true)
const scanType = ref('video')
const panType = ref('backup')

const handleShowWeiGui = () => {
  ShowWeiGui.value = !ShowWeiGui.value
  RefreshTree(true)
}
const handleShowPartWeiGui = () => {
  ShowPartWeiGui.value = !ShowPartWeiGui.value
  RefreshTree(true)
}
const handleShowNoShare = () => {
  ShowNoShare.value = !ShowNoShare.value
  RefreshTree(true)
}
</script>

<template>
  <div class='scanfill rightbg'>
    <div class='settingcard scanfix' style='padding: 12px 24px 8px 24px'>
      <a-steps>
        <a-step
          :description="scanLoaded ? '扫描出 ' + scanCount + ' 个违规文件' : scanLoading ? '扫描进度：' + (Processing > 50 ? Math.floor((Processing * 100) / totalDirCount) + '%' : Processing) : '在网盘中查找一遍'">
          查找
          <template #icon>
            <MyLoading v-if='scanLoading' />
            <i v-else class='iconfont iconrsearch' />
          </template>
        </a-step>
        <a-step description='勾选 需要删除的'>
          勾选
          <template #icon>
            <i class='iconfont iconedit-square' />
          </template>
        </a-step>
        <a-step description='删除 放入回收站'>
          删除
          <template #icon>
            <i class='iconfont icondelete' />
          </template>
        </a-step>
      </a-steps>
    </div>

    <div class='settingcard scanauto' style='padding: 4px; margin-top: 4px'>
      <a-row justify='space-between' align='center'
             style='margin: 12px; height: 28px; flex-grow: 0; flex-shrink: 0; flex-wrap: nowrap; overflow: hidden'>
        <AntdCheckbox :disabled='scanLoaded == false'
                      :checked='scanCount > 0 && checkedKeys.length == scanCount'
                      style='margin-left: 12px; margin-right: 12px'
                      @click.stop.prevent='handleSelectAll'>
          全选
        </AntdCheckbox>
        <span v-if='scanLoaded' class='checkedInfo'>
          已选中 {{ checkedKeys.length }} 个文件{{ humanSize(checkedSize) }}
        </span>

        <span v-else-if='totalDirCount > 0' class='checkedInfo'>
          正在列出文件 {{ Processing }} / {{ totalDirCount }}
        </span>
        <span v-else class='checkedInfo'>网盘中文件很多时，需要扫描很长时间</span>
        <div style='flex: auto'></div>

        <AntdCheckbox v-if='scanLoaded' v-model:checked='ShowWeiGui' style='margin-right: 12px'
                      title='是否显示完全违规的文件' @click.stop.prevent='handleShowWeiGui'>
          完全违规
        </AntdCheckbox>

        <AntdCheckbox v-if="scanLoaded && panType == 'resource'"
                      v-model:checked='ShowPartWeiGui' style='margin-right: 12px'
                      title='是否显示部分违规的文件' @click.stop.prevent='handleShowPartWeiGui'>
          部分违规
        </AntdCheckbox>

        <AntdCheckbox v-if='scanLoaded' v-model:checked='ShowNoShare' style='margin-right: 12px'
                      title='是否显示禁止分享的文件' @click.stop.prevent='handleShowNoShare'>
          禁止分享
        </AntdCheckbox>

        <a-button v-if='scanLoaded' size='small' tabindex='-1' style='margin-right: 12px' @click='handleReset'>取消
        </a-button>
        <template v-else>
          <a-select v-model:model-value='panType' size='small' tabindex='-1'
                    style='width: 100px; flex-shrink: 0; margin-right: 2px' :disabled='scanLoading'>
            <a-option value='backup' :disabled="useSettingStore().securityHideBackupDrive">备份盘</a-option>
            <a-option value='resource' :disabled="useSettingStore().securityHideResourceDrive">资源盘</a-option>
          </a-select>
          <a-select v-model:model-value='scanType' size='small' tabindex='-1'
                    style='width: 136px; flex-shrink: 0; margin-right: 12px' :disabled='scanLoading'>
            <a-option value='video'>视频</a-option>
            <a-option value='doc'>文档</a-option>
            <a-option value='image'>图片</a-option>
            <a-option value='audio'>音乐</a-option>
            <a-option value='zip'>压缩包</a-option>
            <a-option value='others'>其他</a-option>
            <a-option value='size1000'>全部>1G</a-option>
            <a-option value='size100'>全部>100MB</a-option>
            <a-option value='size10'>全部>10MB</a-option>
          </a-select>
        </template>
        <a-button v-if='scanLoaded' type='primary' size='small' tabindex='-1' status='danger' :loading='delLoading'
                  style='margin-right: 12px' title='把选中的文件放入回收站' @click='handleDelete'>删除选中
        </a-button>
        <a-button v-if='scanLoaded' type='primary' size='small' tabindex='-1' :loading='delLoading' @click='handleMove'>
          移动选中
        </a-button>
        <a-button v-else type='primary' size='small' tabindex='-1' :loading='scanLoading' @click='handleScan'>
          开始扫描
        </a-button>
      </a-row>
      <a-spin v-if='scanLoading || scanLoaded' :loading='scanLoading' tip='耐心等待，很慢的...'
              :style="{ width: '100%', height: treeHeight + 'px', overflow: 'hidden' }">
        <AntdTree
          ref='treeref'
          :expanded-keys='expandedKeys'
          :checked-keys='checkedKeys'
          :tree-data='treeData'
          :tabindex='-1'
          :focusable='false'
          checkable
          block-node
          :selectable='false'
          check-strictly
          auto-expand-parent
          show-icon
          :height='treeHeight'
          :style="{ height: treeHeight + 'px' }"
          :show-line='{ showLeafIcon: false }'
          @select='handleTreeSelect'
          @check='handleTreeCheck'>
          <template #switcherIcon>
            <i class='ant-tree-switcher-icon iconfont Arrow' />
          </template>
        </AntdTree>
      </a-spin>
      <a-empty v-else class='beginscan'>
        <template #image>
          <i class='iconfont iconrsearch' />
        </template>
        请点击上方 开始扫描 按钮
      </a-empty>
    </div>
  </div>
</template>

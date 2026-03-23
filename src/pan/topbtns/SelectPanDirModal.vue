<script setup lang='ts'>
import { modalCloseAll } from '../../utils/modal'
import { computed, h, PropType, reactive, ref } from 'vue'
import { usePanTreeStore, useSettingStore, useWinStore } from '../../store'
import { CheckFileName, ClearFileName } from '../../utils/filehelper'
import { Tree as AntdTree } from 'ant-design-vue'
import TreeStore, { TreeNodeData } from '../../store/treestore'
import message from '../../utils/message'
import AliFileCmd from '../../aliapi/filecmd'
import PanDAL from '../pandal'
import { Sleep } from '../../utils/format'
import { treeSelectToExpand } from '../../utils/antdtree'
import AliTrash from '../../aliapi/trash'
import { fileiconfn } from '../pantreestore'
import { GetDriveID, GetDriveType, isBaiduUser, isCloud123User, isDrive115User } from '../../aliapi/utils'
import { IAliGetDirModel } from '../../aliapi/alimodels'
import { apiCloud123FileList, mapCloud123FileToAliModel } from '../../cloud123/dirfilelist'
import { apiDrive115FileList, mapDrive115FileToAliModel } from '../../cloud115/dirfilelist'
import { apiBaiduFileList, mapBaiduFileToAliModel } from '../../cloudbaidu/dirfilelist'

const iconfolder = h('i', { class: 'iconfont iconfile-folder' })
const foldericonfn = () => iconfolder

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  selecttype: {
    type: String,
    required: true
  },
  selectid: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: false
  },
  extFilter: {
    type: RegExp,
    required: false
  },
  callback: {
    type: Function as PropType<(user_id: string, drive_id: string, selectFile: any) => void>
  }
})

const okLoading = ref(false)
const pantreeStore = usePanTreeStore()
const winStore = useWinStore()
const treeHeight = computed(() => (winStore.height * 8) / 10 - 126)

const title = ref('')
const user_id = ref('')
const drive_id = ref('')
const selectFile = ref({
  drive_id: pantreeStore.backup_drive_id,
  name: '备份盘',
  file_id: 'backup_root',
  parent_file_id: '',
  path: '',
  description: '',
  isDir: true
})

const handleOpen = async () => {
  if (props.selecttype == 'copy') title.value = '复制文件到. . .  '
  if (props.selecttype == 'cut') title.value = '移动文件到. . .  '
  if (props.selecttype == 'share') title.value = '保存分享文件到. . .  '
  if (props.selecttype == 'unzip') title.value = '解压文件保存到. . .  '
  if (props.selecttype == 'select') title.value = '选择一个文件. . .  '
  okLoading.value = true
  user_id.value = pantreeStore.user_id
  drive_id.value = pantreeStore.drive_id
  const isCloudUser = isCloud123User(user_id.value)
  const isDrive115 = isDrive115User(user_id.value)
  const isBaidu = isBaiduUser(user_id.value)
  const isSingleRootDrive = isCloudUser || isDrive115 || isBaidu
  const driveType = GetDriveType(user_id.value, drive_id.value)
  const expandedKeys: string[] = isSingleRootDrive ? [driveType.key] : ['backup_root', 'resource_root']
  const selectid = props.selectid || localStorage.getItem('selectpandir-' + drive_id.value) || ''
  if (selectid) {
    let backup_data: IAliGetDirModel[] = []
    let resource_data: IAliGetDirModel[] = []
    let data: IAliGetDirModel[] = []
    if (isSingleRootDrive) {
      const cloudDriveId = GetDriveID(user_id.value, driveType.key) || drive_id.value
      data = TreeStore.GetDirPath(cloudDriveId, selectid)
    } else {
      if (!useSettingStore().securityHideResourceDrive) {
        backup_data = TreeStore.GetDirPath(pantreeStore.backup_drive_id, selectid)
      }
      if (!useSettingStore().securityHideResourceDrive) {
        resource_data = TreeStore.GetDirPath(pantreeStore.resource_drive_id, selectid)
      }
      data = [...backup_data, ...resource_data]
    }
    if (data && data.length > 0) {
      for (let i = 0, maxi = data.length; i < maxi; i++) {
        const item = data[i]
        expandedKeys.push(item.file_id)
        if (item.file_id == selectid) {
          props.selecttype == 'select' && expandedKeys.pop()
          selectFile.value = {
            drive_id: item.drive_id,
            name: item.name,
            file_id: item.file_id,
            parent_file_id: item.parent_file_id,
            path: item.path || '',
            description: item.description,
            isDir: true
          }
        }
      }
    }
    treeSelectedKeys.value = [selectid]
    setTimeout(() => {
      treeref.value?.treeRef?.scrollTo({ key: selectid, offset: 100, align: 'top' })
    }, 400)
  } else {
    if (isSingleRootDrive) {
      selectFile.value = {
        drive_id: drive_id.value,
        name: driveType.title,
        file_id: driveType.key,
        parent_file_id: '',
        path: driveType.key === 'baidu_root' ? '/' : '',
        description: '',
        isDir: true
      }
      treeSelectedKeys.value = [driveType.key]
    } else {
      selectFile.value = {
        drive_id: pantreeStore.backup_drive_id,
        name: '备份盘',
        file_id: 'backup_root',
        parent_file_id: '',
        path: '',
        description: '',
        isDir: true
      }
      treeSelectedKeys.value = ['backup_root']
    }
  }
  treeExpandedKeys.value = expandedKeys
  // 网盘数据
  const flag = props.selecttype === 'select'
  if (isSingleRootDrive) {
    const cloudDriveId = GetDriveID(user_id.value, driveType.key) || drive_id.value
    treeData.value = PanDAL.GetPanTreeAllNode(user_id.value, cloudDriveId, treeExpandedKeys.value, !flag, flag)
  } else {
    let backupPan: TreeNodeData[] = []
    let resourcePan: TreeNodeData[] = []
    if (!useSettingStore().securityHideBackupDrive) {
      backupPan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.backup_drive_id, treeExpandedKeys.value, !flag, flag)
    }
    if (!useSettingStore().securityHideResourceDrive) {
      resourcePan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.resource_drive_id, treeExpandedKeys.value, !flag, flag)
    }
    treeData.value = [...backupPan, ...resourcePan]
  }
  okLoading.value = false
}

const handleClose = () => {
  if (okLoading.value) okLoading.value = false
  user_id.value = ''
  drive_id.value = ''
  const driveType = GetDriveType(pantreeStore.user_id, pantreeStore.drive_id)
  selectFile.value = {
    drive_id: pantreeStore.drive_id || pantreeStore.backup_drive_id,
    name: driveType.title,
    file_id: driveType.key,
    parent_file_id: '',
    path: driveType.key === 'baidu_root' ? '/' : '',
    description: '',
    isDir: true
  }
  if (isCloud123User(pantreeStore.user_id) || isDrive115User(pantreeStore.user_id) || isBaiduUser(pantreeStore.user_id)) {
    treeData.value = [{
      __v_skip: true,
      key: driveType.key,
      drive_id: pantreeStore.drive_id,
      parent_file_id: '',
      title: driveType.title,
      namesearch: '',
      isLeaf: false,
      icon: foldericonfn,
      children: []
    }]
  } else {
    treeData.value = [{
      __v_skip: true,
      key: 'backup_root',
      parent_file_id: '',
      title: '备份盘',
      namesearch: '',
      isLeaf: false,
      icon: foldericonfn,
      children: []
    }, {
      __v_skip: true,
      key: 'resource_root',
      parent_file_id: '',
      title: '资源盘',
      namesearch: '',
      isLeaf: false,
      icon: foldericonfn,
      children: []
    }]
  }
  treeExpandedKeys.value = []
  treeSelectedKeys.value = []
}

const treeref = ref()
const treeData = ref<TreeNodeData[]>([{
  __v_skip: true,
  key: 'backup_root',
  parent_file_id: '',
  title: '备份盘',
  namesearch: '',
  isLeaf: false,
  icon: foldericonfn,
  children: []
}, {
  __v_skip: true,
  key: 'resource_root',
  parent_file_id: '',
  title: '资源盘',
  namesearch: '',
  isLeaf: false,
  icon: foldericonfn,
  children: []
}])
const treeExpandedKeys = ref<string[]>([])
const treeSelectedKeys = ref<string[]>([])

const handleTreeSelect = (keys: any[], info: {
  event: string;
  selected: Boolean;
  nativeEvent: MouseEvent;
  node: any
}) => {
  let { key, title, isLeaf, description, parent_file_id } = info.node
  const getParentNode = (node: any): any => {
    return node.parent ? getParentNode(node.parent) : node
  }
  const parentNode = getParentNode(info.node)
  const drive_id = GetDriveID(user_id.value, parentNode.key || key)
  localStorage.setItem('selectpandir-' + drive_id, key)
  selectFile.value = {
    drive_id: drive_id,
    name: title,
    file_id: key,
    parent_file_id: parent_file_id,
    path: info.node.path || '',
    description: description,
    isDir: !isLeaf
  }
  treeSelectedKeys.value = [key]
  treeSelectToExpand(keys, info)
}

const apiLoad = (key: any) => {
  const onlyDirs = props.selecttype === 'offline'
  if (isCloud123User(user_id.value)) {
    const parentFileId = key.includes('root') ? 0 : Number(key)
    return apiCloud123FileList(user_id.value, parentFileId, 100, false)
      .then((list) => {
        const addList: TreeNodeData[] = []
        for (let i = 0, maxi = list.length; i < maxi; i++) {
          const mapped = mapCloud123FileToAliModel(list[i])
          if (!mapped.isDir) {
            if (onlyDirs) continue
            if (props.category && mapped.category !== props.category) continue
            if (props.extFilter && !props.extFilter.test(mapped.ext)) continue
          }
          addList.push({
            __v_skip: true,
            key: mapped.file_id,
            parent_file_id: mapped.parent_file_id,
            path: mapped.path || '',
            title: mapped.name,
            children: [],
            isDir: mapped.isDir,
            isLeaf: !mapped.isDir,
            description: mapped.description,
            icon: mapped.isDir ? foldericonfn : () => fileiconfn(mapped.icon)
          } as TreeNodeData)
        }
        autoExpand(addList)
        return addList
      })
      .catch(() => {
        return [] as TreeNodeData[]
      })
  }
  if (isDrive115User(user_id.value)) {
    const parentCid = key.includes('root') ? 0 : Number(key)
    return apiDrive115FileList(user_id.value, parentCid, 200, 0, true)
      .then((list) => {
        const addList: TreeNodeData[] = []
        for (let i = 0, maxi = list.length; i < maxi; i++) {
          const mapped = mapDrive115FileToAliModel(list[i], drive_id.value)
          if (!mapped.isDir) {
            if (onlyDirs) continue
            if (props.category && mapped.category !== props.category) continue
            if (props.extFilter && !props.extFilter.test(mapped.ext)) continue
          }
          addList.push({
            __v_skip: true,
            key: mapped.file_id,
            parent_file_id: mapped.parent_file_id,
            path: mapped.path || '',
            title: mapped.name,
            children: [],
            isDir: mapped.isDir,
            isLeaf: !mapped.isDir,
            description: mapped.description,
            icon: mapped.isDir ? foldericonfn : () => fileiconfn(mapped.icon)
          } as TreeNodeData)
        }
        autoExpand(addList)
        return addList
      })
      .catch(() => {
        return [] as TreeNodeData[]
      })
  }
  if (isBaiduUser(user_id.value)) {
    const parentPath = key.includes('root') ? '/' : key
    return apiBaiduFileList(user_id.value, parentPath, 'name', 0, 1000)
      .then((list) => {
        const addList: TreeNodeData[] = []
        for (let i = 0, maxi = list.length; i < maxi; i++) {
          const mapped = mapBaiduFileToAliModel(list[i], drive_id.value, '/')
          if (!mapped.isDir) {
            if (onlyDirs) continue
            if (props.category && mapped.category !== props.category) continue
            if (props.extFilter && !props.extFilter.test(mapped.ext)) continue
          }
          addList.push({
            __v_skip: true,
            key: mapped.path || mapped.file_id,
            parent_file_id: mapped.parent_file_id,
            path: mapped.path || '',
            title: mapped.name,
            children: [],
            isDir: mapped.isDir,
            isLeaf: !mapped.isDir,
            description: mapped.description,
            icon: mapped.isDir ? foldericonfn : () => fileiconfn(mapped.icon)
          } as TreeNodeData)
        }
        autoExpand(addList)
        return addList
      })
      .catch(() => {
        return [] as TreeNodeData[]
      })
  }
  return AliTrash.ApiDirFileListNoLock(user_id.value, selectFile.value.drive_id, key, '', 'name ASC')
    .then((resp) => {
      const addList: TreeNodeData[] = []
      if (resp.next_marker == '') {
        for (let i = 0, maxi = resp.items.length; i < maxi; i++) {
          const item = resp.items[i]
          if (!item.isDir) {
            if (onlyDirs) continue
            if (props.category && item.category !== props.category) continue
            if (props.extFilter && !props.extFilter.test(item.ext)) continue
          }
          addList.push({
            __v_skip: true,
            key: item.file_id,
            parent_file_id: item.parent_file_id,
            path: item.path || '',
            title: item.name,
            children: [],
            isDir: item.isDir,
            isLeaf: !item.isDir,
            description: item.description,
            icon: item.isDir ? foldericonfn : () => fileiconfn(item.icon)
          } as TreeNodeData)
        }
        autoExpand(addList)
      } else {
        message.error('列出文件失败：' + resp.next_marker)
      }
      return addList
    })
    .catch(() => {
      return [] as TreeNodeData[]
    })
}

const autoExpand = (list: TreeNodeData[]) => {
  if (list.length < 4) {
    setTimeout(() => {
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        const item = list[i]
        if (item.isLeaf == false) {
          apiLoad(item.key).then((addList: TreeNodeData[]) => {
            item.children = addList
            if (treeData.value) treeData.value = treeData.value.concat()
            if (treeExpandedKeys.value) treeExpandedKeys.value.push(item.key)
          })
        }
      }
    }, 200)
  }
}

const onLoadData = (treeNode: any) => {
  return new Promise<void>((resolve) => {
    if ((props.selecttype !== 'select' && props.selecttype !== 'offline') || !treeNode.dataRef) {
      resolve()
      return
    }
    let key = treeNode.dataRef.key
    if (key.includes('root')) key = 'root'
    apiLoad(key).then((addList: TreeNodeData[]) => {
      treeNode.dataRef!.children = addList
      if (treeData.value) treeData.value = treeData.value.concat()
      resolve()
    })
  })
}

const handleTreeExpand = (keys: any[], info: {
  node: any;
  expanded: boolean;
  nativeEvent: MouseEvent
}) => {
  const arr = treeExpandedKeys.value
  let { key } = info.node
    if (arr.includes(key)) {
      treeExpandedKeys.value = arr.filter((t) => t != key)
    } else {
      treeExpandedKeys.value = arr.concat([key])
      if (props.selecttype !== 'select' && props.selecttype !== 'offline') { // 仅显示文件夹
      if (isCloud123User(user_id.value) || isDrive115User(user_id.value) || isBaiduUser(user_id.value)) {
        const driveType = GetDriveType(user_id.value, drive_id.value)
        const cloudDriveId = GetDriveID(user_id.value, driveType.key) || drive_id.value
        treeData.value = PanDAL.GetPanTreeAllNode(user_id.value, cloudDriveId, treeExpandedKeys.value)
      } else {
        let backupPan: TreeNodeData[] = []
        let resourcePan: TreeNodeData[] = []
        if (!useSettingStore().securityHideBackupDrive) {
          backupPan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.backup_drive_id, treeExpandedKeys.value)
        }
        if (!useSettingStore().securityHideResourceDrive) {
          resourcePan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.resource_drive_id, treeExpandedKeys.value)
        }
        treeData.value = [...backupPan, ...resourcePan]
      }
    }
  }
}


const showCreatNewDir = ref(false)
const formRef = ref()
const form = reactive({ dirName: '' })
const rules = [
  { required: true, message: '文件夹名必填' },
  { minLength: 1, message: '文件夹名不能为空' },
  { maxLength: 100, message: '文件夹名太长(100)' },
  {
    validator: (value: string, cb: any) => {
      const chk = CheckFileName(value)
      if (chk) cb('文件夹名' + chk)
    }
  }
]
const handleCloseNewDir = () => {
  if (okLoading.value) okLoading.value = false
  formRef.value.resetFields()
}

const handleHide = () => {
  modalCloseAll()
  if (props.selecttype === 'select') {
    if (props.callback) {
      props.callback(user_id.value, drive_id.value, selectFile.value)
    }
  }
}
const handleCreatNew = () => {
  showCreatNewDir.value = true
  setTimeout(() => {
    document.getElementById('SelectDirCreatNewDirInput')?.focus()
  }, 200)
}
const handleHideNewDir = () => {
  showCreatNewDir.value = false
}
const handleOKNewDir = () => {
  formRef.value.validate((data: any) => {
    if (data) return

    const newName = ClearFileName(form.dirName)
    if (!newName) {
      message.error('新建文件夹失败 文件夹名不能为空')
      return
    }

    okLoading.value = true
    let newdirid = ''
    let selectFileId = selectFile.value.file_id
    AliFileCmd.ApiCreatNewForder(user_id.value, drive_id.value, selectFileId, newName)
      .then((data) => {
        if (data.error) message.error('新建文件夹 失败' + data.error)
        else {
          newdirid = data.file_id
          message.success('新建文件夹 成功')
          return PanDAL.GetDirFileList(user_id.value, drive_id.value, selectFileId, '', '', false)
        }
      })
      .catch((err: any) => {
        message.error('新建文件夹 失败', err)
      })
      .then(async () => {
        if (selectFileId == pantreeStore.selectDir.file_id) {
          await PanDAL.aReLoadOneDirToShow('', 'refresh', false)
        }
        await Sleep(200)
        selectFile.value = {
          drive_id: drive_id.value,
          name: newName,
          file_id: newdirid,
          parent_file_id: selectFile.value.parent_file_id,
          path: '',
          description: '',
          isDir: true
        }
        treeExpandedKeys.value = treeExpandedKeys.value.concat([selectFile.value.file_id, newdirid])
        let backupPan: TreeNodeData[] = []
        let resourcePan: TreeNodeData[] = []
        if (!useSettingStore().securityHideBackupDrive) {
          backupPan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.backup_drive_id, treeExpandedKeys.value)
        }
        if (!useSettingStore().securityHideResourceDrive) {
          resourcePan = PanDAL.GetPanTreeAllNode(user_id.value, pantreeStore.resource_drive_id, treeExpandedKeys.value)
        }
        treeData.value = [...backupPan, ...resourcePan]
        treeSelectedKeys.value = [newdirid]
        okLoading.value = false
        showCreatNewDir.value = false
      })
  })
}
const handleOK = () => {
  if (props.selecttype === 'select' && selectFile.value.isDir) {
    message.error('请选择一个文件')
    return
  }
  if (props.selecttype === 'offline' && !selectFile.value.isDir) {
    message.error('请选择一个文件夹')
    return
  }
  modalCloseAll()
  if (props.callback) {
    console.warn('SelectPanDirModal.selectFile', selectFile.value)
    props.callback(user_id.value, drive_id.value, selectFile.value)
  }
}

</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass showpandirmodal'
           :footer='false'
           :unmount-on-close='true'
           :mask-closable='false'
           @cancel='handleHide'
           @before-open='handleOpen'
           @close='handleClose'>
    <template #title>
      <span class='modaltitle'>{{ title }} {{ selecttype !== 'select' ? '选择一个位置' : '' }}</span>
    </template>
    <div class='pandirmodalbody'>
      <AntdTree
        ref='treeref'
        :tabindex='-1'
        :focusable='false'
        class='pandirtree'
        block-node
        selectable
        :auto-expand-parent='false'
        show-icon
        :height='treeHeight'
        :style="{ height: treeHeight + 'px' }"
        :item-height='30'
        :show-line='{ showLeafIcon: false }'
        :expanded-keys='treeExpandedKeys'
        :selected-keys='treeSelectedKeys'
        :tree-data='treeData'
        :load-data='onLoadData'
        @select='handleTreeSelect'
        @expand='handleTreeExpand'>
        <template #switcherIcon>
          <i class='ant-tree-switcher-icon iconfont Arrow' />
        </template>
        <template #icon>
          <i class='iconfont iconfile-folder' />
        </template>
        <template #title='{ dataRef }'>
          <span class='sharetitleleft'>{{ dataRef.title }}</span>
        </template>
      </AntdTree>
    </div>
    <div id='selectdir'>已选择：{{ selectFile.name }}</div>
    <div class='modalfoot'>
      <a-button v-if="selecttype !== 'select'" type='outline' size='small' @click='handleCreatNew'>新建文件夹</a-button>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' tabindex='-1' @click='handleHide'>取消</a-button>
      <a-button type='primary' size='small' tabindex='-1' :loading='okLoading' @click='handleOK'>选择</a-button>
    </div>
  </a-modal>

  <a-modal :visible='showCreatNewDir' modal-class='modalclass' :footer='false' :unmount-on-close='true'
           :mask-closable='false' @cancel='handleHideNewDir' @close='handleCloseNewDir'>
    <template #title>
      <span class='modaltitle'>新建文件夹</span>
    </template>
    <div class='modalbody' style='width: 440px'>
      <a-form ref='formRef' :model='form' layout='vertical'>
        <a-form-item field='dirName' :rules='rules'>
          <template #label>文件夹名：<span class='opblue' style='margin-left: 16px; font-size: 12px'> 不要有特殊字符 &lt; > : * ? \\ / \' " </span>
          </template>
          <a-input v-model.trim='form.dirName' placeholder='例如：新建文件夹' allow-clear
                   :input-attrs="{ id: 'SelectDirCreatNewDirInput', autofocus: 'autofocus' }" />
        </a-form-item>
      </a-form>
      <br />
    </div>
    <div class='modalfoot'>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleHideNewDir'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOKNewDir'>创建</a-button>
    </div>
  </a-modal>
</template>

<style>
#selectdir {
  text-align: left;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 18px;
  overflow: hidden;
  -o-text-overflow: ellipsis;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: keep-all;
  color: var(--color-text-3);
  height: 18px;
  width: 80vw;
}

.showpandirmodal .arco-modal-header {
  border-bottom: none;
}

.showpandirmodal .arco-modal-body {
  width: 80vw;
  max-width: 860px;
  margin-left: 16px;
  overflow: hidden;
  padding: 0 16px 16px 16px !important;
}

.pandirmodalbody {
  padding-bottom: 16px
}

.showpandirmodal .modaltitle {
  width: 80vw;
  max-width: 860px;
  flex-wrap: nowrap;
  display: flex;
  justify-content: center;
}

.pandirtree {
  border: 1px solid var(--color-neutral-3);
  padding: 4px;
}

.pandirtree .ant-tree-icon__customize .iconfont {
  font-size: 18px;
  margin-right: 2px;
}

.pandirtree .ant-tree-node-content-wrapper {
  flex: auto;
  display: flex !important;
  flex-direction: row;
}

.pandirtree .ant-tree-title {
  flex: auto;
  display: flex !important;
  flex-direction: row;
}

.pandirtree .sharetitleleft {
  flex-shrink: 1;
  flex-grow: 1;
  display: -webkit-box;
  max-height: 48px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
}

.pandirtree .sharetitleleft.new {
  color: rgb(var(--primary-6));
}

.pandirtree .sharetitleright {
  padding-left: 12px;
  padding-right: 12px;
  font-size: 12px;
  color: var(--color-text-3);
  flex-shrink: 0;
  flex-grow: 0;
}
</style>

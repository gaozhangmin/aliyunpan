<script lang='ts'>
import { modalCloseAll } from '../../utils/modal'
import { computed, defineComponent, h, PropType, reactive, ref } from 'vue'
import { usePanTreeStore, useWinStore } from '../../store'
import { CheckFileName, ClearFileName } from '../../utils/filehelper'
import { Tree as AntdTree } from 'ant-design-vue'
import 'ant-design-vue/es/tree/style/css'
import { EventDataNode } from 'ant-design-vue/es/tree'
import TreeStore, { TreeNodeData } from '../../store/treestore'
import message from '../../utils/message'
import AliFileCmd from '../../aliapi/filecmd'
import PanDAL from '../pandal'
import { Sleep } from '../../utils/format'
import { treeSelectToExpand } from '../../utils/antdtree'
import AliTrash from '../../aliapi/trash'
import { fileiconfn } from '../pantreestore'

const iconfolder = h('i', { class: 'iconfont iconfile-folder' })
const foldericonfn = () => iconfolder
export default defineComponent({
  components: {
    AntdTree
  },
  props: {
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
      type: Function as PropType<(user_id: string, drive_id: string, dirID: string, dirName: string) => void>
    }
  },

  setup(props) {
    const okLoading = ref(false)

    const pantreeStore = usePanTreeStore()
    const winStore = useWinStore()
    const treeHeight = computed(() => (winStore.height * 8) / 10 - 126)

    const title = ref('')
    const user_id = ref('')
    const drive_id = ref('')
    const selectDir = ref({ dirID: 'root', dirName: '根目录', isLeaf: false })

    const handleOpen = async () => {
      if (props.selecttype == 'copy') title.value = '复制文件到. . .  '
      if (props.selecttype == 'cut') title.value = '移动文件到. . .  '
      if (props.selecttype == 'share') title.value = '保存分享文件到. . .  '
      if (props.selecttype == 'unzip') title.value = '解压文件保存到. . .  '
      if (props.selecttype == 'select') title.value = '选择一个文件. . .  '
      okLoading.value = true
      user_id.value = pantreeStore.user_id
      drive_id.value = pantreeStore.drive_id
      const expandedKeys: string[] = ['root']
      const selectid = props.selectid || localStorage.getItem('selectBackupPanDir-' + drive_id.value) || ''
      if (selectid) {
        const data = TreeStore.GetDirPath(pantreeStore.drive_id, selectid)
        if (data && data.length > 0) {
          for (let i = 0, maxi = data.length; i < maxi; i++) {
            const item = data[i]
            expandedKeys.push(item.file_id)
            if (item.file_id == selectid) {
              props.selecttype == 'select' && expandedKeys.pop()
              selectDir.value = { dirID: item.file_id, dirName: item.name, isLeaf: false }
            }
          }
        }
        treeSelectedKeys.value = [selectid!]
        setTimeout(() => {
          treeref.value?.treeRef?.scrollTo({ key: selectid, offset: 100, align: 'top' })
        }, 400)
      } else {
        selectDir.value = { dirID: 'root', dirName: '根目录', isLeaf: false }
        treeSelectedKeys.value = ['root']
      }
      treeExpandedKeys.value = expandedKeys
      const flag = props.selecttype === 'select'
      treeData.value = PanDAL.GetPanTreeAllNode(drive_id.value, treeExpandedKeys.value, !flag, flag)
      okLoading.value = false
    }

    const handleClose = () => {
      if (okLoading.value) okLoading.value = false
      user_id.value = ''
      drive_id.value = ''
      selectDir.value = { dirID: 'root', dirName: '根目录', isLeaf: false }
      treeData.value = [{
        __v_skip: true,
        key: 'root',
        title: '根目录',
        namesearch: '',
        isLeaf: false,
        icon: foldericonfn,
        children: []
      }]
      treeExpandedKeys.value = []
      treeSelectedKeys.value = []
    }

    const treeref = ref()
    const treeData = ref<TreeNodeData[]>([{
      __v_skip: true,
      key: 'root',
      title: '根目录',
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
      node: EventDataNode
    }) => {
      localStorage.setItem('selectBackupPanDir-' + drive_id.value, info.node.key as string)
      selectDir.value = { dirID: info.node.key as string, dirName: info.node.title as string, isLeaf: info.node.isLeaf || false }
      treeSelectedKeys.value = [info.node.key as string]
      treeSelectToExpand(keys, info)
    }

    const apiLoad = (key: any) => {
      const pantreeStore = usePanTreeStore()
      return AliTrash.ApiDirFileListNoLock(pantreeStore.user_id, pantreeStore.drive_id, key as string, '', 'name ASC')
        .then((resp) => {
          const addList: TreeNodeData[] = []
          if (resp.next_marker == '') {
            for (let i = 0, maxi = resp.items.length; i < maxi; i++) {
              const item = resp.items[i]
              if (!item.isDir) {
                if (props.category && item.category !== props.category) continue
                if (props.extFilter && !props.extFilter.test(item.ext)) continue
              }
              addList.push({
                __v_skip: true,
                key: item.file_id,
                title: item.name,
                children: [],
                isDir: item.isDir,
                isLeaf: !item.isDir,
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

    const onLoadData = (treeNode: EventDataNode) => {
      return new Promise<void>((resolve) => {
        if (props.selecttype !== 'select' || !treeNode.dataRef) {
          resolve()
          return
        }
        apiLoad(treeNode.dataRef.key).then((addList: TreeNodeData[]) => {
          treeNode.dataRef!.children = addList
          if (treeData.value) treeData.value = treeData.value.concat()
          resolve()
        })
      })
    }

    const handleTreeExpand = (keys: any[], info: {
      node: EventDataNode;
      expanded: boolean;
      nativeEvent: MouseEvent
    }) => {
      const key = info.node.key as string
      const arr = treeExpandedKeys.value
      if (arr.includes(key)) {
        treeExpandedKeys.value = arr.filter((t) => t != key)
      } else {
        treeExpandedKeys.value = arr.concat([key])
        if (props.selecttype !== 'select') { // 仅显示文件夹
          treeData.value = PanDAL.GetPanTreeAllNode(drive_id.value, treeExpandedKeys.value)
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
    return {
      title,
      okLoading,
      handleOpen,
      handleClose,
      treeHeight,
      treeref,
      handleTreeSelect,
      handleTreeExpand,
      treeData,
      onLoadData,
      treeExpandedKeys,
      treeSelectedKeys,
      user_id,
      drive_id,
      selectDir,
      showCreatNewDir,
      formRef,
      form,
      rules,
      handleCloseNewDir
    }
  },
  methods: {
    handleHide() {
      modalCloseAll()
      if (this.selecttype === 'select') {
        if (this.callback) {
          this.callback('', '', '', '')
        }
      }
    },
    handleCreatNew() {
      this.showCreatNewDir = true
      setTimeout(() => {
        document.getElementById('SelectDirCreatNewDirInput')?.focus()
      }, 200)
    },
    handleHideNewDir() {
      this.showCreatNewDir = false
    },
    handleOKNewDir() {
      this.formRef.validate((data: any) => {
        if (data) return

        const newName = ClearFileName(this.form.dirName)
        if (!newName) {
          message.error('新建文件夹失败 文件夹名不能为空')
          return
        }

        this.okLoading = true
        let newdirid = ''
        AliFileCmd.ApiCreatNewForder(this.user_id, this.drive_id, this.selectDir.dirID, newName)
          .then((data) => {
            if (data.error) message.error('新建文件夹 失败' + data.error)
            else {
              newdirid = data.file_id
              message.success('新建文件夹 成功')
              return PanDAL.GetDirFileList(this.user_id, this.drive_id, this.selectDir.dirID, '', false)
            }
          })
          .catch((err: any) => {
            message.error('新建文件夹 失败', err)
          })
          .then(async () => {
            const pantreeStore = usePanTreeStore()
            if (this.selectDir.dirID == pantreeStore.selectDir.file_id) PanDAL.aReLoadOneDirToShow('', 'refresh', false)
            await Sleep(200)
            this.selectDir = { dirID: newdirid, dirName: newName, isLeaf: false }
            this.treeExpandedKeys = this.treeExpandedKeys.concat([this.selectDir.dirID, newdirid])
            this.treeData = PanDAL.GetPanTreeAllNode(this.drive_id, this.treeExpandedKeys)
            this.treeSelectedKeys = [newdirid]
            this.okLoading = false
            this.showCreatNewDir = false
          })
      })
    },
    handleOK() {
      if (this.selecttype === 'select' && !this.selectDir.isLeaf) {
        message.error('请选择一个文件')
        return
      }
      modalCloseAll()
      if (this.callback) {
        this.callback(this.user_id, this.drive_id, this.selectDir.dirID, this.selectDir.dirName)
      }
    }
  }
})
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass showsharemodal' :footer='false' :unmount-on-close='true'
           :mask-closable='false' @cancel='handleHide' @before-open='handleOpen' @close='handleClose'>
    <template #title>
      <span class='modaltitle'>{{ title }}选择一个位置</span>
    </template>
    <div class='modalbody' style='width: 80vw; max-width: 860px; height: calc(80vh - 100px); padding-bottom: 16px'>
      <AntdTree
        ref='treeref'
        :tabindex='-1'
        :focusable='false'
        class='sharetree'
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
    <div id='selectdir'>已选择：{{ selectDir.dirName }}</div>
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
</style>

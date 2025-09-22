<script lang='ts'>
import { usePanTreeStore } from '../../store'
import message from '../../utils/message'
import { modalCloseAll } from '../../utils/modal'
import { CheckFileName, ClearFileName } from '../../utils/filehelper'
import { defineComponent, reactive, ref } from 'vue'
import PanDAL from '../pandal'
import AliAlbum from '../../aliapi/album'

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const okLoading = ref(false)
    const formRef = ref()
    const form = reactive({
      fileName: '',
      fileContext: ''
    })
    const handleOpen = () => {
      setTimeout(() => {
        document.getElementById('CreatNewAlbumInput')?.focus()
      }, 200)
      form.fileName = ''
      form.fileContext = ''
    }

    const handleClose = () => {
      if (okLoading.value) okLoading.value = false
      formRef.value.resetFields()
    }

    const rules = [
      { required: true, message: '相册名必填' },
      { minLength: 1, message: '相册名不能为空' },
      { maxLength: 100, message: '相册名太长(100)' },
      {
        validator: (value: string, cb: any) => {
          const chk = CheckFileName(value)
          if (chk) cb('相册名' + chk)
        }
      }
    ]

    return { okLoading, form, formRef, handleOpen, handleClose, rules }
  },
  methods: {
    handleHide() {
      modalCloseAll()
    },
    handleOK() {
      this.formRef.validate((data: any) => {
        if (data) return
        const pantreeStore = usePanTreeStore()
        const newName = ClearFileName(this.form.fileName)
        if (!newName) {
          message.error('创建相册失败 相册名不能为空')
          return
        }
        this.okLoading = true
        AliAlbum.ApiAlbumCreate(pantreeStore.user_id, newName, this.form.fileContext)
          .then((data) => {
            this.okLoading = false
            if (data && data == 'success') {
              PanDAL.aReLoadOneDirToShow('', 'refresh', false)
              message.success('创建相册 成功')
              modalCloseAll()
            } else {
              message.error('创建相册 失败 ' + data)
            }
          })
          .catch((err: any) => {
            this.okLoading = false
            message.error('创建相册 失败 ' + (err.message || ''))
          })
      })
    }
  }
})
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass' :footer='false' :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @close='handleClose' @before-open='handleOpen'>
    <template #title>
      <span class='modaltitle'>创建相册</span>
    </template>
    <div class='modalbody' style='width: 80vw; max-width: 420px; height: calc(80vh - 300px)'>
      <a-form ref='formRef' :model='form' layout='vertical' style='height: 100%; display: flex'>
        <a-form-item field='fileName' :rules='rules'>
          <template #label>相册名：<span class='opblue' style='margin-left: 16px; font-size: 12px'> 不要有特殊字符 &lt; > : * ? \\ / \' " </span>
          </template>
          <a-input v-model.trim='form.fileName' placeholder='例如：我的相册' allow-clear
                   :input-attrs="{ id: 'CreatNewAlbumInput', autofocus: 'autofocus' }" />
        </a-form-item>
        <a-form-item field='fileContext' label='相册描述：' class='textareafill'>
          <a-textarea v-model='form.fileContext' placeholder='添加相册描述' show-word-limit
                      @keydown='(e:any) => e.stopPropagation()' />
        </a-form-item>
      </a-form>
    </div>
    <div class='modalfoot'>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>创建</a-button>
    </div>
  </a-modal>
</template>

<style>
.textareafill {
  flex-grow: 1;
  display: flex !important;
  flex-direction: column;
}

.textareafill .arco-form-item-wrapper-col {
  flex-grow: 1;
}

.textareafill .arco-form-item-wrapper-col .arco-form-item-content-wrapper,
.textareafill .arco-form-item-wrapper-col .arco-form-item-content,
.textareafill .arco-form-item-wrapper-col .arco-textarea-wrapper,
.textareafill .arco-form-item-wrapper-col .arco-textarea {
  height: 100%;
}
</style>

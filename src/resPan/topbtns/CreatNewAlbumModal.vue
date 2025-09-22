<script lang="ts">
import AliFileCmd from '../../aliapi/filecmd'
import { useResPanTreeStore, useSettingStore } from '../../store'
import message from '../../utils/message'
import { modalCloseAll } from '../../utils/modal'
import { CheckFileName, ClearFileName } from '../../utils/filehelper'
import { defineComponent, ref, reactive, PropType } from 'vue'
import PanDAL from '../pandal'
import AliAlbum from "../../aliapi/album";

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
      dirName: '',
      dirIndex: 1
    })
    const handleOpen = () => {
      setTimeout(() => {
        document.getElementById('CreatNewAlbumInput')?.focus()
      }, 200)
      form.dirName = ''
      form.dirIndex = 1
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
        const newName = ClearFileName(this.form.dirName)
        if (!newName) {
          message.error('新建相册失败 相册名不能为空')
          return
        }

        this.okLoading = true
        let newdirid = ''
        AliAlbum.ApiAlbumCreate(newName, '')
          .then((data) => {
            if (data.error){
              message.error('新建相册 失败' + data.error)
            } else {
              newdirid = data.album_id
              message.success('新建相册 成功')
            }
          })
          .catch((err: any) => {
            message.error('新建相册 失败 ' + (err.message || ''))
          })
          .then(() => {
            modalCloseAll()
          })
      })
    }
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">新建相册</span>
    </template>
    <div class="modalbody" style="width: 440px">
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item field="dirName" :rules="rules">
          <template #label>相册名：<span class="opblue" style="margin-left: 16px; font-size: 12px"> 不要有特殊字符 &lt; > : * ? \\ / \' " </span> </template>
          <a-input v-model.trim="form.dirName" placeholder="例如：新建相册" allow-clear :input-attrs="{ id: 'CreatNewAlbumInput', autofocus: 'autofocus' }" />
        </a-form-item>
      </a-form>
      <br />
    </div>
    <div class="modalfoot">
      <a-button v-if="false" type="outline" size="small" @click="handleHide">批量创建</a-button>
      <div style="flex-grow: 1"></div>
      <a-button v-if="!okLoading" type="outline" size="small" @click="handleHide">取消</a-button>
      <a-button type="primary" size="small" :loading="okLoading" @click="handleOK">创建</a-button>
    </div>
  </a-modal>
</template>

<style></style>

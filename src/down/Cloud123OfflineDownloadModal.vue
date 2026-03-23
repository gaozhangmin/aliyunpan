<script setup lang="ts">
import { reactive, ref } from 'vue'
import { modalCloseAll, modalSelectPanDir } from '../utils/modal'
import { useModalStore, useUserStore } from '../store'
import { isCloud123User } from '../aliapi/utils'
import message from '../utils/message'
import DownDAL from './DownDAL'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const formRef = ref()
const okLoading = ref(false)
const modalStore = useModalStore()
const form = reactive({
  url: '',
  fileName: '',
  dirId: '',
  dirName: '默认（来自:离线下载）'
})

const handleOpen = () => {
  const preset = modalStore.modalData?.offlineForm
  if (preset) {
    form.url = preset.url || ''
    form.fileName = preset.fileName || ''
    form.dirId = preset.dirId || ''
    form.dirName = preset.dirName || '默认（来自:离线下载）'
  } else {
    form.url = ''
    form.fileName = ''
    form.dirId = ''
    form.dirName = '默认（来自:离线下载）'
  }
}

const handleClose = () => {
  if (okLoading.value) okLoading.value = false
}

const handleHide = () => {
  modalCloseAll()
}

const handleSelectDir = () => {
  const snapshot = {
    url: form.url,
    fileName: form.fileName,
    dirId: form.dirId,
    dirName: form.dirName
  }
  modalSelectPanDir('offline', form.dirId, (user_id: string, drive_id: string, selectFile: any) => {
    if (!selectFile || selectFile.isDir !== true) return
    if (selectFile.file_id && String(selectFile.file_id).includes('root')) {
      snapshot.dirId = ''
      snapshot.dirName = '默认（来自:离线下载）'
    } else {
      snapshot.dirId = String(selectFile.file_id || '')
      snapshot.dirName = selectFile.name || '已选择'
    }
    modalStore.showModal('cloud123offline', { offlineForm: snapshot })
  })
}

const handleCreate = async () => {
  const user = useUserStore().user_id
  if (!isCloud123User(user)) {
    message.error('当前账号不是123云盘')
    return
  }
  const url = form.url.trim()
  if (!url) {
    message.error('请输入离线下载地址')
    return
  }
  if (!/^https?:\/\//i.test(url)) {
    message.error('仅支持 http/https 链接')
    return
  }
  okLoading.value = true
  const result = await DownDAL.aAddCloud123OfflineDownload(url, form.fileName.trim(), form.dirId)
  okLoading.value = false
  if (!result.success) {
    message.error(result.message || '创建离线下载失败')
    return
  }
  message.success('离线下载任务已创建')
  modalCloseAll()
}
</script>

<template>
  <a-modal
    :visible="props.visible"
    modal-class="modalclass"
    :footer="false"
    :unmount-on-close="true"
    :mask-closable="false"
    @cancel="handleHide"
    @before-open="handleOpen"
    @close="handleClose"
  >
    <template #title>
      <span class="modaltitle">创建离线下载任务</span>
    </template>
    <div style="width: 520px">
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item field="url" label="下载链接">
          <a-input v-model.trim="form.url" placeholder="http/https 链接" />
        </a-form-item>
        <a-form-item field="fileName" label="自定义文件名（可选）">
          <a-input v-model.trim="form.fileName" placeholder="例如：视频.mp4" />
        </a-form-item>
        <a-form-item field="dirId" label="保存到">
          <a-input-search
            :readonly="true"
            button-text="选择文件夹"
            search-button
            :model-value="form.dirName"
            @search="handleSelectDir"
          />
          <div style="margin-top: 6px; color: var(--color-text-3); font-size: 12px">
            根目录不支持离线下载，未选择时将保存到“来自:离线下载”文件夹
          </div>
        </a-form-item>
        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <a-button type="outline" @click="handleHide">取消</a-button>
          <a-button type="primary" :loading="okLoading" @click="handleCreate">创建</a-button>
        </div>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import AliFile from '../../aliapi/file'
import { IVideoPreviewUrl } from '../../aliapi/models'
import { usePanFileStore, usePanTreeStore } from '../../store'
import { copyToClipboard } from '../../utils/electronhelper'
import { humanTime } from '../../utils/format'
import message from '../../utils/message'
import { modalCloseAll } from '../../utils/modal'
import { ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const okLoading = ref(false)

const user_id = ref('')
const drive_id = ref('')
const file_id = ref('')
const file_name = ref('')

const m3u8List = ref<{ value: string; label: string }[]>([])
const m3u8Info = ref('')
const videoPreview = ref<IVideoPreviewUrl>()
const handleOpen = async () => {
  okLoading.value = true
  const first = usePanFileStore().GetSelectedFirst()!
  user_id.value = usePanTreeStore().user_id
  drive_id.value = first.drive_id
  file_id.value = first.file_id
  file_name.value = first.name
  const info = await AliFile.ApiFileInfo(user_id.value, first.drive_id, first.file_id)
  if (!info) {
    message.error('读取文件链接失败，请重试')
    return
  }
  if (info.description && info.description.includes('xbyEncrypt')) {
    message.error('加密文件无法获取转码信息，请使用文件的属性获取下载链接')
    return
  }
  const data = await AliFile.ApiVideoPreviewUrl(user_id.value, first.drive_id, first.file_id)
  if (typeof data != 'string') {
    videoPreview.value = data
    let info = ''
    for (let item of data.qualities) {
      if (!info && item.label) {
        info = item.label
        break
      }
    }
    m3u8Info.value = '时长：' + humanTime(data.duration) + '  分辨率：' + data.width + ' x ' + data.height + '  清晰度：' + info
  } else {
    message.error(data)
  }
}

const handleDownload = (item: any) => {
  message.error('当前版本M3U8视频下载功能尚不可用，可以自行使用其他m3u8下载软件下载', 5)
  handleCopyUrl(item)
}

const handleCopyUrl = (item: any) => {
  if (item.url) {
    copyToClipboard(item.url)
    message.success(item.label + ' M3U8下载链接已复制到剪切板')
  }
}

const handleClose = () => {
  m3u8List.value = []
  user_id.value = ''
  drive_id.value = ''
  file_id.value = ''
  file_name.value = ''
  if (okLoading.value) okLoading.value = false
}

const handleHide = () => {
  modalCloseAll()
}
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false"
           @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">下载转码后的视频</span>
    </template>
    <div class="modalbody" style="width: 540px">
      <div style="width: 100%">
        <a-input :model-value="m3u8Info" readonly />
      </div>

      <div class="arco-upload-list arco-upload-list-type-text">
        <div v-for="(item, index) in videoPreview?.qualities" :key="index" class="arco-upload-list-item arco-upload-list-item-done">
          <div class="arco-upload-list-item-content">
            <div class="arco-upload-list-item-name">
              <span class="arco-upload-list-item-file-icon">
                <i class="iconfont iconluxiang"></i>
              </span>
              <a class="arco-upload-list-item-name-link" @click.stop="() => handleCopyUrl(item)">
                {{ file_name }}
              </a>
            </div>
            <span class="arco-upload-progress">
              <span class="arco-upload-icon arco-upload-icon-success" style="cursor: default">
                {{ item.label }}
              </span>
            </span>
          </div>
          <span class="arco-upload-list-item-operation">
            <a-button-group>
              <a-button type="outline" size="small" @click="() => handleCopyUrl(item)">复制</a-button>
              <a-button type="outline" size="small" @click="() => handleDownload(item)">下载</a-button>
            </a-button-group>
          </span>
        </div>
      </div>

      <a-typography style="background: var(--color-fill-2); padding: 8px; margin-top: 24px">
        <a-typography-paragraph>说明:</a-typography-paragraph>
        <ul>
          <li>转码视频下载功能当前版本不可用</li>
          <li>m3u8是一堆ts文件，下载后会自动合并成一个完整的文件</li>
        </ul>
      </a-typography>
    </div>
  </a-modal>
</template>

<style></style>

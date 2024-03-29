<script lang="ts">
import AliFile from '../../aliapi/file'
import { IVideoPreviewUrl } from '../../aliapi/models'
import {usePanFileStore, usePanTreeStore, useSettingStore} from '../../store'
import { copyToClipboard } from '../../utils/electronhelper'
import {humanSize, humanTime} from '../../utils/format'
import message from '../../utils/message'
import { modalCloseAll } from '../../utils/modal'
import { defineComponent, ref } from 'vue'
import AliHttp from "../../aliapi/alihttp";
import {IAliGetFileModel} from "../../aliapi/alimodels";
import M3u8DownloadDAL from "../../down/m3u8/M3u8DownloadDAL";
import path from "path";
import { isEmpty } from 'lodash'

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const okLoading = ref(false)

    const user_id = ref('')
    const drive_id = ref('')
    const file_id = ref('')
    const file_name = ref('')
    const fileItem = ref<IAliGetFileModel>()
    const settingStore = useSettingStore()
    const m3u8List = ref<string[]>([])
    const m3u8Info = ref('')
    const videoPreview = ref<IVideoPreviewUrl>()
    const handleOpen = async () => {
      okLoading.value = true
      const first = usePanFileStore().GetSelectedFirst()!
      fileItem.value = first
      user_id.value = usePanTreeStore().user_id
      drive_id.value = first.drive_id
      file_id.value = first.file_id
      file_name.value = first.name
      const info = await AliFile.ApiFileInfoOpenApi(user_id.value, first.drive_id, first.file_id)
      if (!info) {
        message.error('读取文件链接失败，请重试')
        return
      }

      const preview = await AliFile.ApiVideoPreviewUrl(user_id.value, first.drive_id, first.file_id)
      if (typeof preview == 'string') {
        message.error(preview)
      } else if (preview && preview.qualities) {
        videoPreview.value = preview
        let info = ''
        preview.qualities.forEach((item) => {
          m3u8List.value.push(item.value)
          if (info === '' || !info) {
            info = item.value
          } else {
            if (item.value === '2560p') {
              info = item.value
            } else if (item.value === '1080p' && (info === '720p' || info === '540p' || info === '480p')) {
              info = item.value
            } else if (item.value === '72op' && (info === '540p' || info === '480p')) {
              info = item.value
            } else if (item.value === '540p' && info === '480p') {
              info = item.value
            } else if (item.value === '480p' && (info === '' || !info)) {
              info = item.value
            }
          }
        })
        m3u8Info.value = '时长：' + humanTime(preview.duration) + '  分辨率：' + preview.width + ' x ' + preview.height + '  清晰度：' + info
      } else {
        message.error('视频的转码链接获取失败，请稍后重试')
      }
    }

    interface M3U8Segment {
      duration: number;
      url: string;
    }

    async function parseM3U8Url(m3u8FileDownloadUrl: string, baseUrl: string): Promise<string[]> {
        const resp = await AliHttp.GetString(m3u8FileDownloadUrl, '', 0, -1)
        const urls: string[] = [];
        if (AliHttp.IsSuccess(resp.code)) {
            const lines = resp.body.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // 解析出以 "#EXTINF:" 开头的行，其下一行为 URL
                if (line.startsWith('#EXTINF:')) {
                    const nextLine = lines[i + 1]?.trim();
                    if (nextLine) {
                        urls.push(baseUrl + nextLine);
                    }
                }
            }
        }
        return urls;
    }

    function parseBaseUrl(url: string): string | null {
      // 匹配关键字 "media.m3u8"
      const match = url.match(/(.*\/)media\.m3u8/i);
      if (match && match.length > 1) {
        return match[1];
      }
      return null;
    }

    const handleDownload = async (item: string, fileItem:IAliGetFileModel|undefined) => {
      const savePath = settingStore.AriaIsLocal ? settingStore.downSavePath : settingStore.ariaSavePath
      if (isEmpty(savePath)) {
        message.error('未设置保存路径')
        return
      }
      let url = ''
      if (item == '2560p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '2560p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '1080p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '1080p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '720p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '720p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '540p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '540p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '480p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '480p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      }
      const baseUrl = parseBaseUrl(url);
      if (baseUrl && fileItem) {
        const urls = await parseM3U8Url(url, baseUrl)
        if (urls && urls.length > 0) {
          const settingStore = useSettingStore()
          const savePath = settingStore.AriaIsLocal ? settingStore.downSavePath : settingStore.ariaSavePath
          const fullSavePath = savePath + path.sep + fileItem.name
          const fileList: IAliGetFileModel[] = []
          let m3u8FileNames = ''
          for (let i = 0; i < urls.length; i++) {
            m3u8FileNames += 'file ' + fullSavePath + path.sep + (i + '.ts') + '\n'
            const url = urls[i];
            fileList.push({
              __v_skip: true,
              drive_id: fileItem.drive_id,
              file_id: fileItem.file_id + i,
              parent_file_id: fileItem.parent_file_id,
              name: i + '.ts',
              namesearch: fileItem.namesearch,
              ext: "ts",
              category: fileItem.category,
              icon: fileItem.icon,
              size: fileItem.size / urls.length,
              sizeStr: humanSize(fileItem.size / urls.length),
              time: fileItem.time,
              timeStr: fileItem.timeStr,
              starred: fileItem.starred,
              isDir: false,
              mime_type: fileItem.mime_type,
              mime_extension: fileItem.mime_extension,
              thumbnail: fileItem.thumbnail,
              description: fileItem.description,
              download_url: url,
              m3u8_total_file_nums: urls.length,
              m3u8_parent_file_name: fileItem.name,
            })
          }

          M3u8DownloadDAL.aAddDownload(fileList, fullSavePath, false, true)

        }
      }
    }

    const handleCopyUrl = (item: string) => {
      let url = ''
      if (item == '2560p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '2560p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '1080p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '1080p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '720p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '720p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '540p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '540p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      } else if (item == '480p') {
        const filteredItem = videoPreview.value?.qualities.filter((item) => item.value === '480p')
        if (filteredItem && filteredItem.length > 0) {
          url = filteredItem[0].url || ''
        }
      }
      if (url) {
        copyToClipboard(url)
        message.success(item + ' M3U8下载链接已复制到剪切板')
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
    return { okLoading, handleOpen, handleClose, file_name, m3u8Info, m3u8List, fileItem, handleDownload, handleCopyUrl }
  },
  methods: {
    handleHide() {
      modalCloseAll()
    },
    handleOK() {}
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">下载转码后的视频</span>
    </template>
    <div class="modalbody" style="width: 540px">
      <div style="width: 100%">
        <a-input :model-value="m3u8Info" readonly />
      </div>

      <div class="arco-upload-list arco-upload-list-type-text">
        <div v-for="item in m3u8List" :key="item" class="arco-upload-list-item arco-upload-list-item-done">
          <div class="arco-upload-list-item-content">
            <div class="arco-upload-list-item-name">
              <span class="arco-upload-list-item-file-icon">
                <i class="iconfont iconluxiang"></i>
              </span>
              <a class="arco-upload-list-item-name-link" @click.stop="() => handleCopyUrl(item)">{{ file_name }}</a>
            </div>
            <span class="arco-upload-progress">
              <span class="arco-upload-icon arco-upload-icon-success" style="cursor: default">
                {{ item }}
              </span>
            </span>
          </div>
          <span class="arco-upload-list-item-operation">
            <a-button-group>
              <a-button type="outline" size="small" @click="() => handleCopyUrl(item)">复制</a-button>
              <a-button type="outline" size="small" @click="() => handleDownload(item, fileItem)">下载</a-button>
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

<script setup lang='ts'>
import { IAliGetFileModel } from '../../aliapi/alimodels'
import { modalCloseAll } from '../../utils/modal'
import { PropType, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { usePanTreeStore, useSettingStore } from '../../store'
import { humanDateTime, randomSharePassword } from '../../utils/format'
import message from '../../utils/message'
import AliShare from '../../aliapi/share'
import ShareDAL from './ShareDAL'
import { ArrayKeyList } from '../../utils/utils'
import { copyToClipboard } from '../../utils/electronhelper'
import { GetShareUrlFormate } from '../../utils/shareurl'
import AliTransferShare from '../../aliapi/transfershare'

const formRef = ref()
const okLoading = ref(false)
const okBatchLoading = ref(false)
const settingStore = useSettingStore()
const shareType = ref()

const form = reactive({
  expiration: '',
  share_pwd: '',
  share_name: '',
  mutil: false
})
const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  sharetype: {
    type: String,
    required: true
  },
  driveType: {
    type: String,
    required: true
  },
  filelist: {
    type: Array as PropType<IAliGetFileModel[]>,
    required: true
  }
})
const getShareType = (): any => {
  const key = props.driveType
  return key.includes('backup') ? { type: 't', title: '快传' } : { type: 's', title: '分享' }
}

const handleOpen = async () => {
  form.share_name = props.filelist[0].name
  shareType.value = getShareType()
  let share_pwd = ''
  if (settingStore.uiSharePassword == 'random') share_pwd = randomSharePassword()
  else if (settingStore.uiSharePassword == 'last') share_pwd = localStorage.getItem('share_pwd') || ''
  form.share_pwd = share_pwd

  let expiration = Date.now()
  if (settingStore.uiShareDays == 'always') expiration = 0
  else if (settingStore.uiShareDays == 'week') expiration += 7 * 24 * 60 * 60 * 1000
  else expiration += 30 * 24 * 60 * 60 * 1000

  form.expiration = expiration > 0 ? humanDateTime(expiration) : ''
}

const handleClose = () => {
  if (okLoading.value) okLoading.value = false
  if (okBatchLoading.value) okBatchLoading.value = false
  formRef.value.resetFields()
}

const handleHide = () => {
  modalCloseAll()
}
const handleOK = async (multi: boolean) => {
  const pantreeStore = usePanTreeStore()
  if (!pantreeStore.user_id || !pantreeStore.drive_id || !pantreeStore.selectDir.file_id) {
    message.error('新建文件失败 父文件夹错误')
    return
  }
  const mindate = new Date()
  mindate.setMinutes(mindate.getMinutes() + 2)
  let expiration = form.expiration
  if (expiration) expiration = new Date(expiration) < mindate ? mindate.toISOString() : new Date(expiration).toISOString()
  else expiration = ''
  let share_name = form.share_name.trim().replaceAll('"', '')
  share_name = share_name.replace(/[<>:"\\|?*]+/g, '')
  share_name = share_name.replace(/[\f\n\r\t\v]/g, '')
  while (share_name.endsWith(' ') || share_name.endsWith('.')) share_name = share_name.substring(0, share_name.length - 1)
  if (shareType.value.type === 's' && share_name.length < 1) {
    message.error('分享链接标题不能为空')
    return
  }
  const share_pwd = form.share_pwd
  const user_id = pantreeStore.user_id
  const drive_id = pantreeStore.drive_id
  const file_id_list = ArrayKeyList<string>('file_id', props.filelist)
  localStorage.setItem('share_pwd', share_pwd)
  if (!multi) {
    okLoading.value = true
    let result = undefined
    let url = ''
    if (shareType.value.type === 's') {
      result = await AliShare.ApiCreatShare(user_id, drive_id, expiration, share_pwd, share_name, file_id_list)
      if (typeof result == 'string') {
        okLoading.value = false
        message.error(result)
        return
      }
      // 更新分享链接
      if (result.share_name != share_name && shareType.value.type === 's') {
        await AliShare.ApiUpdateShareBatch(user_id, [result.share_id],
          [result.expiration], [result.share_pwd], [share_name])
      }
      await ShareDAL.aReloadMyShareUntilShareID(user_id, result.share_id)
      url = GetShareUrlFormate(result.share_name, result.share_url, result.share_pwd || '')
      message.success('创建分享链接成功，分享链接已复制到剪切板')
    } else {
      result = await AliTransferShare.ApiCreatTransferShare(user_id, drive_id, file_id_list)
      if (typeof result == 'string') {
        okLoading.value = false
        message.error(result)
        return
      }
      await ShareDAL.aReloadMyTransferShareUntilShareID(user_id, result.share_id)
      message.success('创建快传链接成功，快传链接已复制到剪切板')
      url = '【快传链接】' + GetShareUrlFormate(result.share_name, result.share_url, result.share_pwd || '')
    }
    copyToClipboard(url)
    okLoading.value = false
    modalCloseAll()
  } else {
    okBatchLoading.value = true
    let url = ''
    let sharedCount = 0
    let result = undefined
    for (let i = 0; i < file_id_list.length; i++) {
      if (shareType.value.type === 's') {
        result = await AliShare.ApiCreatShare(user_id, drive_id, expiration, share_pwd, share_name, file_id_list.slice(i, i + 1))
      } else {
        result = await AliTransferShare.ApiCreatTransferShare(user_id, drive_id, file_id_list.slice(i, i + 1))
      }
      if (typeof result == 'string') {
        okBatchLoading.value = false
        message.error(result)
        continue
      }
      sharedCount += 1
      // 更新分享链接
      if (result.share_id && shareType.value.type === 's') {
        await ShareDAL.aReloadMyShareUntilShareID(user_id, result.share_id)
      }
      url += GetShareUrlFormate(result.share_name, result.share_url, result.share_pwd) + '\n'
    }
    if (shareType.value.type === 's') {
      message.success('创建 ' + sharedCount + '条 分享链接成功，分享链接已复制到剪切板')
    } else {
      message.success('创建 ' + sharedCount + '条 快传链接成功，快传链接已复制到剪切板')
    }
    copyToClipboard(url)
    okBatchLoading.value = false
    modalCloseAll()
  }
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass createsharelinkmodal' :footer='false'
           :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @before-open='handleOpen' @close='handleClose'>
    <template #title>
      <span class='modaltitle'>
        创建{{ shareType.title }}链接
        <a-popover position="bottom">
          <i class="iconfont iconbulb" />
          <template #content>
            <div v-if="shareType.type === 's'">
              <span class="opred">普通用户</span>每天只能使用分享功能<span class="opred">5次</span><br />
              <span class="opred">会员用户和Lv.1及以上的达人用户</span>，每天可使用分享次数<span class="opred">1000次</span><br />
              <div class="hrspace"></div>
              <span class="oporg">超过上限后，将提示「今日分享次数已达上限」。</span>
              <div class="hrspace"></div>
              <span class="oporg">目前支持分享的文件类型有 image、video、doc、other</span> <br />
              1、image支持以下格式：JPG、JPEG、PNG、HEIC、GIF、<br />
              WEBP、 BMP <br />
              2、video 支持以下格式：ASF、AVI、FLASH、FLV、LIVP、M3U8、<br />
              MOV、MP4、MPG、RM、RMVB、TS、WMA、WMV、MKV <br />
              3、doc 支持以下格式：WORD、EXCEL、OUTLOOK、PDF、PPT、RTF、<br />
              TXT、VISIO<br />
              4、other支持以下格式：MODE、FONT、APPLICATION <br />
              <div class="hrspace"></div>
              文件夹已支持分享，<span class="oporg">压缩包暂不支持（可以洗码分享）</span>
            </div>
            <div v-else>
              <span class="opred">普通用户</span>每天的快传次数为<span class="opred">5次</span><br />
              <span class="opred">会员用户</span>每天的快传次数为<span class="opred">100次</span><br />
              <div class="hrspace"></div>
              普通用户请前往会员中心，购买会员开通权益<br />
            </div>
          </template>
        </a-popover>
        <span class='titletips'> (已选择{{ filelist.length }}个文件) </span>
      </span>
    </template>
    <div class='modalbody' style='width: 440px'>
      <a-form ref='formRef' :model='form' layout='vertical'>
        <a-form-item field='share_name'>
          <template #label>
            <template v-if='shareType.type === "s"'> {{ shareType.title }}链接标题：</template>
            <template v-else> {{ shareType.title }}文件：</template>
            <span class='opblue' style='margin-left: 0; font-size: 12px' v-if='shareType.type === "s"'> 修改后的标题只有自己可见 </span>
            <span class='opblue' style='margin-left: 0; font-size: 12px' v-else> 🎉快传支持发送所有格式的文件 </span>
          </template>
          <a-input v-model.trim='form.share_name' :placeholder='form.share_name' />
        </a-form-item>

        <template v-if='shareType.type === "s"'>
          <a-row>
            <a-col flex='200px'> 有效期：</a-col>
            <a-col flex='12px'></a-col>
            <a-col flex='100px'> 提取码：</a-col>
            <a-col flex='auto'></a-col>
          </a-row>
          <a-row>
            <a-col flex='200px'>
              <a-form-item field='expiration'>
                <a-date-picker
                  v-model='form.expiration'
                  style='width: 200px; margin: 0'
                  show-time
                  placeholder='永久有效'
                  value-format='YYYY-MM-DD HH:mm:ss'
                  :shortcuts="[
                    { label: '永久', value: () => '' },
                    { label: '3小时', value: () => dayjs().add(3, 'hour') },
                    { label: '1天', value: () => dayjs().add(1, 'day') },
                    { label: '3天', value: () => dayjs().add(3, 'day') },
                    { label: '7天', value: () => dayjs().add(7, 'day') },
                    { label: '30天', value: () => dayjs().add(30, 'day') }
                  ]" />
              </a-form-item>
            </a-col>
            <a-col flex='12px'></a-col>
            <a-col flex='120px'>
              <a-form-item field='share_pwd' :rules="[{ length: 4, message: '提取码必须是4个字符' }]">
                <a-input v-model='form.share_pwd' tabindex='-1' placeholder='没有不填' />
              </a-form-item>
            </a-col>
            <a-col flex='auto'></a-col>
          </a-row>
        </template>
      </a-form>
    </div>
    <div class='modalfoot'>
      <a-button type='outline' size='small' :loading='okBatchLoading' @click='handleOK(true)'>
        为每个文件单独创建
      </a-button>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOK(false)'>
        创建{{ shareType.title }}链接
      </a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.iconbulb {
  display: inline-block;
  height: 22px;
  margin-left: 4px;
  color: #ffc107dd;
  font-size: 18px;
  line-height: 22px;
  cursor: help;
}
</style>

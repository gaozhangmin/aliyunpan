<script setup lang='ts'>
import AliShare from '../../aliapi/share'
import { getFromClipboard } from '../../utils/electronhelper'
import message from '../../utils/message'
import { modalCloseAll, modalShowShareLink } from '../../utils/modal'
import { reactive, ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  shareUrl: {
    type: String,
    required: true
  },
  sharePwd: {
    type: String,
    required: true
  }
})
const okLoading = ref(false)
const formRef = ref()
const save_db = ref(true)
const form = reactive({ sharelink: '', password: '' })

const FixFormate = (text: string, enmpty: boolean) => {
  let linkTxt = ''
  let linkPwd = ''
  if (text && text.indexOf('密码') >= 0) text = text.replaceAll('密码', '提取码')
  if (text && text.indexOf('提取码') >= 0) {
    text = text.replace('提取码:', '提取码').replace('提取码：', '提取码').replace('提取码 ', '提取码').trim()
    linkPwd = text.substr(text.indexOf('提取码') + '提取码'.length, 4)
  }

  if (text && text.length == 11) {
    linkTxt = 'alipan.com/s/' + text
  }

  if (text && text.indexOf('aliyundrive.com/s/') >= 0) {
    linkTxt = 'aliyundrive.com/s/' + text.substr(text.indexOf('aliyundrive.com/s/') + 'aliyundrive.com/s/'.length, 11)
  }
  if (text && text.indexOf('alipan.com/s/') >= 0) {
    linkTxt = 'alipan.com/s/' + text.substr(text.indexOf('alipan.com/s/') + 'alipan.com/s/'.length, 11)
  }

  if (!linkTxt && !enmpty) linkTxt = text
  return { linkTxt, linkPwd }
}

const onPaste = (e: any) => {
  e.stopPropagation()
  e.preventDefault()
  const text = getFromClipboard()
  const link = FixFormate(text, true)
  form.sharelink = link.linkTxt
  form.password = link.linkPwd
}
const handleOpen = () => {
  setTimeout(() => {
    document.getElementById('DaoRuShareInput')?.focus()
  }, 200)
  if (!props.shareUrl.length) {
    let link = FixFormate(getFromClipboard(), true)
    form.sharelink = link.linkTxt
    form.password = link.linkPwd
  } else {
    form.sharelink = props.shareUrl
    form.password = props.sharePwd
  }
}
const handleHide = () => {
  modalCloseAll()
}
const handleOK = () => {
  formRef.value.validate((data: any) => {
    if (data) return
    let sharelink = form.sharelink
    if (sharelink.indexOf('aliyundrive.com/s/') < 0 && sharelink.indexOf('alipan.com/s/') < 0) {
      message.error('解析链接出错，必须为 aliyundrive.com/s/xxxxxxxxxxx 或 alipan.com/s/xxxxxxxxxxx 格式的链接')
      return
    }

    okLoading.value = true
    const share_id = sharelink.split(/\.com\/s\/([\w]+)/)[1]
    AliShare.ApiGetShareToken(share_id, form.password)
      .then((share_token) => {
        okLoading.value = false
        if (!share_token || share_token.startsWith('，')) {
          message.error('解析链接出错' + share_token)
        } else {
          modalShowShareLink(share_id, form.password, share_token, true, [], save_db.value)
        }
      })
      .catch((err: any) => {
        okLoading.value = false
        message.error('解析链接出错', err)
      })
  })
}
const handleClose = () => {
  if (okLoading.value) okLoading.value = false
  formRef.value.resetFields()
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass' :footer='false' :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @before-open='handleOpen' @close='handleClose'>
    <template #title>
      <span class='modaltitle'>导入阿里云盘分享链接</span>
    </template>
    <div class='modalbody' style='width: 440px'>
      <a-form ref='formRef' :model='form' layout='horizontal' auto-label-width>
        <a-form-item
          field='sharelink'
          label='分享链接：'
          :rules="[
            { required: true, message: '分享链接必填' },
            { maxLength: 300, message: '分享链接太长(300)' },
            { match: /(aliyundrive|alipan).com\/s\//, message: '必须是阿里云盘(aliyundrive.com/s/...或alipan.com/s/...)' },
            { match: /(aliyundrive|alipan).com\/s\/[0-9a-zA-Z_]{11,}/, message: '格式错误：xxxxx.com/s/umaDDMR7w4F' }
          ]">
          <a-input v-model.trim='form.sharelink' placeholder='例如：alipan.com/s/umaDDMR7w4F' allow-clear
                   :input-attrs="{ id: 'DaoRuShareInput', autofocus: 'autofocus' }" @paste.stop.prevent='onPaste' />
        </a-form-item>
        <a-form-item field='password' label='提取码：' :rules="[{ length: 4, message: '提取码必须是4个字符' }]">
          <a-input v-model.trim='form.password' placeholder='没有不填' allow-clear style='max-width: 100px' />
        </a-form-item>
      </a-form>
      <br />
    </div>
    <div class='modalfoot'>
      <a-checkbox type='outline' v-model='save_db' size='small'>保存到我的导入</a-checkbox>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>导入</a-button>
    </div>
  </a-modal>
</template>

<style></style>

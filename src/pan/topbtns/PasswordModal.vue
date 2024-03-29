<script setup lang="ts">
import { computed, PropType, reactive, ref } from 'vue'
import { modalCloseAll } from '../../utils/modal'
import { usePanTreeStore, useSettingStore } from '../../store'
import { decodeName, encodeName } from '../../module/flow-enc/utils'
import Db from '../../utils/db'
import message from '../../utils/message'
import { localPwd } from '../../utils/aria2c'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  optType: {
    type: String,
    required: true
  },
  callback: {
    type: Function as PropType<(success: boolean, inputpassword: string) => void>
  }
})
const settingStore = useSettingStore()
const maxCount = ref(0)
const okLoading = ref(false)
const inputpassword = ref('')
const formRef = ref()

const form = reactive({
  oldEncPassWord: '',
  encPassword: '',
  encConfirmPassword: ''
})
const modalTitle = computed(() => {
  if (props.optType === 'new') {
    return '设置安全密码'
  } else if (props.optType === 'input') {
    return '输入安全密码'
  } else if (props.optType === 'modify') {
    return '修改安全密码'
  } else if (props.optType === 'confirm') {
    return '确认安全密码'
  } else if (props.optType === 'del') {
    return '删除安全密码'
  }
})
const userPassword = computed(() => {
  let decPassword = decodeName(localPwd, useSettingStore().securityEncType, useSettingStore().securityPassword)
  if (!decPassword) {
    decPassword = decodeName(usePanTreeStore().user_id, useSettingStore().securityEncType, useSettingStore().securityPassword)
  }
  return decPassword || ''
})
const handleOpen = async () => {
  setTimeout(() => {
    if (props.optType === 'new') {
      document.getElementById('encPasswordInput')?.focus()
    } else if (props.optType === 'input') {
      document.getElementById('encPasswordInput')?.focus()
    } else if (props.optType === 'del') {
      document.getElementById('encPasswordInput')?.focus()
    } else if (props.optType === 'modify') {
      document.getElementById('oldEncPassWordInput')?.focus()
    } else if (props.optType === 'confirm') {
      document.getElementById('encPasswordInput')?.focus()
    }
  }, 200)
  form.oldEncPassWord = ''
  form.encPassword = ''
  form.encConfirmPassword = ''
}
const handleClose = () => {
  if (okLoading.value) okLoading.value = false
  maxCount.value = 0
  form.oldEncPassWord = ''
  form.encPassword = ''
  form.encConfirmPassword = ''
  formRef.value.resetFields()
}
const handleCancel = () => {
  modalCloseAll()
  props.callback && props.callback(false, '')
}

const handleOK = () => {
  formRef.value.validate(async (data: any) => {
    if (data) return
    // 安全密码错误
    if ((props.optType === 'del' || props.optType === 'confirm') && form.encPassword !== userPassword.value) {
      maxCount.value += 1
      if (maxCount.value >= 5) {
        maxCount.value = 5
        await Db.saveValueNumber('countTime', Date.now())
        message.error('错误次数过多，请10s后再试')
      } else {
        message.error('安全密码错误，请重新输入')
      }
      return
    }
    // 旧密码错误
    if (props.optType === 'modify' && form.oldEncPassWord !== userPassword.value) {
      maxCount.value += 1
      if (maxCount.value >= 5) {
        maxCount.value = 5
        await Db.saveValueNumber('countTime', Date.now())
        message.error('错误次数过多，请10s后再试')
      } else {
        message.error('旧密码错误，请重新输入')
      }
      return
    }
    okLoading.value = true
    if (props.optType === 'new' || props.optType === 'modify') {
      // 设置密码
      if (form.encPassword) {
        let encPassword = <string>encodeName(localPwd, settingStore.securityEncType, form.encPassword)
        await settingStore.updateStore({ securityPassword: encPassword })
      }
    } else if (props.optType === 'input') {
      inputpassword.value = form.encPassword
    } else if (props.optType === 'del') {
      // 删除密码
      await settingStore.updateStore({ securityPassword: '' })
    }
    setTimeout(() => {
      okLoading.value = false
      modalCloseAll()
      if (props.callback) {
        props.callback && props.callback(true, inputpassword.value)
      }
    }, 200)
  })
}
const getCountTime = async () => {
  let countTime = await Db.getValueNumber('countTime')
  if (countTime && ((Date.now() - countTime) >= 10 * 1000)) {
    countTime = 0
    maxCount.value = 0
    await Db.saveValueNumber('countTime', countTime)
  }
  return countTime
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass' :footer='false'
           :unmount-on-close='true' :mask-closable='false'
           @cancel='handleCancel' @close='handleClose' @before-open='handleOpen'>
    <template #title>
      <span class='modaltitle'>{{ modalTitle }}</span>
    </template>
    <a-space direction='vertical' size='large' :style="{ width: '380px'}">
      <a-form ref='formRef' auto-label-width :model='form'>
        <a-form-item v-if='optType === "modify"'
                     field='oldEncPassWord' label='旧密码'
                     :validate-trigger="['change','input']"
                     :rules="[
                        { required: true, message:'旧密码必填'},
                        { minLength: 6, message: '密码最小长度为6个字符' },
                        { validator: async (value: any, cb: any) => {
                            if (await getCountTime() > 0) {
                              cb('错误次数过多，请10s后再试')
                            } else {
                              cb()
                            }
                          }
                        }
                     ]">
          <a-input-password
            v-model.trim='form.oldEncPassWord'
            :input-attrs="{ id: 'oldEncPassWordInput', autofocus: 'autofocus' }"
            :style="{width:'320px'}"
            placeholder="旧密码" allow-clear />
        </a-form-item>
        <a-form-item field='encPassword' label='安全密码'
                     :validate-trigger="['change','input']"
                     :rules="[
                        { required: true, message:'安全密码必填'},
                        { minLength: 6, message: '密码最小长度为6个字符' },
                        { validator: async (value: any, cb: any) => {
                            if ((optType === 'del' || optType === 'confirm') && (await getCountTime() > 0)) {
                              cb('错误次数过多，请10s后再试')
                            } else if (optType === 'modify' && value === form.oldEncPassWord) {
                              cb('安全密码和旧密码相同')
                            } else {
                              cb()
                            }
                          }
                        }
                     ]">
          <a-input-password
            :input-attrs="{ id: 'encPasswordInput', autofocus: 'autofocus' }"
            v-model.trim='form.encPassword'
            :style="{width:'320px'}"
            placeholder="安全密码" allow-clear />
        </a-form-item>
        <a-form-item v-if='optType === "new" || optType === "modify" '
                     field='encConfirmPassword' label='确认密码'
                     :validate-trigger="['change','input']"
                     :rules="[
                        { required: true, message:'确认密码必填'},
                        { minLength: 6, message: '密码最小长度为6个字符'},
                        { validator: (value: any, cb: any) => {
                            if ((optType === 'new' || optType === 'modify') && value !== form.encPassword) {
                              cb('确认密码和安全密码不一致')
                            } else {
                              cb()
                            }
                          }
                        }
                     ]">
          <a-input-password
            :input-attrs="{ id: 'encConfirmPasswordInput', autofocus: 'autofocus' }"
            v-model.trim='form.encConfirmPassword'
            :style="{width:'320px'}"
            placeholder="确认密码" allow-clear />
        </a-form-item>
      </a-form>
    </a-space>
    <div class='modalfoot'>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleCancel'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>确认</a-button>
    </div>
  </a-modal>
</template>

<style scoped>

</style>
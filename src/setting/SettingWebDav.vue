<script setup lang='ts'>
import useSettingStore from './settingstore'
import MySwitch from '../layout/MySwitch.vue'
import WebDavServer from '../module/webdav'
import { reactive, ref } from 'vue'
import message from '../utils/message'
import { IUser } from 'webdav-server/lib/index.v2'
import { Sleep } from '../utils/format'
import AppCache from '../utils/appcache'
import { getUserData, openExternal } from '../utils/electronhelper'
import path from 'path'
import { getIPAddress } from '../utils/proxyhelper'

const cb = (val: any) => {
  if (Object.hasOwn(val, 'webDavPort') && val.webDavPort !== settingStore.webDavPort) {
    WebDavServer.config({ port: val.webDavPort })
  }
  if (Object.hasOwn(val, 'webDavHost') && val.webDavHost !== settingStore.webDavHost) {
    WebDavServer.config({ port: val.webDavHost })
  }
  settingStore.updateStore(val)
}

const settingStore = useSettingStore()
const loading = ref(false)
const options = ref<IUser[]>([])
// 弹窗
const addVisible = ref(false)
const okLoading = ref(false)
const formRef = ref()
const selectUser = ref()
const form = reactive({
  webDavUsername: '',
  webDavPassword: '',
  webDavPath: '/',
  webDavRights: ['all']
})

const handleWebDav = async (newVal: any) => {
  if (!WebDavServer) {
    message.error('【WebDav】:服务初始化失败，请重启软件')
    cb({ webDavEnable: false })
    return false
  }
  try {
    let status: boolean = true
    if (newVal) {
      status = await WebDavServer.config({
        port: settingStore.webDavPort,
        hostname: settingStore.webDavHost,
        requireAuthentification: false
      }).start()
      if (status) {
        message.success('【WebDav】:服务已启动')
        cb({ webDavEnable: true })
      } else {
        message.error('【WebDav】:服务启动失败')
        cb({ webDavEnable: false })
      }
    } else {
      await WebDavServer.stop()
      message.success('【WebDav】:服务已关闭')
      cb({ webDavEnable: false })
    }
    await Sleep(200)
    return status
  } catch (error: any) {
    message.error(`【WebDav】:${error}`)
    return false
  }
}

const handleGetLocalIp = () => {
  if (settingStore.webDavHost.includes('127')) {
    let localIp = getIPAddress()
    cb({ webDavHost: localIp })
  } else {
    cb({ webDavHost: '127.0.0.1' })
  }
}

const handleGetUsers = (visible: boolean) => {
  if (visible) {
    loading.value = true
    setTimeout(async () => {
      options.value = await WebDavServer.getAllUser()
      loading.value = false
    }, 200)
  }
}

const handleChangeUser = async (value: any) => {
  if (value) {
    selectUser.value = await WebDavServer.getUser(value)
  }
}

const handleAddUser = () => {
  addVisible.value = true
  form.webDavUsername = ''
  form.webDavPassword = ''
  form.webDavPath = '/'
  form.webDavRights = ['all']
}
const handleModifyUser = () => {
  if (selectUser.value) {
    addVisible.value = true
    form.webDavUsername = selectUser.value.username
    form.webDavPassword = selectUser.value.password || ''
    form.webDavPath = selectUser.value.path || ''
    form.webDavRights = selectUser.value.rights
  } else {
    message.error('未选择用户')
  }
}
const handleDelUser = () => {
  if (selectUser.value) {
    WebDavServer.delUser(selectUser.value.username)
  } else {
    message.error('未选择用户')
  }
}
const handleAddOk = async () => {
  formRef.value.validate(async (data: any) => {
    if (data) return
    // 添加用户
    const success = await WebDavServer.setUser(form.webDavUsername, form.webDavPassword, form.webDavPath, form.webDavRights, false)
    if (success) {
      message.success('添加用户成功')
    } else {
      message.error('添加用户失败')
    }
    addVisible.value = false
  })
}

const handleRightsOption = (value: any) => {
  if (value) {
    if (value.includes('all') || value.length >= 2) {
      form.webDavRights = ['all']
    }
  }
}
const handleAddCancel = () => {
  addVisible.value = false
  if (okLoading.value) okLoading.value = false
  formRef.value.resetFields()
}
const handleBeforeClose = () => {
  if (okLoading.value) okLoading.value = false
  formRef.value.resetFields()
}
const handleJumpPath = () => {
  const userData = getUserData()
  openExternal(path.join(userData, 'Cache'))
}
</script>

<template>
  <div class='settingcard'>
    <div class='settinghead'>:WebDav设置</div>
    <div class='settingrow'>
      <MySwitch v-model:value='settingStore.webDavEnable' :beforeChange='handleWebDav'>
        开启WebDav服务
      </MySwitch>
    </div>
    <div class='settingrow'>
      <MySwitch :value="settingStore.webDavAutoEnable"
                @update:value="cb({ webDavAutoEnable: $event })">
        自动启动WebDav服务
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:主机(Host)</div>
    <div class='settingrow'>
      <a-input-search tabindex="-1"
                      :disabled="settingStore.webDavEnable"
                      style="width: 320px;"
                      v-model.trim='settingStore.webDavHost'
                      button-text='ip'
                      allow-clear
                      search-button
                      @search="handleGetLocalIp"
                      placeholder="地址（IP）" @update:model-value='cb({ webDavHost: $event })'>
        <template #prefix> http://</template>
        <template #suffix> /webdav</template>
      </a-input-search>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:端口(Port)</div>
    <div class='settingrow'>
      <a-input-number
        :disabled="settingStore.webDavEnable"
        tabindex='-1' :style="{ width: '320px' }"
        placeholder='默认：2000'
        :model-value='settingStore.webDavPort'
        @update:model-value='cb({ webDavPort: $event })' />
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:目录缓存时间(秒)</div>
    <div class='settingrow'>
      <a-input-number
        tabindex='-1' :style="{ width: '320px' }"
        hide-button placeholder='默认：40s'
        :model-value='settingStore.webDavListCache'
        @update:model-value='cb({ webDavListCache: $event })' />
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:资源访问策略</div>
    <div class='settingrow'>
      <a-select tabindex="-1" :style="{ width: '320px' }"
                :model-value="settingStore.webDavStrategy"
                :popup-container="'#SettingDiv'"
                @update:model-value="cb({ webDavStrategy: $event })">
        <a-option value='redirect'>302重定向</a-option>
        <a-option value='proxy'>本地代理</a-option>
      </a-select>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:用户列表（修改和查看）</div>
    <div class='settingrow'>
      <a-select @popup-visible-change='handleGetUsers'
                @change='handleChangeUser'
                :field-names="{ key: 'uid', value: 'username', label: 'username'}"
                :virtual-list-props='{height:120}'
                :options='options'
                :style="{width:'320px'}"
                placeholder='选择一个用户'
                :popup-container="'#SettingDiv'"
                :loading='loading' allow-clear
                :allow-search='{ retainInputValue: true }' scrollbar>
      </a-select>
    </div>
    <a-modal modal-class='modalclass' :footer='false'
             v-model:visible='addVisible' title='添加一个用户' unmountOnClose
             @cancel='handleAddCancel' @before-close='handleBeforeClose'>
      <a-space direction='vertical' size='large' :style="{width: '400px'}">
        <a-form ref='formRef' auto-label-width :model='form'>
          <a-form-item field='webDavUsername' label='用户名' :rules="{ required: true, message:'用户名必填'}">
            <a-input tabindex='-1'
                     v-model.trim='form.webDavUsername'
                     placeholder='用户名(Username)'
                     allow-clear />
          </a-form-item>
          <a-form-item field='webDavPassword' label='密码'
                       :rules="[
                         { required: true, message:'密码必填'},
                         { minLength: 6, message: '密码最小长度为6个字符' }
                       ]">
            <a-input
              tabindex='-1'
              v-model.trim='form.webDavPassword'
              placeholder='密码(Password)'
              allow-clear />
          </a-form-item>
          <a-form-item field='webDavPath' label='挂载路径' :rules="{ required: true, message:'挂载路径必填'}">
            <a-input v-model.trim='form.webDavPath' placeholder='挂载路径(Path)' />
          </a-form-item>
          <a-form-item field='webDavRights' label='挂载权限' :rules="{ required: true, message:'挂载权限必填'}">
            <a-select v-model='form.webDavRights'
                      @change='handleRightsOption'
                      multiple :max-tag-count='3'
                      placeholder='挂载权限(Rights)'>
              <a-option value='all'>全部权限</a-option>
              <a-option value='canRead'>可读</a-option>
              <a-option value='canWrite'>可写</a-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-space>
      <div class='modalfoot'>
        <div style='flex-grow: 1'></div>
        <a-button v-if='!okLoading' type='outline' size='small' @click='handleAddCancel'>取消</a-button>
        <a-button type='primary' size='small' :loading='okLoading' @click='handleAddOk'>添加</a-button>
      </div>
    </a-modal>
    <div class='settingspace'></div>
    <div class='settingrow'>
      <a-button type='primary' status='normal' size='small' tabindex='-1' @click='handleAddUser'>添加</a-button>
      <a-button type='primary' status='success' size='small' style='margin-left: 5px' tabindex='-1'
                @click='handleModifyUser'>修改
      </a-button>
      <a-popconfirm content='确认要删除当前用户？' @ok='handleDelUser'>
        <a-button type='primary' status='danger' size='small' style='margin-left: 5px' tabindex='-1'>
          删除
        </a-button>
      </a-popconfirm>
    </div>
    <template v-if="settingStore.webDavStrategy === 'proxy'">
      <div class='settingspace'></div>
      <div class="settinghead">
        :缓存大小
        <span class="opblue" style="margin-left: 12px; padding: 0 12px">( {{ settingStore.debugCacheSize }} )</span>
      </div>
      <div class="settingrow">
        <a-button type='outline' size='small' tabindex='-1' style='margin-right: 16px' @click='handleJumpPath'>
          打开位置
        </a-button>
        <a-popconfirm content="确认要清理缓存？" @ok="AppCache.aClearCache()">
          <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">清理缓存
          </a-button>
        </a-popconfirm>
      </div>
    </template>
  </div>
</template>

<style scoped>

</style>
<script setup lang="ts">
import MySwitch from '../layout/MySwitch.vue'
import useSettingStore from './settingstore'
import { modalPassword } from '../utils/modal'
import { computed } from 'vue'
import PanDAL from '../pan/pandal'

const settingStore = useSettingStore()
const cb = async (val: any) => {
  await settingStore.updateStore(val)
}

const handlerPassword = (optType: string, event: any) => {
  modalPassword(optType, (success) => {
    if (optType == 'confirm' && success) {
      cb(event)
      // 刷新目录
      if (settingStore.securityHideBackupDrive) {
        PanDAL.aReLoadOneDirToShow('', 'resource_root', true)
      } else if (settingStore.securityHideResourceDrive) {
        PanDAL.aReLoadOneDirToShow('', 'backup_root', true)
      }
    }
  })
}
const disabled = computed(() => {
  return !settingStore.securityPassword
})

</script>

<template>
  <div class='settingcard'>
    <div class='settinghead'>:默认加密算法</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div style="width: 320px">
          默认：<span class="opred">AES-CTR</span>
          <hr />
          1.<span class="opred">AES-CTR 更加安全，速度最快</span>。推荐 armV8 以上的 cpu 使用，X86 架构的也推荐在支持 AES
          指令的机器使用<br />
          2.<span class="opred">RC4-MD5 性能会稍微差一些</span>。适合在 CPU 不支持 AES 指令的设备中使用<br />
          <div class="hrspace"></div>
          <span class="oporg"> AES-CTR 可以跑满 800Mpbs+的带宽，RC4 测试理论是可以跑满 300Mbps 带宽的<br /></span>
          所以你完全不用担心的它的性能会出现瓶颈<br />
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <a-radio-group type='button' tabindex='-1' :model-value='settingStore.securityEncType'
                     @update:model-value='cb({ securityEncType: $event })'>
        <a-radio tabindex='-1' value='aesctr'>AES-CTR</a-radio>
        <a-radio tabindex='-1' value='rc4md5'>RC4-MD5</a-radio>
      </a-radio-group>
    </div>
    <div class='settingspace'></div>
    <div class="settinghead">
      :默认解密密码
      <span class="opblue" style="margin-left: 0; padding: 0 8px">用于加密和解密的通用密码</span>
    </div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">空</span>
          <hr />
          用于加密和解密的通用密码，
          <span class="opred">该密码加密存储在本地配置文件</span><br />
          <div class="hrspace"></div>
          1.未设置无法加密上传<span class="oporg">只能私密上传，且以下选项无法修改</span><br />
          2.<span class="opred">删除密码后将无法自动解密加密上传的内容</span><br />
          3.<span class="opred">不是私密的密码，私密的密码和用户相关</span><span
          class="oporg">（仅加密上传的用户可以解密）</span><br />
        </div>
      </template>
    </a-popover>
    <div class="settingrow">
      <a-button v-if='!settingStore.securityPassword' type='outline' size='small' tabindex='-1'
                style='margin-right: 16px' @click='handlerPassword("new", "")'>
        设置安全密码
      </a-button>
      <a-button v-else type='outline' size='small' tabindex='-1' style='margin-right: 12px'
                @click='handlerPassword("modify", "")'>
        修改安全密码
      </a-button>
      <a-popconfirm v-if='settingStore.securityPassword' content="确认要删除密码？" @ok="handlerPassword('del', '')">
        <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">
          删除安全密码
        </a-button>
      </a-popconfirm>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:加密上传文件/文件夹加密名称</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">开启</span>
          <hr />
          <div class="hrspace"></div>
          <span class="oporg">注：</span>加密文件和文件夹的名称，提高安全性
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityEncFileName'
                @update:value='cb({ securityEncFileName: $event })'
                :disabled="disabled">
        上传文件/文件夹加密名称
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:加密上传文件隐藏扩展名</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">关闭</span>
          <hr />
          加密上传文件同加密扩展名
          <div class="hrspace"></div>
          <span class="oporg">注：</span>隐藏扩展名上传将无法分享文件
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityEncFileNameHideExt'
                @update:value='cb({ securityEncFileNameHideExt: $event })'
                :disabled="disabled">
        加密上传隐藏扩展名
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:操作文件二次确认密码</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">关闭</span>
          <hr />
          <div class="hrspace"></div>
          <span class="oporg">注：</span>操作文件时需要确认密码，提高安全性
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityPasswordConfirm'
                @change="handlerPassword('confirm', { securityPasswordConfirm: $event })" :disabled="disabled">
        预览加密文件二次确认密码
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:文件列表自动解密文件名</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">开启</span>
          <hr />
          开启后文件列表中加密的文件名将会<br />
          自动根据加密和私密的密码解密
          <div class="hrspace"></div>
          <span class="oporg">注：</span>关闭后提高安全性
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityFileNameAutoDecrypt'
                @change="handlerPassword('confirm', { securityFileNameAutoDecrypt: $event })" :disabled="disabled">
        自动解密加密的文件名
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:预览文件/下载文件自动解密文件</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">开启</span>
          <hr />
          预览文件/下载文件自动解密文件
          <div class="hrspace"></div>
          <span class="oporg">注：</span>开启后支持在线预览部分文件
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityPreviewAutoDecrypt'
                @change="handlerPassword('confirm', { securityPreviewAutoDecrypt: $event })" :disabled="disabled">
        自动解密加密的文件
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:个人隐私设置</div>
    <a-popover position="bottom">
      <i class="iconfont iconbulb" />
      <template #content>
        <div>
          默认：<span class="opred">关闭</span>
          <hr />
          隐藏不需要的文件夹
          <div class="hrspace"></div>
          <span class="oporg">注：</span>开启后无法操作对应文件夹
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityHideBackupDrive'
                @change="handlerPassword('confirm', { securityHideBackupDrive: $event })" :disabled="disabled">
        隐藏备份盘文件夹
      </MySwitch>
    </div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityHideResourceDrive'
                @change="handlerPassword('confirm', { securityHideResourceDrive: $event })" :disabled="disabled">
        隐藏资源盘文件夹
      </MySwitch>
    </div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.securityHidePicDrive'
                @change="handlerPassword('confirm', { securityHidePicDrive: $event })" :disabled="disabled">
        隐藏相册文件夹
      </MySwitch>
    </div>
  </div>
</template>

<style scoped>

</style>
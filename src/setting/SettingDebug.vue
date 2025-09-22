<script setup lang="ts">
import useSettingStore from './settingstore'
import AppCache from '../utils/appcache'
import MySwitch from '../layout/MySwitch.vue'
import { getUserData, openExternal } from '../utils/electronhelper'
import message from '../utils/message'
import { createProxyServer, getIPAddress } from '../utils/proxyhelper'
import { Sleep } from '../utils/format'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}
const userData = getUserData()

const handleJumpPath = () => {
  openExternal(userData)
}
const handleResetHost = () => {
  if (settingStore.debugProxyHost.includes('127')) {
    let localIp = getIPAddress()
    cb({ debugProxyHost: localIp })
  } else {
    cb({ debugProxyHost: '127.0.0.1' })
  }
}

const handleResetPort = async () => {
  // 重启软件服务
  if (window.MainProxyServer) {
    const debugProxyPort = Math.floor(Math.random() * (10000 - 2000 + 1) + 2000)
    const loadingKey = 'proxyServer' + Date.now().toString()
    message.loading('重启软件服务中...', 60, loadingKey)
    await window.MainProxyServer.close()
    createProxyServer(debugProxyPort).catch(err => {
      message.error('软件服务重启失败', 3, loadingKey)
    }).then(async (debugProxyServer: any) => {
      window.MainProxyPort = debugProxyPort
      window.MainProxyServer = debugProxyServer
      window.MainProxyServer.on('close', async () => {
        await Sleep(2000)
        window.MainProxyServer = await createProxyServer(window.MainProxyPort)
      })
      cb({ debugProxyPort: debugProxyPort.toString() })
      await Sleep(2000)
      message.success('软件服务重启完成', 3, loadingKey)
    })
  }
}
</script>

<template>
  <div class="settingcard">
    <div class="settinghead">:文件列表 显示限制</div>
    <div class="settingrow">
      <a-input-number tabindex="-1" :style="{ width: '252px' }" mode="button" :min="3000" :max="10000" :step="100"
                      :model-value="settingStore.debugFileListMax"
                      @update:model-value="cb({ debugFileListMax: $event })">
        <template #prefix> 只显示前</template>
        <template #suffix> 个文件</template>
      </a-input-number>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">3000</span> (3000-10000)
            <hr />
            进入文件夹后，右侧文件列表只显示前3000个文件，剩余文件不显示
            <div class="hrspace"></div>
            <span class="oporg">注：</span>只是不显示，下载整个文件夹时会正确下载全部文件
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">:收藏夹/回收站/全盘搜索/文件标记/文件恢复/历史导入 显示限制</div>
    <div class="settingrow">
      <div class="settingrow">
        <a-input-number tabindex="-1" :style="{ width: '252px' }" mode="button" :min="100"
                        :max="3000" :step="100" :model-value="settingStore.debugFavorListMax"
                        @update:model-value="cb({ debugFavorListMax: $event })">
          <template #prefix> 只显示前</template>
          <template #suffix> 个文件</template>
        </a-input-number>
        <a-popover position="bottom">
          <i class="iconfont iconbulb" />
          <template #content>
            <div>
              默认：<span class="opred">500</span> (500-3000)
              <hr />
              收藏夹/回收站/全盘搜索/文件标记/放映室，只显示前500个文件
              <div class="hrspace"></div>
              <span class="oporg">注：</span>只是不显示，不影响文件。为了加快文件列表的加载速度
            </div>
          </template>
        </a-popover>
      </div>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">:下载完/上传完记录 存储限制</div>
    <div class="settingrow">
      <div class="settingrow">
        <a-input-number tabindex="-1" :style="{ width: '252px' }" mode="button" :min="1000" :max="50000" :step="1000"
                        :model-value="settingStore.debugDownedListMax"
                        @update:model-value="cb({ debugDownedListMax: $event })">
          <template #prefix> 保留最后</template>
          <template #suffix> 条记录</template>
        </a-input-number>
        <a-popover position="bottom">
          <i class="iconfont iconbulb" />
          <template #content>
            <div>
              默认：<span class="opred">5000</span> (1000-50000)
              <hr />
              只保留最新的5000个 已下载/已上传 记录<br />
              之前的传输记录会被自动清理，不影响下载上传操作，不影响本地文件
            </div>
          </template>
        </a-popover>
      </div>
    </div>
  </div>

  <div class='settingcard' v-if="false">
    <a-alert banner type="warning">默认 不会产生任何 上传到服务器的数据</a-alert>
    <div class="settingspace"></div>
    <div class="settinghead">:自动填写 分享链接提取码</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.yinsiLinkPassword" @update:value="cb({ yinsiLinkPassword: $event })">导入分享时
        尝试自动填写提取码
      </MySwitch>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">关闭</span>
            <hr />
            有的分享链接需要填写提取码，如果你不知道提取码<br />
            开启后，有极小的几率可以自动填写<br />
            就是类似百度网盘助手自动填写提取码<br />
            <div class="hrspace"></div>
            <span class="oporg">注意：</span> 开启后会自动收集你 <span class="opblue">导入的</span> 分享链接的提取码
          </div>
        </template>
      </a-popover>
    </div>
    <div class="settingspace"></div>
    <div class="settinghead">:自动填写 在线解压密码</div>
    <div class="settingrow">
      <MySwitch :value="settingStore.yinsiZipPassword" @update:value="cb({ yinsiZipPassword: $event })">在线解压时
        尝试自动填写解压密码
      </MySwitch>
      <a-popover position="bottom">
        <i class="iconfont iconbulb" />
        <template #content>
          <div>
            默认：<span class="opred">关闭</span>
            <hr />
            有的压缩包在线解压需要填写密码，如果你不知道密码<br />
            开启后，有极小的几率可以自动填写<br />
            <div class="hrspace"></div>
            <span class="oporg">注意：</span> 开启后会自动收集你 <span class="opblue">在线解压</span> 的解压密码
          </div>
        </template>
      </a-popover>
    </div>
  </div>
  <div class="settingcard">
    <div class='settinghead'>:软件服务端口</div>
    <a-popover position='bottom'>
      <i class='iconfont iconbulb' />
      <template #content>
        <div>
          默认：<span class='opred'>10000</span>
          <hr />
          用于文件相关的服务【如：加载播放列表、解密文件等】
          <br />
          修改后需要重新打开修改软件刷新链接
          <span class='opred'>相关功能异常时需要修改该值</span>
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <a-input-search
        tabindex='-1'
        placeholder='默认：127.0.0.1'
        hide-button
        style="width: fit-content"
        v-model.trim="settingStore.debugProxyHost"
        search-button
        button-text='切换地址'
        @search="handleResetHost"
        @update:model-value='cb({ debugProxyHost: $event })' />
    </div>
    <div class='settingrow'>
      <a-input-search
        tabindex='-1'
        placeholder='默认：5000' hide-button
        style="width: fit-content"
        v-model.trim="settingStore.debugProxyPort"
        search-button
        button-text='随机端口'
        @search="handleResetPort"
        @update:model-value='cb({ debugProxyPort: $event })' />
    </div>
    <div class='settingspace'></div>
    <div class="settinghead">
      :缓存路径
      <span class="opblue" style="margin-left: 12px; padding: 0 12px">( {{ settingStore.debugDirSize }} )</span>
    </div>
    <div class="settingrow">
      <a-input tabindex='-1' :model-value='userData' placeholder='C:\Users\用户名\AppData\Roaming\aliyunxby'
               :readonly='true' />
    </div>
    <div class="settingspace"></div>
    <div class='settingrow' style='display: flex'>
      <a-button type='outline' size='small' tabindex='-1' style='margin-right: 16px' @click='handleJumpPath'>
        打开位置
      </a-button>
      <a-popconfirm content="确认要清理数据库？" @ok="AppCache.aClearDir('db')">
        <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">清理数据库
        </a-button>
      </a-popconfirm>

      <a-popconfirm content="确认要清理缓存？" @ok="AppCache.aClearDir('cache')">
        <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">清理缓存
        </a-button>
      </a-popconfirm>
      <a-popconfirm content="确认要重置？会重启小白羊" @ok="AppCache.aClearDir('all')">
        <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">
          删除全部数据(重置)
        </a-button>
      </a-popconfirm>
    </div>
  </div>
</template>

<style></style>

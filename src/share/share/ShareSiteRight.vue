<script setup lang='ts'>
import { ref } from 'vue'
import { IShareSiteModel, useAppStore, useServerStore } from '../../store'
import { B64decode } from '../../utils/format'
import { modalDaoRuShareLink } from '../../utils/modal'
import message from '../../utils/message'
import { openExternal } from '../../utils/electronhelper'

const appStore = useAppStore()
const serverStore = useServerStore()
const siteLoading = ref(true)
const content = ref()
const webview = ref()
const siteUrl = ref('')

const handleSite = (item: IShareSiteModel) => {
  if (item.url.startsWith('http')) {
    siteUrl.value = item.url
  } else {
    const ourl = B64decode(item.url)
    if (ourl) siteUrl.value = ourl
    else siteUrl.value = ''
  }

  if (item.title.includes('文档')) {
    openExternal(siteUrl.value)
    siteUrl.value = ''
    return
  }
  // 动态创建WebView
  webview.value = document.createElement('webview')
  webview.value.src = siteUrl.value
  webview.value.className = 'siteContent'
  webview.value.setAttribute('allowpopups', '')
  content.value.appendChild(webview.value)
  webview.value.addEventListener('new-window', handleSiteShareUrl)
}

const handleSiteShareUrl = (event: any) => {
  // console.log('handleSiteShareUrl', event)
  // 获取点击的 URL
  const url = event.url || ''
  if (url.includes('aliyundrive')) {
    modalDaoRuShareLink(url)
  } else {
    webview.value.src = url
  }
}

const handleClose = () => {
  if (!webview.value) {
    message.error('打开网页失败，请手动刷新网页')
    return
  }
  siteUrl.value = ''
  webview.value.removeEventListener('new-window', handleSiteShareUrl)
  content.value.removeChild(webview.value)
  webview.value = {}
}

const handleRefresh = () => {
  const iframe = webview.value
  if (!iframe) {
    message.error('打开网页失败，请手动刷新网页')
    return
  }
  iframe.reloadIgnoringCache()
}

</script>

<template>
  <div style='width: calc(100% - 32px); margin: 24px 24px 24px 8px; box-sizing: border-box'>
    <p class='sitetitle' v-show='!siteUrl'>搜索到的一些阿里云盘分享网站,欢迎投稿</p>
  </div>
  <div class='toppanbtns' style='height: 36px' v-show='siteUrl'>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1'
                @click='handleRefresh'>
        <i class='iconfont iconreload-1-icon' />刷新网页
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1' @click='handleClose'>
        <i class='iconfont iconclose' />关闭网页
      </a-button>
    </div>
  </div>
  <div class='fullscroll' ref='content'>
    <a-card :bordered='false'
            v-if='!siteUrl'
            style='width: calc(100% - 32px); margin: 0 24px 24px 8px; box-sizing: border-box'
            class='sitelist'>
      <a-card-grid v-for='(item, index) in serverStore.shareSiteList' :key='index' :hoverable='index % 2 === 0'
                   class='sitelistitem'>
        <a @click='handleSite(item)' v-html="item.title.replace('[', '<small>').replace(']', '</small>')"></a>
      </a-card-grid>
    </a-card>
  </div>
</template>

<style>
.sitetitle {
  margin: 0;
  font-size: 18px;
  line-height: 20px;
  font-weight: 500;
  text-align: center;
  color: var(--color-text-1);
}

.sitelist {
  margin-top: 40px !important;
  text-align: center;
}

.sitelist .arco-card-header {
  border-bottom: none !important;
}

.sitelistitem {
  width: 33.33%;
  padding: 28px 0;
  text-align: center;
  font-size: 16px;

  color: rgb(188, 143, 143);
}

.sitelistitem a {
  cursor: pointer;
  color: rgb(var(--color-link-light-2));
}

.sitelistitem:hover {
  background-color: var(--color-fill-2);
  color: rgb(var(--primary-6));
}

.sitelistitem small {
  padding-left: 4px;
  font-size: 12px;
}

.siteContent {
  display: flex;
  width: calc(100% - 16px);
  height: calc(100% - 36px);
  border: none;
  overflow: hidden
}
</style>

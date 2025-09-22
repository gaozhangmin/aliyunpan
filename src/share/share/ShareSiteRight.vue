<script setup lang='ts'>
import { computed, ref } from 'vue'
import { IShareSiteModel, useServerStore, useWinStore } from '../../store'
import { B64decode } from '../../utils/format'
import { modalDaoRuShareLink } from '../../utils/modal'
import message from '../../utils/message'
import { openExternal } from '../../utils/electronhelper'
import ServerHttp from '../../aliapi/server'
import DebugLog from '../../utils/debuglog'

const serverStore = useServerStore()
const winStore = useWinStore()
const itemHeight = computed(() => (winStore.height - 24 - 20 - 42 - 77).toString() + 'px')

const onLoading = ref(true)
const content = ref()
const webview = ref()
const hideLeft = ref(false)
const siteUrl = ref('')

const emits = defineEmits(['hideLeft'])

const handleSite = (item: IShareSiteModel) => {
  if (item.url.startsWith('http')) {
    siteUrl.value = item.url
  } else {
    const ourl = B64decode(item.url)
    if (ourl) siteUrl.value = ourl
    else siteUrl.value = ''
  }

  if (item.group == 'doc' || item.external) {
    openExternal(siteUrl.value)
    siteUrl.value = ''
    return
  }
  // 动态创建WebView
  webview.value = document.createElement('webview')
  webview.value.className = 'site-content'
  webview.value.id = 'webview'
  webview.value.setAttribute('src', siteUrl.value)
  webview.value.setAttribute('allowpopups', '')
  webview.value.setAttribute('partition', 'site:webview')
  webview.value.setAttribute('nodeintegration', '')
  webview.value.setAttribute('disablewebsecurity', '')
  webview.value.setAttribute('webpreferences', 'allowRunningInsecureContent')
  content.value.appendChild(webview.value)
  webview.value.addEventListener('did-start-loading', handleStartLoad)
  webview.value.addEventListener('new-window', handleSiteShareUrl)
  webview.value.addEventListener('will-navigate', handleSiteShareUrl)
  webview.value.addEventListener('will-redirect', handleSiteShareUrl)
}
const handleHideLeft = () => {
  hideLeft.value = !hideLeft.value
  emits('hideLeft', hideLeft.value)
}

const handleClearCookies = async () => {
  await window.WebClearCookies({ origin: webview.value.src, storages: ['cookies', 'localstorage'] })
  message.success('清除Cookies成功')
}

const handleStartLoad = () => {
  onLoading.value = true
  setTimeout(() => onLoading.value = false, 1000)
}


const handleSiteShareUrl = async (event: any) => {
  console.log('handleSiteShareUrl', event)
  // 获取点击的 URL
  const url = event.url || ''
  if (/(aliyundrive|alipan).com\/s\/[0-9a-zA-Z_]{11,}/.test(url)) {
    modalDaoRuShareLink(url)
  }
}

const handleClose = () => {
  siteUrl.value = ''
  if (webview.value) {
    webview.value.removeEventListener('will-navigate', handleSiteShareUrl)
    webview.value.removeEventListener('new-window', handleSiteShareUrl)
    webview.value.removeEventListener('will-redirect', handleSiteShareUrl)
    webview.value.removeEventListener('did-start-loading', handleStartLoad)
    content.value.removeChild(webview.value)
    webview.value = {}
  }
  hideLeft.value = false
  emits('hideLeft', false)
}
const handleRefreshSiteList = () => {
  ServerHttp.CheckConfigUpgrade().catch((err: any) => {
    DebugLog.mSaveDanger('CheckConfigUpgrade', err)
  })
}

const handleRefresh = () => {
  if (!webview.value) {
    message.error('打开网页失败，请手动刷新网页')
    return
  }
  webview.value.reloadIgnoringCache()
}

const handleBack = () => {
  if (!webview.value) {
    message.error('打开网页失败，请手动刷新网页')
    return
  }
  if (webview.value.canGoBack()) {
    webview.value.goBack()
  }
}

const handleForward = () => {
  if (!webview.value) {
    message.error('打开网页失败，请手动刷新网页')
    return
  }
  if (webview.value.canGoForward()) {
    webview.value.goForward()
  }
}
</script>

<template>
  <div v-show='!siteUrl'>
    <p class='site-title'>
      搜索到的一些阿里云盘分享网站,欢迎<a @click="openExternal('https://gitee.com/odomu/aliyunpan')" style='color: red'>投稿</a>
    </p>
    <a-tabs class='share-site-tabs'>
      <template #extra>
        <a-button type='text' size='large' tabindex='-1' @click='handleRefreshSiteList'>
          <i class='iconfont iconreload-1-icon' />刷新列表
        </a-button>
      </template>
      <template v-if='serverStore.shareSiteGroupList.length > 0'>
        <a-tab-pane :style="{ height: itemHeight }" v-for='(item, index) in serverStore.shareSiteGroupList' :key='index'
                    :title='item.title'>
          <a-card :bordered='false' class='site-list'>
            <template v-for='(siteItem, index) in serverStore.shareSiteList' :key='index'>
              <a-card-grid v-if='siteItem.group === item.group' :hoverable='index % 2 === 0' class='site-list-item'>
                <a :style='{ color: siteItem.color }'
                   @click='handleSite(siteItem)'
                   v-html='`${siteItem.title}<small>${siteItem.tip}</small>`' />
              </a-card-grid>
            </template>
          </a-card>
        </a-tab-pane>
      </template>
      <template v-else>
        <a-tab-pane title='全部'>
          <a-card :bordered='false' class='site-list'>
            <a-card-grid v-for='(siteItem, index) in serverStore.shareSiteList'
                         :key='index'
                         :hoverable='index % 2 === 0'
                         class='sitelistitem'>
              <a :style='{ color: siteItem.color }'
                 @click='handleSite(siteItem)'
                 v-html='`${siteItem.title}<small>${siteItem.tip}</small>`' />
            </a-card-grid>
          </a-card>
        </a-tab-pane>
      </template>
    </a-tabs>
  </div>
  <div class='top-btn' style='height: 32px' v-show='siteUrl'>
    <div class='toppanbtn'>
      <a-popconfirm content='确认要清除当前网站Cookies？' @ok='handleClearCookies'>
        <a-button type='text' size='small' tabindex='-1'>
          <i class='iconfont icondelete' />清除Cookies
        </a-button>
      </a-popconfirm>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1' @click='openExternal(webview.src || siteUrl)'>
        <i class='iconfont icondebug' />浏览器打开
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1' @click='handleHideLeft'>
        <i class='iconfont iconfullscreen' />显隐侧边栏
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1' @click='handleBack'>
        <i class='iconfont iconarrow-left-1-icon' />回退
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' size='small' tabindex='-1' @click='handleForward'>
        <i class='iconfont iconarrow-right-1-icon' />前进
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' :loading='onLoading' size='small' tabindex='-1' @click='handleRefresh'>
        <i class='iconfont iconreload-1-icon' v-if='!onLoading' />刷新
      </a-button>
    </div>
    <div class='toppanbtn'>
      <a-button type='text' status='danger' size='small' tabindex='-1' @click='handleClose'>
        <i class='iconfont iconclose' />关闭
      </a-button>
    </div>
  </div>
  <div class='site-content' ref='content' v-show='siteUrl'></div>
</template>

<style lang='less'>
.site-title {
  height: 100%;
  width: calc(100% - 32px);
  margin: 24px 24px 24px 8px;
  font-size: 18px;
  line-height: 20px;
  font-weight: 500;
  text-align: center;
  color: var(--color-text-1);
}

.share-site-tabs {
  height: 100%;

  .arco-tabs-content-list .arco-tabs-content-item-active .arco-tabs-pane {
    overflow-y: auto;
  }

  .site-list {
    text-align: center;
    width: calc(100% - 32px);
    margin: 0 24px 24px 8px;
    box-sizing: border-box;

    .arco-card-header {
      border-bottom: none !important;
    }

    .site-list-item {
      width: 25%;
      padding: 26px 0;
      text-align: center;
      font-size: 16px;
      color: rgb(188, 143, 143);

      a {
        cursor: pointer;
        color: rgb(var(--color-link-light-2));
      }

      small {
        padding-left: 4px;
        font-size: 12px;
      }

      &:hover {
        background-color: var(--color-fill-2);
        color: rgb(var(--primary-6));
      }
    }
  }

}


.top-btn {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  max-width: 100%;
  min-width: 440px;
  user-select: none;
  margin-top: 12px;
  box-sizing: border-box;
  border-bottom: #1e1e1e 1px solid;
  box-shadow: var(--topshadow) 0px 2px 12px 0px;
}

.site-content {
  display: flex;
  width: calc(100%);
  height: calc(100%);
  border: none;
  overflow: hidden
}
</style>

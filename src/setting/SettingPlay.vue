<script setup lang='ts'>
import useSettingStore from './settingstore'
import MySwitch from '../layout/MySwitch.vue'
import { computed } from 'vue'
import cache from '../utils/cache'
import message from '../utils/message'

const settingStore = useSettingStore()
const cb = (val: any) => {
  settingStore.updateStore(val)
}

const platform = window.platform

function handleSelectPlayer() {
  if (window.WebShowOpenDialogSync) {
    window.WebShowOpenDialogSync(
      {
        title: '选择播放器的执行文件',
        buttonLabel: '选择',
        properties: ['openFile'],
        defaultPath: settingStore.uiVideoPlayerPath,
        filters: [{ name: '应用程序', extensions: ['exe', 'app'] }]
      },
      (result: string[] | undefined) => {
        if (result && result[0]) {
          settingStore.updateStore({ uiVideoPlayerPath: result[0] })
        }
      }
    )
  }
}

const playerType = computed(() => {
  return settingStore.uiVideoPlayerPath.toLowerCase()
})

const handleClearOutDateDanmuCache = () => {
  cache.clearOutDate()
  message.success('清理弹幕搜索缓存成功')
}
const handleClearDanmuCache = () => {
  cache.clearSelf()
  message.success('清理弹幕搜索缓存成功')
}

</script>

<template>
  <div class='settingcard'>
    <div class='settinghead'>:选择视频播放器</div>
    <div class='settingrow' style='min-width: 800px '>
      <a-radio-group type='button' tabindex='-1' :model-value='settingStore.uiVideoPlayer'
                     @update:model-value='cb({ uiVideoPlayer: $event })'>
        <a-radio tabindex='-1' value='web'>内置网页播放器</a-radio>
        <a-radio tabindex='-1' value='other'>自定义播放软件</a-radio>
      </a-radio-group>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>
            默认：<span class='opred'>内置网页播放器</span>
            <hr />
            <span class='opred'>内置网页播放器</span>：<br />
            使用ArtPlayer网页，在线播放视频<br />
            支持 选择清晰度、倍速播放、字幕选择、画中画模式，播放加密视频
            <div class='hrspace'></div>
            <span class='opred'>自定义播放软件</span>：<br />
            是实验性的功能，可以<span class='oporg'>自己选择</span>电脑上安装的播放软件<br />
            例如:PotPlayer,MPV,Infuse,IINA等等<br />
          </div>
        </template>
      </a-popover>
      <div v-show="settingStore.uiVideoPlayer === 'web'" class='hitText'>
        【内置网页播放器】 支持倍速！支持选择清晰度！支持播放历史！支持播放列表！支持字幕选择！
      </div>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:视频默认清晰度</div>
    <a-popover position='bottom'>
      <i class='iconfont iconbulb' />
      <template #content>
        <div>
          默认：<span class='opred'>播放原始的文件</span>
          <hr />
          <span class='opred'>播放原始的文件</span>：<br />
          原始的清晰度(1080P,2K,4K)，支持<span class='oporg'>多个音轨</span>/
          <span class='oporg'>多个字幕</span>的切换<br />
          可以拖放加载自己的字幕,但文件体积太大时会卡(网络卡)
          <div class='hrspace'></div>
          <span class='opred'>播放转码后视频</span>：<br />
          支持2560p/1080P/540P/720P清晰度选择，不能选择音轨/字幕<br />
          理论上播放更流畅，但可能遇到字幕不显示（内置字幕默认使用中文）
          <div class='hrspace'></div>
          <span class='oporg'>注：违规视频会<span class='opblue'>自动</span>通过转码视频播放</span>
        </div>
      </template>
    </a-popover>
    <div class='settingrow'>
      <a-select :model-value='settingStore.uiVideoQuality' tabindex='-1'
                @update:model-value='cb({ uiVideoQuality: $event })'
                :style="{width:'252px'}" placeholder="清晰度选择"
                :trigger-props="{ autoFitPopupMinWidth: true }">
        <a-option value="Origin">原画（原始文件）</a-option>
        <a-option value="QHD">超高清（2560p）</a-option>
        <a-option value="FHD">全高清（1080P）</a-option>
        <a-option value="HD">高清（720P）</a-option>
        <a-option value="SD">标清（540P）</a-option>
        <a-option value="LD">流畅（480P）</a-option>
      </a-select>
    </div>
    <template v-if="settingStore.uiVideoPlayer === 'web'">
      <div class='settingspace'></div>
      <div class='settinghead'>:弹幕缓存</div>
      <div class="settingrow">
        <a-button type="outline" size="small" tabindex="-1" status="success" style="margin-right: 16px"
                  @click='handleClearOutDateDanmuCache'>
          清理过期
        </a-button>
        <a-popconfirm content="确认要清理缓存？" @ok="handleClearDanmuCache">
          <a-button type="outline" size="small" tabindex="-1" status="danger" style="margin-right: 16px">
            清理全部
          </a-button>
        </a-popconfirm>
      </div>
    </template>
    <template v-if="settingStore.uiVideoPlayer === 'other'">
      <div class='settingspace'></div>
      <div class='settinghead'>:每次播放前提示选择清晰度</div>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiVideoQualityTips'
                  @update:value='cb({ uiVideoQualityTips: $event })'>
          观看视频前 将提示选择清晰度
        </MySwitch>
      </div>
      <div class='settingspace'></div>
      <div class='settinghead'>:记忆选择的清晰度</div>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiVideoQualityLastSelect'
                  @update:value='cb({ uiVideoQualityLastSelect: $event })'>
          记忆上次选择的清晰度
        </MySwitch>
      </div>
      <template v-if="!settingStore.uiVideoEnablePlayerList || (settingStore.uiVideoEnablePlayerList && !playerType.includes('potplayer'))">
        <div class='settingspace'></div>
        <div class='settinghead'>:字幕加载设置</div>
        <a-popover position='bottom'>
          <i class='iconfont iconbulb' />
          <template #content>
            <div style='min-width: 400px'>
              默认：<span class='opred'>自动加载同名字幕</span>
              <hr />
              <span class='opred'>关闭字幕加载</span>：<br />
              不自动加载字幕
              <div class='hrspace'></div>
              <span class='opred'>自动加载同名字幕</span>：<br />
              当只有一个字幕文件时，无法比较字幕是否和视频名称同名<br />默认会加载该字幕
              <div class='hrspace'></div>
            </div>
          </template>
        </a-popover>
        <div class='settingrow' style='min-width: 400px '>
          <a-radio-group type='button' tabindex='-1' :model-value='settingStore.uiVideoSubtitleMode'
                         @update:model-value='cb({ uiVideoSubtitleMode: $event })'>
            <a-radio tabindex='-1' value='close'>关闭字幕</a-radio>
            <a-radio tabindex='-1' value='auto'>自动加载</a-radio>
            <a-radio tabindex='-1' value='select'>手动选择</a-radio>
          </a-radio-group>
        </div>
      </template>
      <template v-if='playerType.includes("mpv") || playerType.includes("potplayer")'>
        <div class='settingspace'></div>
        <div class='settinghead'>:播放列表设置</div>
        <a-popover position='bottom'>
          <i class='iconfont iconbulb' />
          <template #content>
            <div style='min-width: 200px'>
              <span class='opred'>PotPlayer开启播放列表：</span><br>
              无法自动加载字幕和跳转播放历史 <br>
              <hr />
            </div>
          </template>
        </a-popover>
        <div class='settingrow'>
          <MySwitch :value='settingStore.uiVideoEnablePlayerList'
                    @update:value='cb({ uiVideoEnablePlayerList: $event })'>
            开启播放列表加载
          </MySwitch>
        </div>
      </template>
      <template v-if='settingStore.uiVideoEnablePlayerList && !playerType.includes("mpv")'>
        <div class='settingspace'></div>
        <div class='settinghead'>:播放器退出设置</div>
        <div class='settingrow'>
          <MySwitch :value='settingStore.uiVideoPlayerExit' @update:value='cb({ uiVideoPlayerExit: $event })'>
            跟随软件一同退出
          </MySwitch>
        </div>
      </template>
      <template v-if='(settingStore.uiVideoEnablePlayerList || settingStore.uiVideoPlayerHistory)
                      && playerType.includes("mpv")'>
        <div class='settingspace'></div>
        <div class='settinghead'>:播放器退出设置</div>
        <div class='settingrow'>
          <MySwitch :value='settingStore.uiVideoPlayerExit' @update:value='cb({ uiVideoPlayerExit: $event })'>
            播放完自动退出
          </MySwitch>
        </div>
      </template>
      <div class='settingspace'></div>
      <div class='settinghead'>:播放历史设置</div>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>
            <span class='opblue'>仅Mpv支持同步 播放进度</span> <br>
            其他播放器只能够跳转到网页播放器历史进度
            <hr />
            已支持：PotPlayer，Mpv
          </div>
        </template>
      </a-popover>
      <div class='settingrow'>
        <MySwitch :value='settingStore.uiVideoPlayerHistory' @update:value='cb({ uiVideoPlayerHistory: $event })'>
          跳转并记忆播放历史
        </MySwitch>
      </div>
      <div class='settingspace'></div>
      <div class='settinghead'>:播放器启动参数</div>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>
            <span class='opred'>自定义播放器参数, 使用,【逗号】分割</span> <br>
            <span class='opred'>参数错误可能无法启动</span> <br>
            <hr />
            <span class='opblue'>例如【MPV播放器HDR】：</span> --d3d11-output-csp=pq
          </div>
        </template>
      </a-popover>
      <div class='settingrow'>
        <a-textarea
          v-model.trim='settingStore.uiVideoPlayerParams'
          :style="{ width: '320px' }"
          :autoSize='{minRows: 1, maxRows: 2}'
          allow-clear
          @keydown='(e:any) => e.stopPropagation()'
          placeholder='没有不填，用于自定义播放器启动参数'
          @update:model-value='cb({ uiVideoPlayerParams: $event })' />
      </div>
      <div class='settingspace'></div>
      <div class='settinghead'>:自定义播放器路径</div>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>
            <span class='opred'>windows</span>：选择一个播放软件.exe
            <hr />
            直接手动选择播放软件的exe文件即可<br />
            例如：选择<span class='opblue'>C:\Program Files\Potplayer\Potplayer.exe</span><br />
            也可以直接选择桌面上播放软件的快捷方式
            <div class='hrspace'></div>
            已测试：Potplayer，VLC，KMPlayer，恒星播放器，SMPlayer，MPC-HC
            <div class='hrspace'></div>
            详情请参阅<span class='opblue'>帮助文档</span>
          </div>
        </template>
      </a-popover>
      <template v-if='settingStore.uiVideoPlayer=== "other"'>
        <div v-show="playerType.includes('mpv')" class='hitText'>
          【mpv】 支持倍速！支持外挂字幕！支持切换音轨！支持播放历史!
        </div>
        <div v-show="playerType.includes('potplayer')" class='hitText'>
          【potplayer】 支持倍速！支持外挂字幕！支持切换音轨！支持播放历史!
        </div>
      </template>
      <div class='settingrow'
           :style="{ display: settingStore.uiVideoPlayer === 'other' && platform === 'win32' ? '' : 'none', marginTop: '8px' }">
        <a-input-search tabindex='-1' style='max-width: 378px' :readonly='true' button-text='选择播放软件' search-button
                        :model-value='settingStore.uiVideoPlayerPath' @search='handleSelectPlayer' />
      </div>
      <div class='settingrow' :style="{ display: platform === 'darwin' ? '' : 'none', marginTop: '8px' }">
        <a-input-search tabindex='-1' style='max-width: 378px' :readonly='true' button-text='选择播放软件' search-button
                        :model-value='settingStore.uiVideoPlayerPath' @search='handleSelectPlayer' />
        <a-popover position='bottom'>
          <i class='iconfont iconbulb' />
          <template #content>
            <div style='min-width: 400px'>
              <span class='opred'>macOS</span>：选择一个播放软件.app
              <hr />
              1.点击 选择播放软件按钮 <span class='opblue'>--></span> 弹出文件选择框，<br />
              2.点击 左上 应用程序 <span class='opblue'>--></span> 点击一个 播放软件 <span class='opblue'>--></span> 点击
              确定
              <div class='hrspace'></div>
              已测试：Mpv，Vlc，IINA，MKPlayer
              <div class='hrspace'></div>
              详情请参阅<span class='opblue'>帮助文档</span>
            </div>
          </template>
        </a-popover>
      </div>
      <div class='settingrow'
           :style="{ display:  platform == 'linux' ? '' : 'none', marginTop: '8px' }">
        <a-auto-complete :data="['mpv', 'vlc', 'totem', 'mplayer', 'smplayer', 'xine', 'parole', 'kodi']"
                         :style="{ width: '378px' }" placeholder='请填写一个播放软件' strict
                         :model-value='settingStore.uiVideoPlayerPath' @change='cb({ uiVideoPlayerPath: $event })' />
        <a-popover position='bottom'>
          <i class='iconfont iconbulb' />
          <template #content>
            <div style='min-width: 400px'>
              <span class='opred'>linux</span>：手动填写一个播放命令
              <hr />
              你必须先自己在电脑上安装（sudo apt install xxx），<br />
              然后才能使用这个播放软件，直接手动填写播放软件的名字
              <div class='hrspace'></div>
              已测试：Mpv，Vlc，totem，mplayer，smplayer，xine，parole，kodi
              <div class='hrspace'></div>
              详情请参阅<span class='opblue'>帮助文档</span>
            </div>
          </template>
        </a-popover>
      </div>
    </template>
  </div>


  <div class='settingcard'>
    <div class='settingspace'></div>
    <div class='settinghead'>:自动标记已看视频</div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.uiAutoColorVideo' @update:value='cb({ uiAutoColorVideo: $event })'>
        观看视频时 将视频自动标记为浅红色
      </MySwitch>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:自动同步视频观看进度</div>
    <div class='settingrow'>
      <MySwitch :value='settingStore.uiAutoPlaycursorVideo' @update:value='cb({ uiAutoPlaycursorVideo: $event })'>
        观看视频时 将播放进度同步到网盘放映室
      </MySwitch>
      <a-popover position='bottom'>
        <i class='iconfont iconbulb' />
        <template #content>
          <div style='min-width: 400px'>只有使用 <span class='opblue'>内置网页播放器或者MPV播放器</span> 时才支持同步
            播放进度
          </div>
        </template>
      </a-popover>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:在线预览图片方式</div>
    <div class='settingrow'>
      <a-radio-group type='button' tabindex='-1' :model-value='settingStore.uiImageMode'
                     @update:model-value='cb({ uiImageMode: $event })'>
        <a-radio tabindex='-1' value='fill'>缩放显示图集</a-radio>
        <a-radio tabindex='-1' value='width'>单页显示长图</a-radio>
      </a-radio-group>
    </div>
    <div class='settingspace'></div>
    <div class='settinghead'>:视频雪碧图 截图数量</div>
    <div class='settingrow'>
      <a-radio-group type='button' tabindex='-1' :model-value='settingStore.uiXBTNumber'
                     @update:model-value='cb({ uiXBTNumber: $event })'>
        <a-radio tabindex='-1' :value='24'>24张</a-radio>
        <a-radio tabindex='-1' :value='36'>36张</a-radio>
        <a-radio tabindex='-1' :value='48'>48张</a-radio>
        <a-radio tabindex='-1' :value='60'>60张</a-radio>
        <a-radio tabindex='-1' :value='72'>72张</a-radio>
      </a-radio-group>
    </div>
  </div>
</template>

<style scoped>
.hitText {
  font-size: 13px;
  color: var(--color-text-3)
}
</style>

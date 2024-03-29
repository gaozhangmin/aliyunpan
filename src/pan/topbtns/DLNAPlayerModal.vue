<script setup lang="ts">
import AliFile from '../../aliapi/file'
import { usePanFileStore, usePanTreeStore, useSettingStore } from '../../store'
import message from '../../utils/message'
import { modalCloseAll, modalSelectVideoQuality } from '../../utils/modal'
import Dlna from '../../module/dlnacast/dlna'
import { onBeforeUnmount, ref } from 'vue'
import { getEncType, getProxyUrl, getRawUrl } from '../../utils/proxyhelper'
import { IAliGetFileModel } from '../../aliapi/alimodels'
import PlayerUtils from '../../utils/playerhelper'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const playerList = ref<any[]>([])
const okLoading = ref(false)

const handleOpen = () => {
  handleSearch()
}

const handleSearch = () => {
  let lists = new Set()
  okLoading.value = true
  Dlna.search()
  Dlna.on('update', (player: any) => {
    lists.add(player)
    playerList.value = Array.from(lists)
  })
  setTimeout(() => {
    okLoading.value = false
    Dlna.destroy()
  }, 15000)
}

const handlePlay = async (index: number) => {
  if (playerList.value.length <= index) {
    message.error('找不到指定的投屏设备')
    return
  }
  const playercurr = playerList.value[index]
  const first = usePanFileStore().GetSelectedFirst()!
  console.log('first', first)
  const user_id = usePanTreeStore().user_id
  const info = await AliFile.ApiFileInfo(user_id, first.drive_id, first.file_id)
  if (!info) {
    message.error('读取文件信息失败，请重试')
    return
  }
  let play_cursor = 0
  if (info?.play_cursor) {
    play_cursor = info?.play_cursor
  } else if (info?.user_meta) {
    const meta = JSON.parse(info?.user_meta)
    if (meta.play_cursor) {
      play_cursor = parseFloat(meta.play_cursor)
    }
  }
  let encType = getEncType(first)
  const { uiVideoQuality, uiVideoQualityTips } = useSettingStore()
  if (uiVideoQualityTips && !encType) {
    let rawData: any = await getRawUrl(user_id, first.drive_id, first.file_id, encType, '', first.icon == 'iconweifa', 'video')
    if (typeof rawData == 'string') {
      message.error('视频地址解析失败，操作取消')
      return
    }
    if (rawData.url.indexOf('x-oss-additional-headers=referer') > 0) {
      message.error('用户token已过期，请点击头像里退出按钮后重新登录账号')
      return
    }
    modalSelectVideoQuality(info, rawData, async (quality: any) => {
      // 加载转码的内嵌字幕
      let play_url = ''
      if (rawData.qualities) {
        play_url = rawData.qualities.find((q: any) => q.quality === quality)?.url || rawData.qualities[0].url
      }
      let subTitleUrl = ''
      const subTitlesList: IAliGetFileModel[] = usePanFileStore().ListDataRaw.filter((file) => /srt|vtt|ass/.test(file.ext))
      const subTitleFile = PlayerUtils.filterSubtitleFile(first.name, subTitlesList)
      // 加载网盘内字幕文件
      if (subTitleFile) {
        const data = await getRawUrl(user_id, subTitleFile.drive_id, subTitleFile.file_id, getEncType(subTitleFile), '')
        if (typeof data !== 'string' && data.url && data.url != '') {
          subTitleUrl = data.url
        }
      }
      if (!subTitleUrl) {
        // 加载转码的内嵌字幕
        if (rawData.subtitles && quality != 'Origin') {
          let subTitleData = rawData.subtitles.find((sub: any) => sub.language === 'chi') || rawData.subtitles[0]
          subTitleUrl = (subTitleData && subTitleData.url) || ''
        }
      }
      playercurr.play(play_url, {
          title: info.name,
          type: info.mime_type,
          subtitles: [subTitleUrl]
        }, (err: any, res: any) => {
          if (err) {
            console.error(err)
            message.error('投屏失败，请修改文件名称')
          } else {
            message.success('投屏成功')
            playercurr.seek(play_cursor)
          }
        }
      )
    })
  } else {
    const playUrl = getProxyUrl({
      user_id: user_id,
      drive_id: first.drive_id,
      file_id: first.file_id,
      file_size: first.size,
      encType: encType,
      weifa: first.icon === 'weifa' ? 1 : 0,
      quality: uiVideoQuality,
    })
    playercurr.play(playUrl, { title: info.name, type: info.mime_type },
      (err: any, res: any) => {
        if (err) {
          console.error(err)
          message.error('投屏失败，请修改文件名称')
        } else {
          message.success('投屏成功')
          playercurr.seek(play_cursor)
        }
      }
    )
  }
}

const handleClose = () => {
  if (playerList.value.length > 0) {
    playerList.value.forEach((player) => player.destroy())
  }
  playerList.value = []
  if (Dlna) Dlna.destroy()
  if (okLoading.value) okLoading.value = false
}

const handleHide = () => {
  handleClose()
  modalCloseAll()
}

onBeforeUnmount(() => {
  handleClose()
})

</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass"
           :unmount-on-close="true" :mask-closable="false"
           @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">DLNA投屏</span>
    </template>
    <div class="modalbody" style="width: 440px">
      <a-spin dot tip="正在查找可投屏的设备..."
              :loading='okLoading'
              style="width: 100%;height: fit-content;min-height: 100px;display: flex; justify-content: center">
        <div v-if="!okLoading && playerList.length === 0"
             style="width: 100%; display: flex; justify-content: center">
          <a-empty description="找不到可投屏的设备" />
        </div>
        <a-list
          size="small"
          v-if="playerList.length > 0"
          :data="playerList"
          style="width: 100%;"
          :virtualListProps="{
             isStaticItemHeight: true,
             estimatedSize: 50,
             threshold: 1,
             itemKey: 'host',
             height: 280,
           }">
          <template #item="{ item, index }">
            <a-list-item :key="index" style=" border-bottom: 1px solid var(--color-neutral-3);">
              <a-list-item-meta
                :title="`${item.device.name}【${item.device.host}】`"
                :description="item.device.info.modelDescription"
              >
                <template #avatar>
                   <span class="arco-upload-list-item-file-icon">
                      <i class="iconfont icontouping2"></i>
                   </span>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-button type="outline" style="margin-left: 10px" size="small" @click="handlePlay(index)">
                  播放
                </a-button>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </div>
    <template #footer>
      <div class="modalfoot">
        <div style="flex-grow: 1"></div>
        <a-button v-if='!okLoading' type='outline' status="success" size='small' @click='handleSearch'>刷新</a-button>
        <a-button type="outline" status="danger" size="small" @click="handleHide">关闭</a-button>
      </div>
    </template>
  </a-modal>
</template>

<style>

</style>

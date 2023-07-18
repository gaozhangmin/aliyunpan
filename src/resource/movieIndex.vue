<template>
  <div>
    <iframe class="custom-webview" src="https://4kysxz.top/" ref="iframeRef"></iframe>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { modalDaoRuShareLink } from '../utils/modal';
import { IAliGetFileModel } from '../aliapi/alimodels'
import { useSettingStore, useUserStore } from '../store'
import path from 'path'
import { humanSize } from '../utils/format'
import UserDAL from '../user/userdal'
import DownDAL from '../down/DownDAL'


export default {
  setup: function() {
    const iframeRef = ref(null)


    // const handleDownload = async (url: string, filmname:string) => {
    //   const user = UserDAL.GetUserToken(useUserStore().user_id)
    //   const settingStore = useSettingStore()
    //   const savePath = settingStore.AriaIsLocal ? settingStore.downSavePath : settingStore.ariaSavePath
    //   const fullSavePath = path.join(savePath, filmname)
    //   const fileList: IAliGetFileModel[] = []
    //   fileList.push({
    //     __v_skip: true,
    //     drive_id: UserDAL.GetUserToken(useUserStore().user_id).default_drive_id,
    //     file_id: '1234567',
    //     parent_file_id: '',
    //     name: filmname,
    //     namesearch: '',
    //     ext: 'ts',
    //     category: 'video',
    //     icon: '',
    //     size: 52.13*1024*1024*1024,
    //     sizeStr: '52.13G',
    //     time: 0,
    //     timeStr: '',
    //     starred: false,
    //     isDir: false,
    //     thumbnail: '',
    //     description: '',
    //     download_url: url,
    //   })
    //   DownDAL.aAddDownload(fileList, fullSavePath, false)
    // }

    onMounted(() => {
      const iframe = iframeRef.value

      if (iframe) {
        // @ts-ignore
        iframe.addEventListener('load', () => {
          // @ts-ignore
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document

          const element = iframeDocument.querySelector('.swal2-close')
          if (element) {
            element.click()
          }
          const iframeElements = iframeDocument.querySelectorAll('iframe[src^="https://player.bilibili.com/"]')
          // @ts-ignore
          iframeElements.forEach((iframeElement) => {
            if (iframeElement) {
              iframeElement.remove()
            }
          })

          iframeDocument.addEventListener('click', (event: any) => {
            const target = event.target
            const url = target.href || ''

            if (url.includes('aliyundrive')) {
              event.preventDefault()
              modalDaoRuShareLink(url)
            }
          })
        })
      }
    })

    return {
      iframeRef
    }
  }
}
</script>

<style scoped>
.custom-webview {
  width: 100%;
  height: 1000px;
}
</style>

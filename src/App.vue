<script lang="ts">
import { h } from 'vue'
import { useAppStore } from './store'
import PageLoading from './layout/PageLoading.vue'
import PageMain from './layout/PageMain.vue'
import './assets/global.css'
import './assets/fileitem.css'
import './assets/antd.css'
import PageVideoXBTVue from './layout/PageVideoXBT.vue'
import PageCode from './layout/PageCode.vue'
import PageOffice from './layout/PageOffice.vue'
import PagePdf from './layout/PagePdf.vue'
import PageEpub from './layout/PageEpub.vue'
import PageDocx from './layout/PageDocx.vue'
import PageSheet from './layout/PageSheet.vue'
import PageImage from './layout/PageImage.vue'
import PageVideo from './layout/PageVideo.vue'
import PageWorker from './layout/PageWorker.vue'

export default {
  setup() {
    const appStore = useAppStore()

    return () => {
      if (appStore.appPage == 'PageMain') return h(PageMain)
      if (appStore.appPage == 'PageOffice') return h(PageOffice)
      if (appStore.appPage == 'PagePdf') return h(PagePdf)
      if (appStore.appPage == 'PageEpub') return h(PageEpub)
      if (appStore.appPage == 'PageDocx') return h(PageDocx)
      if (appStore.appPage == 'PageSheet') return h(PageSheet)
      if (appStore.appPage == 'PageVideoXBT') return h(PageVideoXBTVue)
      if (appStore.appPage == 'PageCode') return h(PageCode)
      if (appStore.appPage == 'PageImage') return h(PageImage)
      if (appStore.appPage == 'PageVideo') return h(PageVideo)
      if (appStore.appPage == 'PageWorker') return h(PageWorker)
      return h(PageLoading)
    }
  }
}
</script>

<style></style>

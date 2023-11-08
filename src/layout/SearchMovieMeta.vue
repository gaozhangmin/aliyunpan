<script lang="ts">
import { modalCloseAll } from '../utils/modal'
import { defineComponent, ref, reactive, nextTick, onMounted } from 'vue'
import dayjs from 'dayjs'
import { PropType } from 'vue/dist/vue'
import { IAliGetFileModel } from '../aliapi/alimodels'
import AliHttp from '../aliapi/alihttp'
import DB from '../utils/db'

type Item = IAliGetFileModel

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    movies: {
      type:  Array as PropType<Item[]>,
      required: true
    }
  },
  setup(props) {
    const okLoading = ref(false)
    const formRef = ref()
    const searchRes = ref([{
      id: -1,
      media_type: "",
      name: "",
      title: "",
      release_date: "",
      first_air_date: "",
      overview: "",
      poster_path: ""


    }])
    const selectedMovie = ref({})
    const searchTMDB = async () => {
      const url = `https://api.themoviedb.org/3/search/multi?api_key=87d8eb3d0895eaf37c2929fd5d9f7cce&language=zh-CN&query=${form.name}&page=1&include_adult=false`
      const resp = await AliHttp.GetWithOutUserId(url);
      if (AliHttp.IsSuccess(resp.code)
        && resp.body.results.length > 0) {
        searchRes.value = resp.body.results.slice(0, 10)
      } else {
        searchRes.value = []
      }
    }

    // @ts-ignore
    const saveMeta = async (minfo) => {
      selectedMovie.value = minfo
    }

    const selectMeta = async() => {
      // @ts-ignore
      await DB.saveValueString(props.movies[0].file_id, selectedMovie.value.media_type+","+selectedMovie.value.id.toString())
      modalCloseAll()
    }


    const form = reactive({
      name: ''
    })

    const handleOpen = async () => {
      await nextTick()
      formRef.value.resetFields()
    }

    const handleClose = () => {
      if (okLoading.value) okLoading.value = false
      formRef.value.resetFields()
      searchRes.value = []
    }

    return { okLoading, selectedMovie, saveMeta, selectMeta, form, formRef, handleOpen, searchRes, handleClose, searchTMDB, dayjs }
  },
  methods: {
    handleHide() {
      modalCloseAll()
    },
    async handleOK() {
    }
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass"
           :footer="false" :unmount-on-close="true" :mask-closable="false"
           @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title >
      <span class="font-semibold">搜索元数据</span>
    </template>
    <p class="text-base font-extrabold text-center break-text" style="margin-top: -20px;">{{ movies[0].name }}</p>
    <div class="modal-wrapper" style="width: 700px;">
      <div style="width: 700px; margin-left: -30px; flex: 1; overflow-y: auto;">
        <a-form ref="formRef" :model="form" layout="horizontal" auto-label-width>
          <a-form-item field="name">
            <a-input v-model.trim="form.name" placeholder="搜索" allow-clear @change="searchTMDB" />
          </a-form-item>
        </a-form>
        <div v-if='searchRes.length == 0 && form.name'>
          <p class="font-bold text-lg ml-60">没有发现任何结果</p>
        </div>
        <div v-else v-for="movieData in searchRes"
             :key="movieData.id" class="movie-result"
             @click="saveMeta(movieData)"
             :class="{ 'selected': movieData === selectedMovie }">
          <div class="movie-poster-container">
            <img :src="'https://image.tmdb.org/t/p/original' + movieData.poster_path" class="w-30 h-40" />
          </div>
          <div>
            <p class="font-bold text-lg">{{ movieData.name || movieData.title }}</p>
            <p class="movie-date font-semibold">{{ movieData.media_type.toUpperCase()}}</p>
            <p class="movie-date font-semibold">{{ movieData.release_date || movieData.first_air_date }}</p>
            <p class="movie-overview">{{ movieData.overview }}</p>
          </div>
          <div v-if="movieData === selectedMovie" class='mr-5'>
            <svg class="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
    <div class="modalfoot">
      <div style="flex-grow: 1"></div>
      <a-button type="primary" size="small" :loading="okLoading" @click="selectMeta">确定</a-button>
    </div>
  </a-modal>
</template>

<style>
.movie-result {
  width: 700px;
  display: flex;
  overflow-scrolling: auto;
  margin-bottom: 10px;
}

.movie-poster-container {
  flex: 0 0 auto;
  margin-right: 10px;
}

.movie-date {
  margin-bottom: 5px;
}

.movie-overview {
  //white-space: pre-line;
  overflow: scroll;
  flex-wrap: nowrap;
  text-overflow: ellipsis;
  height: 100px;
  width: 100%;
}

.modal-wrapper {
  overflow-y: scroll;
  margin: 0 auto;
  display: flex;
  padding: 20px;
}
.selected {
  background-color: #ff5f2e; /* 选中时的背景颜色 */
  //border: 1px solid #2efff5; /* 选中时的边框样式 */
  border-radius: 10px;
}
.break-text {
  white-space: nowrap;
  overflow: hidden; /* 隐藏超出容器的文本 */
  text-overflow: ellipsis; /* 使用省略号表示截断的文本 */
}
</style>

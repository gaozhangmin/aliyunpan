<script lang="ts">

import { modalCloseAll } from '../../utils/modal'
import {defineComponent, ref, PropType, onBeforeMount} from 'vue'
import AliAlbum from "../../aliapi/album";
import {IAliAlbumsList, IAliShareAnonymous} from '../../aliapi/alimodels'
import message from "../../utils/message";

export default defineComponent({
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    photos_file_id: {
      type: Array as PropType<string[]>,
      required: true
    }
  },
  setup(props) {
    const okLoading = ref(false)
    const album_list = ref<IAliAlbumsList[]>([])
    const selected_albums = ref<IAliAlbumsList>({
      name:'',
      friendly_name:'',
      preview:'',
      image_count:0
    } as IAliAlbumsList)

    const handleOpen = async () => {
      const albums = await AliAlbum.ApiAlbumsList()
      const newAlbums = albums.filter((album) => album.name !== props.photos_file_id[props.photos_file_id.length-1])
      console.log("handleOpen", newAlbums)

      if (newAlbums.length > 0) {
        album_list.value.splice(0, album_list.value.length);
        album_list.value.push(...newAlbums)
      }
    }
    onBeforeMount(handleOpen);

    const handleAdd = (album_id:string) => {
      if (album_id) {
        okLoading.value = true;
        AliAlbum.ApiAlbumAddExistPic(album_id, props.photos_file_id.slice(0, -1))
            .then(() => {
              okLoading.value = false;
              message.info('成功添加照片')
            })
            .catch((error) => {
              message.error('添加照片失败')
              okLoading.value = false;
            });
      }
    }

    const handleClose = () => {
      
      if (okLoading.value) okLoading.value = false
    }

    // const toggleAlbumSelection = (album: IAliAlbumsList) => {
    //   if (selected_albums.name === album.name) {
    //     return;
    //   }
    //   selected_albums = album;
    //   console.log("toggleAlbumSelection", selected_albums)
    // }

    return { okLoading, handleOpen, handleClose, album_list, selected_albums, handleAdd }
  },
  methods: {
    handleHide() {
      modalCloseAll()
    },
    toggleAlbumSelection(album: IAliAlbumsList) {
      if (this.selected_albums && this.selected_albums.name === album.name) {
        return;
      }
      this.selected_albums = album;
      console.log("toggleAlbumSelection", this.selected_albums, this.selected_albums.name === album.name)
    },

    handleOK() {
      if (this.selected_albums) {
        const albumId = this.selected_albums.name
        this.handleAdd(albumId)
      }
      this.handleHide()
    }
  }
})
</script>

<template>
  <a-modal :visible="visible" modal-class="modalclass" :footer="false" :unmount-on-close="true" :mask-closable="false" @cancel="handleHide" @before-open="handleOpen" @close="handleClose">
    <template #title>
      <span class="modaltitle">添加到</span>
    </template>
    <div class="modalbody" style="width: 440px">
      <div class="listview">
        <a   @click="toggleAlbumSelection(album)" v-for="album in album_list" :key="album.name" :class="{ 'selected': album.name === selected_albums.name }">
          <div style="position: relative">
            <div class="list_img" :style="{ backgroundImage: album.preview === '' ? '' : `url(${album.preview})` }"></div>
            <span style="margin-left: 27px;">{{ album.friendly_name }}</span>
          </div>
        </a>
      </div>
    </div>
    <div class="modalfoot">
      <div style="flex-grow: 1"></div>
      <a-button v-if="!okLoading" type="outline" size="small" @click="handleHide">取消</a-button>
      <a-button type="primary" size="small" :loading="okLoading" @click="handleOK">添加</a-button>
    </div>
  </a-modal>
</template>

<style>
.selected {
  background-color: #e0e0e0;
}
.modalbody {
  margin-bottom: 16px; /* 添加底部间距 */
}

.modalfoot {
  margin-top: 16px; /* 添加顶部间距 */
}
</style>

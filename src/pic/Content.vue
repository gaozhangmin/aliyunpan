<script>
import '../assets/style.css'
import '../assets/contentview.css'

import AliAlbum from '../aliapi/album'
import { modalCreatNewAlbum, modalMoveToAlbum } from '../utils/modal'
import { handleUpload } from '../pan/topbtns/topbtn'
import { Tooltip as  AntdTooltip } from 'ant-design-vue'
import AliHttp from "../aliapi/alihttp";

const PHOTO_PER_PAGE = 50;

export default {
  name: "Content",
  props: [ 'base_name', 'album_friendly_name', 'sidebar_shown_pc' ],
  data() {
    return {
      IsListSelectedAll: false,
      page_count: 0,
      current_page_to_load: 0,
      photo_count: 0,
      photo_list: [],
      initial_scroll_height: 0,
      response_load_new: true,
      selected_photos: [],
      isselected: false
    }
  },
  watch: {
    base_name() {
      this.initialize();
    }
  },
  created() {},
  async mounted() {
    this.initialize();
  },
  methods: {
    modalMoveToAlbum,
    handleUpload,
    modalCreatNewAlbum,
    raise_event_show_sidebar(val, mode) {
      this.$emit('should-show-sidebar', val, mode);
    },
    raise_event_show_preview(image_file_name, photo_list, photo_index, album_name, photo_obj) {
      this.$emit('preview-photo', image_file_name, photo_list, photo_index, album_name, photo_obj);
    },
    async load_image() {
      if (!this.response_load_new) {
        return;
      }
      this.response_load_new = false;
      setTimeout(() => { this.response_load_new = true; }, 1000)
      if (this.current_page_to_load >= this.page_count)
        return;

      if (this.base_name === 'all') {
        const photos = await AliAlbum.ApiAllPhotos()
        this.photo_list.push(...photos)
        this.photo_count = this.photo_list.length
      } else {
        const photos = await AliAlbum.ApiAlbumListFiles(this.base_name)
        if (photos !== undefined) {
          photos.forEach((photo) => {
            photo.album_name = this.album_friendly_name
          })
          this.photo_list.push(...photos)
        }
      }
      this.current_page_to_load++;
    },
    async initialize() {
      if (this.base_name === "")
        return;
      this.selected_photos = [];
      this.isselected = false;
      this.current_page_to_load = 0;
      this.photo_list = [];
      this.response_load_new = true;
      this.initial_scroll_height = 0;
      this.photo_count = this.page_count = 0;
      if (this.base_name === 'all') {
        const allAlbums = await AliAlbum.ApiAlbumsList()
        if (allAlbums.length > 0) {
          allAlbums.forEach((album) => {
            this.photo_count += album.image_count;
          })
          this.page_count = Math.ceil(this.photo_count / PHOTO_PER_PAGE);
          if (this.page_count > 0) {
            this.load_image();
          }
        }
      } else {
        const albumInfo = await AliAlbum.ApiAlbumGet(this.base_name)
        if (albumInfo) {
          this.photo_count = albumInfo.image_count;
          this.page_count = Math.ceil(this.photo_count / PHOTO_PER_PAGE);
          // load page 0 first
          if (this.page_count > 0) {
            this.load_image();
          }
        }
      }
    },
    handleScroll: function(el) {
      if (this.initial_scroll_height === 0)
        this.initial_scroll_height = el.srcElement.scrollHeight / 10;
      if((el.srcElement.offsetHeight + el.srcElement.scrollTop) >= el.srcElement.scrollHeight - this.initial_scroll_height) {
        this.load_image()
      }
    },
    toggleSelect(photo) {
      if (this.isSelected(photo)) {
        // 已选中，移除选中状态
        const index = this.selected_photos.findIndex(selectedPhoto => selectedPhoto === photo.file_id);
        if (index !== -1) {
          this.selected_photos.splice(index, 1);
        }
      } else {
        // 未选中，添加选中状态
        this.selected_photos.push(photo.file_id);
      }
      this.isselected = this.selected_photos.length > 0
    },
    handleSelectAll() {
      if (this.selected_photos.length === this.photo_list.length) {
        // 如果已经全部选择，则取消选择所有照片
        this.selected_photos = [];
      } else {
        // 否则，选择所有照片
        const photosFileid = this.photo_list.map(photo => photo.file_id);
        this.selected_photos = [...photosFileid];
      }
      this.isselected = this.selected_photos.length > 0
    },
    isSelected(photo) {
      return this.selected_photos.includes(photo.file_id);
    },
    async handleRemovePhoto() {
      // const photoNames = this.selected_photos.map(photo => photo.file_id);
      const resp = await AliAlbum.ApiAlbumFilesDelete(this.base_name, this.selected_photos);
      if (!AliHttp.IsSuccess(resp.code)) {
        this.$message.error("移除照片失败")
      } else {
        this.$message.success("移除照片成功")
        this.initialize();
      }
    },
    async handleTrash() {
      // const photoNames = this.selected_photos.map(photo => photo.file_id);
      const resp = await AliAlbum.trashPhotos(this.selected_photos);
      if (!resp) {
        this.$message.error("移除照片到回收站失败")
      } else {
        this.$message.success("移除照片到回收站成功")
        this.initialize();
      }
    },
  }
}

</script>

<template>
  <div class="toppannav">
    <span> {{ album_friendly_name }} </span>
  </div>
  <div style="height: 14px"></div>
  <div class="toppanbtns" style="height: 26px; margin-bottom:5px;" tabindex="-1">
    <div class="toppanbtn">
      <a-button type="text" size="small" tabindex="-1" @click="() => modalCreatNewAlbum()"><i class="iconfont iconplus" />新建相册</a-button>
      <a-button type="text" size="small" tabindex="-1" @click="() => handleUpload('pic', this.base_name)"><i class="iconfont iconupload" />上传照片</a-button>
    </div>
    <div class="toppanbtn" v-show="isselected">
      <a-button type="text" size="small" tabindex="-1"  @click="() => handleRemovePhoto()"><i class="iconfont icondelete" />从相册中移除</a-button>
      <a-button type="text" size="small" tabindex="-1"  @click="() => handleTrash()"><i class="iconfont iconrest" />移到回收站</a-button>
      <a-button type="text" size="small" tabindex="-1"  @click="() => { const newSelectedPhotos = selected_photos.concat(this.base_name); modalMoveToAlbum(newSelectedPhotos); }"><i class="iconfont iconplus" />添加到相册</a-button>
    </div>
  </div>
  <div class="toppanarea" tabindex="-1">
    <div style="margin: 0 3px">
      <AntdTooltip title="点击全选" placement="left">
        <a-button shape="circle" type="text" tabindex="-1" class="select all" title="Ctrl+A" @click="handleSelectAll">
          <i :class="[selected_photos.length === photo_list.length ? 'iconfont iconrsuccess' : 'iconfont iconpic2']" />
        </a-button>
      </AntdTooltip>
    </div>
    <div class='selectInfo'>已选中 {{ selected_photos.length }} / {{ photo_list.length }} 个</div>
  </div>

  <div  style="height:100%; overflow-y: auto" @scroll="handleScroll">
    <div class="cnav">
      <div class="title right">
        <span style="color: lightskyblue; margin-right: 10px;">{{ photo_count }}张图片</span>
      </div>
    </div>

    <div>
      <div class="photo box" v-for="(photo, i) in photo_list" :photo-name="photo.name" :key="i" :style="{ backgroundImage: `url('${ photo.thumbnail }')` }"
           @click="raise_event_show_preview(photo.name, photo_list, i, photo.album_name, photo)">
        <a-button shape='circle' type='text' tabindex='-1' class='select' :title="i"
                  @click.prevent.stop="toggleSelect(photo)" style="position: absolute; top: 5px; left: 5px; z-index: 99999; color: red;">
          <i :class="selected_photos.includes(photo.file_id) ?  'iconfont iconrsuccess' : 'iconfont iconpic2'"/>
        </a-button>
      </div>
    </div>
  </div>
</template>



<style scoped>

</style>
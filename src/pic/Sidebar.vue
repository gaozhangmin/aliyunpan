<template>
  <div style="padding-left: 10px; padding-right: 10px; height: 100%; overflow-y: auto" @scroll="handleScroll">
    <div :class="['navbar', shouldShowSemiTransparentNavBar ? '' : 'large']">
      <div class="left-button-group">
        <a class="hidden-btn" href="javascript:void(0)" @click="() => { this.raise_event_show_sidebar(false, 'mobile'); this.raise_event_show_sidebar(false, 'pc') }">隐藏</a>
      </div>
    </div>
    <div class="title1 navtitle" :style="{ marginTop: '50px', opacity: 1-shouldShowSemiTransparentNavBar }">
      照片
    </div>

    <div class="listview" style="margin-top: 5px;">
      <a :class="get_css_class_list_item('all')" @click="on_switch_album('all', '图库')" href="javascript:void(0)"><span class="color-text-1">图库</span></a>
    </div>

    <div class="title2">
      我的相簿
      <a-button type="text" size="small" tabindex="-1"  title="刷新 F5" @click="this.getAlbumList">
        <template #icon>
          <i class="iconfont iconreload-1-icon" />
        </template>
      </a-button>
    </div>
    <div class="listview">
      <a :class="get_css_class_list_item(album.name)"  @click="on_switch_album(album.name, album.friendly_name)"  href="javascript:void(0)" v-for="album in album_list" :key="album.name">
        <div style="position: relative">
          <div class="list_img"  :style="{ backgroundImage: album.preview === '' ? '' : `url(${album.preview})` }"></div>
          <span class="color-text-1" style="margin-left: 27px;">{{ album.friendly_name }}</span>
          <a class="delete-button" href="javascript:void(0)" @click.stop="deleteAlbum(album)">
            <i class="iconfont icondelete" />
          </a>
        </div>
      </a>
    </div>
  </div>
</template>

<script>
import '../assets/style.css';
import '../assets/sidebar.css';
import AliAlbum from '../aliapi/album'
import AliHttp from '../aliapi/alihttp'
import 'ant-design-vue/es/tree/style/css'

export default {
  name: "Sidebar",
  data: () => ({
    album_list: [],
    selected_album_name: 'all',

    shouldShowSemiTransparentNavBar: false,
  }),
  methods: {

    async updateAlbum(album, newName) {
      const resp = await AliAlbum.ApiAlbumUpdate(album.name, newName, '');
      if (AliHttp.IsSuccess(resp.code)) {
        album.friendly_name = newName
      } else {
        this.$message.error("相册更改失败")
      }
    },
    async deleteAlbum(album) {
      const resp = await AliAlbum.ApiAlbumDelete(album.name)
      if (AliHttp.IsSuccess(resp.code)) {
        this.getAlbumList()
      } else {
        this.$message.error("删除相册失败")
      }
    },
    raise_event_show_sidebar(val, mode) {
      this.$emit('should-show-sidebar', val, mode);
    },
    on_switch_album(album_name, album_friendly_name) {
      this.$emit('switch-album', album_name, album_friendly_name);
      this.selected_album_name = album_name;
      if (window.innerWidth <= 1200) {
        this.raise_event_show_sidebar(false, 'mobile');
      }
    },
    get_css_class_list_item(album_name) {
      return album_name === this.selected_album_name ? "selected" : "";
    },
    handleScroll: function(el) {
      console.log((el.srcElement.scrollTop));
      if((el.srcElement.scrollTop) >= 30) {
        this.shouldShowSemiTransparentNavBar = true;
      }
      else {
        this.shouldShowSemiTransparentNavBar = false;
      }
    },
    async getAlbumList() {
      this.album_list = await AliAlbum.ApiAlbumsList()
    }
  }
}
</script>

<style scoped>
.delete-button {
  position: absolute;
  top: 0;
  right: 0;
  display: none;
}

.listview a:hover .delete-button {
  display: block;
}
.icondelete {
  color: red;
}

</style>
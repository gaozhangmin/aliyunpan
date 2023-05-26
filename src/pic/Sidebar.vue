<template>
  <div style="padding-left: 10px; padding-right: 10px; height: 100%; overflow-y: auto" @scroll="handleScroll">
    <div :class="['navbar', shouldShowSemiTransparentNavBar ? '' : 'large']">
      <div class="nav-title">
        照片
      </div>
      <div class="left-button-group">
        <a class="hidden-btn" href="javascript:void(0)" @click="() => { this.raise_event_show_sidebar(false, 'mobile'); this.raise_event_show_sidebar(false, 'pc') }">隐藏</a>
      </div>

<!--      <div class="right-button-group">-->
<!--        <a href="javascript:void(0)" @click="logout()">退出</a>-->
<!--      </div>-->
    </div>

    <div class="title1 navtitle" :style="{ marginTop: '50px', opacity: 1-shouldShowSemiTransparentNavBar }">
      照片
    </div>

    <div class="listview" style="margin-top: 5px;">
      <a :class="get_css_class_list_item('all')" @click="on_switch_album('all', '图库')" href="javascript:void(0)"><span>图库</span></a>
<!--      <a :class="get_css_class_list_item('/recent')" @click="on_switch_album('/recent', '最近项目')" href="javascript:void(0)"><span>最近项目</span></a>-->
<!--      <a :class="get_css_class_list_item('/fav')" @click="on_switch_album('fav', '个人收藏')" href="javascript:void(0)"><span>个人收藏</span></a>-->
    </div>

    <div class="title2" @click="this.getAlbumList">
      我的相簿
    </div>
    <div class="listview">
      <a :class="get_css_class_list_item(album.name)" @click="on_switch_album(album.name, album.friendly_name)"  href="javascript:void(0)" v-for="album in album_list" :key="album.name">
        <div style="position: relative">
          <div class="list_img" :style="{ backgroundImage: album.preview === '' ? '' : `url(${album.preview})` }"></div>
          <span style="margin-left: 27px;">{{ album.friendly_name }}</span>
        </div>

      </a>
    </div>
  </div>
</template>

<script>
import '../assets/style.css';
import '../assets/sidebar.css';
import AliAlbum from '../aliapi/album'

export default {
  name: "Sidebar",
  data: () => ({
    album_list: [],
    selected_album_name: 'all',

    shouldShowSemiTransparentNavBar: false,
  }),
  methods: {
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

</style>
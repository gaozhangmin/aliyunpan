<template>
  <div :class="showNavBar ? 'preview-with-navbar' : 'preview-hidden-navbar'" style="width: 100%; height: 100%;">
    <span style="position: absolute; top: 45%; text-align: center; color: #888; display: block; width: 100%;">正在加载图片...</span>
    <div class="preview-photo-base preview-bg" :style="preview_cache_img_style"></div>
    <div class="preview-photo-high-res preview-bg" :style="preview_img_style"></div>
    <div class="preview-mask" @click="() => { showNavBar = !showNavBar }"></div>
    <div class="navbar" style="width: 100% !important;" v-show="showNavBar">
      <div class="nav-title">
        {{ photo_name }}
      </div>
      <div class="left-button-group" @click="raise_hide_preview()">
        <i class="larrow"></i><span class="backtext">{{ catalog_name === '' ? '相册列表':catalog_name }}</span>
      </div>

      <div class="right-button-group">
        <a href="javascript:void(0)" @click="downloadPhoto()">下载</a>
      </div>


    </div>
  </div>
</template>

<script>
import '../assets/style.css';
import '../assets/preview.css';

export default {
  name: "Preview",
  props: [ 'current_album_name', 'current_photo_filename', 'image_list', 'index', 'catalog_name', 'current_photo' ],
  data: () => ({
    showNavBar: true,
    preview_img_style: {},
    preview_cache_img_style: {}
  }),
  computed: {
    photo_name() {
      return this.current_photo_filename.replace(/\.[a-z|A-Z|0-9]*$/g, "");
    },
    thumbnail_path() {
      return this.current_photo.thumbnail
    },
    photo_path() {
      return this.current_photo.download_url
    },
  },
  methods: {
    raise_hide_preview() {
      this.$emit('hide-preview');
    },
    downloadPhoto() {
      window.open(this.photo_path);
    },
    getBackgroundSize() {
      //current_photo.h > current_photo.w ? 'auto 100%':'100% auto'
      let ph = this.current_photo.h;
      let pw = this.current_photo.w;
      let wh = window.innerHeight;
      let ww = window.innerWidth;
      let pr = pw / ph;
      let wr = ww / wh;
      let dr = pr - wr;
      const fill_width = 'auto 100%';
      const fill_height = '100% auto';
      console.log(pr, wr);
      if (pr > 1) { // 横屏
        if (wr > 1) { // 横图
          if (dr > 0) return fill_height;
          else return fill_width;
        }
        else { // 竖图
          return fill_height;
        }
      }
      else { // 竖屏
        if (wr > 1) { // 横图
          return fill_width;
        }
        else { // 竖图
          if (dr > 0) {
            return fill_height;
          }
          else return fill_width;
        }
      }
    }
  },
  watch: {
    current_photo() {
      this.preview_img_style = {
        backgroundImage: 'url(\''+this.photo_path+'\')',
        backgroundSize: this.getBackgroundSize()
      };

      this.preview_cache_img_style = {
        backgroundImage: 'url(\''+this.thumbnail_path+'\')',
        backgroundSize: this.getBackgroundSize()
      };
    }
  },
  mounted() {},
}
</script>

<style scoped>

</style>
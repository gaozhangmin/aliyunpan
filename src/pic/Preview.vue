<template>
  <div :class="showNavBar ? 'preview-with-navbar' : 'preview-hidden-navbar'" style="width: 100%; height: 100%;">

    <span style="position: absolute; top: 45%; text-align: center; color: #888; display: block; width: 100%;">正在加载图片...</span>
    <div class="center">
      <div class="preview-photo-base preview-bg" :style="preview_cache_img_style"></div>
      <div class="preview-photo-high-res preview-bg" :style="preview_img_style"></div>
      <div class="prev-next-buttons">
        <a-button type="text" tabindex="-1" @click="goLastImage" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); z-index: 9999;  background: none; box-shadow: none;">
          <i class="iconfont iconarrow-left-1-icon" style="font-size: 80px;"></i>
        </a-button>
        <a-button type="text" tabindex="-1" @click="goNextImage" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999;  background: none; box-shadow: none;">
          <i class="iconfont iconarrow-right-1-icon" style="font-size: 80px;"></i>
        </a-button>
      </div>
    </div>
    <div class="preview-mask" @click="() => { showNavBar = !showNavBar }"></div>
    <div class="navbar" style="width: 100% !important;" v-show="showNavBar" >
<!--      <div class="nav-title">-->
<!--        {{ photo_name }}-->
<!--      </div>-->
      <div class="left-button-group1" @click="raise_hide_preview()">
        <i class="iconfont iconarrow-left-1-icon"></i><span class="backtext">{{ catalog_name === '' ? '相册列表' : catalog_name }}</span>
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
import message from "../utils/message";
import 'ant-design-vue/es/tree/style/css'

export default {
  name: "Preview",
  props: [ 'current_album_name', 'current_photo_filename', 'image_list', 'index', 'catalog_name', 'current_photo' ],
  data: () => ({
    showNavBar: true,
    preview_img_style: {},
    reactiveIndex: -1,
    preview_cache_img_style: {},
    photo_name: '',
    keyDowning: false,
  }),
  computed: {
    thumbnail_path() {
      return this.current_photo.thumbnail
    },
    photo_path() {
      return this.current_photo.download_url
    },
  },
  methods: {
    onKeyDown(event) {
      if (this.showNavBar) return
      event.stopPropagation()
      event.preventDefault()
      if (this.keyDowning) return
      this.keyDowning = true
      setTimeout(() => {
        this.keyDowning = false
      }, 200)

      if (event.code === 'ArrowRight') {
        this.goNextImage()
      } else if (event.code === 'ArrowLeft') {
        this.goLastImage()
      }
    },
    goLastImage() {
      this.showNavBar = false
      if (this.reactiveIndex === -1) this.reactiveIndex = this.index;
      const fileIndex = this.reactiveIndex - 1
      if (fileIndex < 0) {
        message.info('已经是第一张图片了');
      } else {
        this.reactiveIndex = fileIndex; // Update the reactive variable
        this.preview_img_style = {
          backgroundImage: 'url(\''+this.image_list[fileIndex].download_url+'\')',
          backgroundSize: this.getBackgroundSize()
        };

        this.preview_cache_img_style = {
          backgroundImage: 'url(\''+this.image_list[fileIndex].thumbnail+'\')',
          backgroundSize: this.getBackgroundSize()
        };
        this.photo_name = this.image_list[fileIndex].name.replace(/\.[a-z|A-Z|0-9]*$/g, "");
      }
    },
    goNextImage() {
      this.showNavBar = false
      if (this.reactiveIndex === -1) this.reactiveIndex = this.index;
      const fileIndex = this.reactiveIndex + 1
      if (fileIndex >= this.image_list.length) {
        message.info('已经是最后一张图片了');
      } else {
        this.reactiveIndex = fileIndex; // Update the reactive variable
        if (this.image_list[fileIndex] !== undefined) {
          this.preview_img_style = {
            backgroundImage: 'url(\''+this.image_list[fileIndex].download_url+'\')',
            backgroundSize: this.getBackgroundSize()
          };

          this.preview_cache_img_style = {
            backgroundImage: 'url(\''+this.image_list[fileIndex].thumbnail+'\')',
            backgroundSize: this.getBackgroundSize()
          };
          this.photo_name = this.image_list[fileIndex].name.replace(/\.[a-z|A-Z|0-9]*$/g, "");
        }
      }
    },


    raise_hide_preview() {
      this.$emit('hide-preview');
    },
    downloadPhoto() {
      window.open(this.photo_path);
    },
    getBackgroundSize() {
      //current_photo.h > current_photo.w ? 'auto 100%':'100% auto'
      let ph = this.current_photo.image_media_metadata?.height || 0;
      let pw = this.current_photo.image_media_metadata?.width || 0;
      let wh = window.innerHeight;
      let ww = window.innerWidth;
      let pr = pw / ph;
      let wr = ww / wh;
      let dr = pr - wr;
      const fill_width = 'auto 100%';
      const fill_height = '100% auto';
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

      this.photo_name = this.current_photo_filename.replace(/\.[a-z|A-Z|0-9]*$/g, "");
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKeyDown, true)
  },
  unmounted() {
    window.removeEventListener('keydown', this.onKeyDown)
  },
}
</script>

<style scoped>
.left-button-group1 {
  position: absolute;
  left: 18px;
  top: 0;
  height: 45px;
  line-height: 45px;
  color: #5555ff;
}
</style>
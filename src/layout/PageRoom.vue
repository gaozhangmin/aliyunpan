<script setup lang='ts'>
import { ref } from 'vue'
import { Card as AntCard, CardMeta as AntCardMeta, Tag as AntTag } from 'ant-design-vue'
import 'ant-design-vue/es/card/style/css'
import 'ant-design-vue/es/tag/style/css'

const isLoading = ref(false)
</script>

<template>
  <div class='page'>
    <div class='block block-movie'>
      <div class='line-raw'>
        <h2 class='raw-title'>新片榜</h2>
      </div>
      <div class='cards-box clearfix'>
        <div v-for='(item, index) of Array(6).fill(1)' class='card-container' :key='index'>
          <AntCard class='movie-card' :loading='isLoading' :key='index' :hoverable='!isLoading'>
            <template #cover>
              <div class='loading-img-box' v-if='isLoading'>
                <img src='/images/loading.svg' alt='loading' />
              </div>
              <a href='/detail/36283000' v-else>
                <div class='LazyLoad is-visible' style='height: 260px;'>
                  <img src='file:///C:/Users/Odomu/Desktop/emby2/Emby_files/Primary(15)'>
                </div>
              </a>
            </template>
            <AntTag class='img-tag tag-orange'>8.0</AntTag>
            <AntCardMeta title='Card Title' description='xxxxxxxxxxxxxx' />
          </AntCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang='less'>

.clearfix:after {
  content: "";
  clear: both;
  height: 0;
  visibility: hidden;
}


.page {
  min-width: 1000px;
  width: 100%;
  height: 100%;
  margin: 0 auto;

  .block {
    margin: 0 0 50px 0;
  }
}

.block-movie {
  position: relative;
  height: 100%;

  .raw-title {
    font-size: 1.5rem;
  }

  .cards-box {
    width: 100%;

    .card-container {
      width: 192px;
      display: inline-block;
    }

    .movie-card {
      margin: 10px 8px 10px 0;

      :deep(.ant-card-body) {
        padding: 5px 10px;

        :deep(.ant-card-meta-detail) > div:not(:last-child) {
          margin: 0;
        }
      }

      :deep(.ant-tag.tag-orange) {
        background-color: #ff5c38;
        border-color: #ff5c38;
        color: #fff;
      }

      .img-tag {
        position: absolute;
        top: 5px;
        left: 5px;
      }

      img {
        width: 100%;
        height: 260px;
      }

      .loading-img-box {
        width: 100%;
        height: 260px;
        position: relative;
        background-color: #f5f6f7;
        cursor: not-allowed;

        img {
          position: absolute;
          top: 50%;
          left: 50%;
          width: auto;
          height: auto;
          transform: translate(-50%, -50%);
        }
      }
    }
  }
}
</style>
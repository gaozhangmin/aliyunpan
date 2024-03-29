<script setup lang='ts'>
import { ref } from 'vue'
import { modalCloseAll } from '../../utils/modal'
import { usePanFileStore, usePanTreeStore } from '../../store'
import { IAliAlbumInfo, IAliGetFileModel } from '../../aliapi/alimodels'
import AliAlbum from '../../aliapi/album'
import message from '../../utils/message'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const albumList = ref<IAliAlbumInfo[]>([])
const okLoading = ref(false)
const selectedKey = ref('')
const addOneAlbumItem = ref(false)
const albumName = ref('未命名')
const panFileStore = usePanFileStore()
const panTreeStore = usePanTreeStore()
let fileList: IAliGetFileModel[] = []

const handleOpen = () => {
  fileList = panFileStore.GetSelected()
  if (fileList.length == 0) {
    const focus = panFileStore.mGetFocus()
    panFileStore.mKeyboardSelect(focus, false, false)
    fileList = panFileStore.GetSelected()
  }
  AliAlbum.ApiAlbumList(panTreeStore.user_id).then(data => {
    albumList.value = data
  })
  okLoading.value = false
}

const handleClick = (key: string) => {
  selectedKey.value = key
}

const handleHide = () => {
  modalCloseAll()
}

const handleClose = () => {
  if (okLoading.value) okLoading.value = false
  albumList.value = []
  selectedKey.value = ''
  addOneAlbumItem.value = false
  albumName.value = '未命名'
  fileList = []
}

const handleOK = () => {
  const drive_file_list: { drive_id: string, file_id: string }[] = []
  for (let file of fileList) {
    drive_file_list.push({
      drive_id: panTreeStore.drive_id,
      file_id: file.file_id
    })
  }
  AliAlbum.ApiAlbumAddFiles(panTreeStore.user_id, selectedKey.value, drive_file_list)
    .then(data => {
      if (data) {
        message.success('添加到相册 成功')
      } else {
        message.error('添加到相册 失败')
      }
    }).catch((err: any) => {
    message.error('添加到相册 失败', err)
  }).then(() => {
    modalCloseAll()
  })
}

const handleCreateAlbum = () => {
  addOneAlbumItem.value = true
}
const handleCheckAlbum = async () => {
  addOneAlbumItem.value = false
  const resp = await AliAlbum.ApiAlbumCreate(panTreeStore.user_id, albumName.value, '')
  if (resp === 'success') {
    albumList.value = await AliAlbum.ApiAlbumList(panTreeStore.user_id)
  }
}
const handleCloseAlbum = () => {
  addOneAlbumItem.value = false
}
</script>

<template>
  <a-modal :visible='visible' modal-class='modalclass'
           :footer='false' :unmount-on-close='true' :mask-closable='false'
           @cancel='handleHide' @close='handleClose' @before-open='handleOpen'>
    <template #title>
      <span class='modaltitle'>添加到相册</span>
    </template>
    <div style='width: 80vw; max-width: 320px; height: calc(80vh - 300px)'>
      <a-skeleton v-if='okLoading' :loading='true' :animation='true'>
        <a-skeleton-line :rows='3' :line-height='50' :line-spacing='50' />
      </a-skeleton>
      <div v-else class='modalbody'>
        <div class='list-container'>
          <div style='position: relative;'>
            <div v-show='addOneAlbumItem' class='list-item-new'>
              <div class='item'>
                <div class='left-wrapper'>
                  <span class='left-cover'>
                    <span class='svg-icon' data-render-as='svg'>
                      <svg viewBox='0 0 1024 1024'>
                        <path
                          d='M277.333333 123.733333a25.6 25.6 0 0 0 0 51.2h469.333334a25.6 25.6 0 1 0 0-51.2H277.333333zM198.4 245.333333a25.6 25.6 0 0 1 25.6-25.6h576a25.6 25.6 0 1 1 0 51.2h-576a25.6 25.6 0 0 1-25.6-25.6zM139.626667 378.24C128 401.066667 128 430.933333 128 490.666667v234.666666c0 59.733333 0 89.6 11.626667 112.426667a106.666667 106.666667 0 0 0 46.613333 46.613333C209.066667 896 238.933333 896 298.666667 896h426.666666c59.733333 0 89.6 0 112.426667-11.626667a106.666667 106.666667 0 0 0 46.613333-46.613333C896 814.933333 896 785.066667 896 725.333333V490.666667c0-59.733333 0-89.6-11.626667-112.426667a106.666667 106.666667 0 0 0-46.613333-46.613333C814.933333 320 785.066667 320 725.333333 320H298.666667c-59.733333 0-89.6 0-112.426667 11.626667a106.666667 106.666667 0 0 0-46.613333 46.613333zM725.333333 371.2c30.72 0 50.666667 0.042667 65.898667 1.28 14.613333 1.194667 20.288 3.242667 23.274667 4.757333a55.466667 55.466667 0 0 1 24.256 24.256c1.514667 2.986667 3.562667 8.661333 4.757333 23.274667 1.237333 15.232 1.28 35.2 1.28 65.92v234.666667c0 30.698667-0.042667 50.645333-1.28 65.877333-1.194667 14.613333-3.242667 20.288-4.757333 23.274667a55.466667 55.466667 0 0 1-24.256 24.256c-2.986667 1.514667-8.661333 3.562667-23.274667 4.757333-15.232 1.237333-35.2 1.28-65.898667 1.28H298.666667c-30.72 0-50.666667-0.042667-65.898667-1.28-14.613333-1.194667-20.288-3.242667-23.274667-4.757333a55.466667 55.466667 0 0 1-24.256-24.256c-1.514667-2.986667-3.562667-8.661333-4.757333-23.274667-1.237333-15.232-1.28-35.2-1.28-65.898667V490.666667c0-30.72 0.042667-50.666667 1.28-65.877334 1.194667-14.634667 3.242667-20.309333 4.757333-23.296a55.466667 55.466667 0 0 1 24.256-24.256c2.986667-1.493333 8.661333-3.562667 23.274667-4.757333 15.232-1.237333 35.2-1.28 65.898667-1.28h426.666666z'></path>
                      </svg>
                    </span>
                  </span>
                  <div class='left-info'>
                    <a-input type='text' placeholder='相册名' v-model:model-value='albumName' />
                  </div>
                </div>
                <div class='right-wrapper'>
                  <span class='svg-icon check-mark' data-render-as='svg' @click='handleCheckAlbum'>
                    <svg viewBox='0 0 1024 1024'>
                      <path
                        d='M512 85.333333C277.333333 85.333333 85.333333 277.333333 85.333333 512s192 426.666667 426.666667 426.666667 426.666667-192 426.666667-426.666667S746.666667 85.333333 512 85.333333z m-2.133333 612.266667c-2.133333 2.133333-4.266667 6.4-6.4 8.533333-2.133333 2.133333-6.4 8.533333-12.8 10.666667-8.533333 4.266667-17.066667 4.266667-27.733334 2.133333-6.4-2.133333-12.8-6.4-14.933333-8.533333-2.133333-2.133333-4.266667-6.4-6.4-8.533333l-140.8-162.133334 38.4-34.133333 132.266667 153.6L682.666667 307.2l44.8 25.6-217.6 364.8z'></path>
                    </svg>
                  </span>
                  <span class='svg-icon close-mark' data-render-as='svg' @click='handleCloseAlbum'>
                    <svg viewBox='0 0 1024 1024'>
                      <path
                        d='M512 85.333333C277.333333 85.333333 85.333333 277.333333 85.333333 512s192 426.666667 426.666667 426.666667 426.666667-192 426.666667-426.666667S746.666667 85.333333 512 85.333333z m132.266667 593.066667L512 548.266667l-132.266667 132.266666-36.266666-36.266666 132.266666-132.266667-132.266666-132.266667 36.266666-36.266666 132.266667 132.266666 132.266667-132.266666 36.266666 36.266666-132.266666 132.266667 132.266666 132.266667-36.266666 34.133333z'></path>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <div v-for='item in albumList' :key='item.album_id'
                 :class="'list-item ' + (selectedKey === item.album_id ? 'active' : '') ">
              <div class='item' @click='handleClick(item.album_id)'>
                <div class='left-wrapper'>
                  <span class='left-cover'>
                    <span v-if='!item.coverUrl' class='svg-icon' data-render-as='svg'>
                      <svg viewBox='0 0 1024 1024'>
                        <path
                          d='M277.333333 123.733333a25.6 25.6 0 0 0 0 51.2h469.333334a25.6 25.6 0 1 0 0-51.2H277.333333zM198.4 245.333333a25.6 25.6 0 0 1 25.6-25.6h576a25.6 25.6 0 1 1 0 51.2h-576a25.6 25.6 0 0 1-25.6-25.6zM139.626667 378.24C128 401.066667 128 430.933333 128 490.666667v234.666666c0 59.733333 0 89.6 11.626667 112.426667a106.666667 106.666667 0 0 0 46.613333 46.613333C209.066667 896 238.933333 896 298.666667 896h426.666666c59.733333 0 89.6 0 112.426667-11.626667a106.666667 106.666667 0 0 0 46.613333-46.613333C896 814.933333 896 785.066667 896 725.333333V490.666667c0-59.733333 0-89.6-11.626667-112.426667a106.666667 106.666667 0 0 0-46.613333-46.613333C814.933333 320 785.066667 320 725.333333 320H298.666667c-59.733333 0-89.6 0-112.426667 11.626667a106.666667 106.666667 0 0 0-46.613333 46.613333zM725.333333 371.2c30.72 0 50.666667 0.042667 65.898667 1.28 14.613333 1.194667 20.288 3.242667 23.274667 4.757333a55.466667 55.466667 0 0 1 24.256 24.256c1.514667 2.986667 3.562667 8.661333 4.757333 23.274667 1.237333 15.232 1.28 35.2 1.28 65.92v234.666667c0 30.698667-0.042667 50.645333-1.28 65.877333-1.194667 14.613333-3.242667 20.288-4.757333 23.274667a55.466667 55.466667 0 0 1-24.256 24.256c-2.986667 1.514667-8.661333 3.562667-23.274667 4.757333-15.232 1.237333-35.2 1.28-65.898667 1.28H298.666667c-30.72 0-50.666667-0.042667-65.898667-1.28-14.613333-1.194667-20.288-3.242667-23.274667-4.757333a55.466667 55.466667 0 0 1-24.256-24.256c-1.514667-2.986667-3.562667-8.661333-4.757333-23.274667-1.237333-15.232-1.28-35.2-1.28-65.898667V490.666667c0-30.72 0.042667-50.666667 1.28-65.877334 1.194667-14.634667 3.242667-20.309333 4.757333-23.296a55.466667 55.466667 0 0 1 24.256-24.256c2.986667-1.493333 8.661333-3.562667 23.274667-4.757333 15.232-1.237333 35.2-1.28 65.898667-1.28h426.666666z'></path>
                      </svg>
                    </span>
                    <img v-else class='left-img' :src='item.coverUrl' alt='' />
                  </span>
                  <div class='left-info'>
                    <div class='left-info-title'>{{ item.name }}</div>
                    <div class='left-info-desc'>{{ item.description }}</div>
                  </div>
                </div>
                <div class='count'> {{ item.file_count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class='modalfoot'>
      <a-button type='outline' size='small' @click='handleCreateAlbum'>新建相册</a-button>
      <div style='flex-grow: 1'></div>
      <a-button v-if='!okLoading' type='outline' size='small' @click='handleHide'>取消</a-button>
      <a-button type='primary' size='small' :loading='okLoading' @click='handleOK'>添加</a-button>
    </div>
  </a-modal>
</template>

<style lang='less'>
.list-container {
  overflow-y: auto;
  height: 100%;
  position: relative;
  scroll-behavior: smooth;

  .list-item-new {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 5px;
    font-size: 12px;
    padding: 8px 8px;
    transition: box-shadow .3s ease, -webkit-box-shadow .3s ease;

    .arco-input {
      padding: 8px 12px;
      border-radius: 5px;
      background-color: rgba(0, 0, 0, 0);
      color: rgb(37, 38, 43);
      transition: background-color .3s ease;
    }
  }

  .list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    border-radius: 5px;
    font-size: 12px;
    cursor: pointer;
    -webkit-transition: all .3s ease;
    transition: all .3s ease;
    margin-bottom: 4px;
  }

  .item {
    display: flex;
    align-items: center;
    flex: 1 1;
    min-width: 0;

    .left-wrapper {
      display: flex;
      align-items: center;
      flex: 1 1;
      min-width: 0;

      .left-cover {
        height: 36px;
        width: 36px;
        flex: none;
        font-size: 18px;
        border: 1px solid rgba(132, 133, 141, 0.16);
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(37, 38, 43, 0.36);
        background-color: rgba(132, 133, 141, 0.08);

        .left-img {
          width: 34px;
          height: 34px;
          border-radius: 5px;
          box-sizing: border-box;
          border: 1px solid rgba(132, 133, 141, 0.16);
          overflow: hidden;
        }
      }

      .left-info {
        margin-left: 12px;
        max-width: calc(100% - 48px);

        .left-info-title {
          color: rgb(37, 38, 43);
          font-weight: 500;
        }

        .left-info-desc {
          color: rgba(37, 38, 43, 0.72);
          max-width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }
    }

    .right-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 48px;
      font-size: 18px;
      margin-left: 12px;

      .check-mark {
        width: 20px;
        height: 20px;
        font-size: 18px;
        cursor: pointer;
        color: rgb(99, 125, 255);
      }

      .close-mark {
        width: 20px;
        height: 20px;
        font-size: 18px;
        cursor: pointer;
        color: rgba(37, 38, 43, 0.72);
      }
    }

    .count {
      font-weight: 500;
      color: rgb(37, 38, 43, 0.72);
      flex: none;
    }

    .svg-icon {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .svg-icon[data-render-as=svg] svg {
      line-height: 0;
      width: 1em;
      height: 1em;
      fill: currentColor;
      overflow: hidden;
    }
  }
}

.active {
  background: rgba(99, 125, 255, 0.12);
  box-shadow: 0 3px 10px rgba(225, 225, 239, 0.5);
}
</style>
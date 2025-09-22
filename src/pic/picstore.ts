import { defineStore } from 'pinia'
import TreeStore from '../store/treestore'
import { useFootStore } from '../store'

export interface Item {
  drive_id: string
  file_id: string
  file_extension: string
  parent_file_id: string
  name: string
  category: string
  size: number
  thumbnail: string
  labels: string[]
  encrypt_mode: string
  starred: boolean
  image_media_metadata: []
}

export interface GridItem {
  file_id: string
  files: Item[]
}

export interface PicState {
  DriveID: string
  AlbumId: string
  AlbumName: string

  ListLoading: boolean
  ListLoadingIndex: number

  ListDataRaw: Item[]
  ListDataShow: Item[]
  ListDataGrid: GridItem[]

  ListSelected: Set<string>
  ListOrderKey: string
  ListFocusKey: string
  ListSelectKey: string
  ListSearchKey: string

  ListShowMode: string
  ListShowColumn: number
}

const usePicStore = defineStore('pic', {
  state: (): PicState => ({
    DriveID: '',
    AlbumId: '',
    AlbumName: '',

    ListLoading: false,
    ListLoadingIndex: 0,

    ListDataRaw: [],
    ListDataShow: [],
    ListDataGrid: [],

    ListSelected: new Set<string>(),
    ListOrderKey: 'name asc',
    ListFocusKey: '',
    ListSelectKey: '',
    ListSearchKey: '',

    ListShowMode: 'list',
    ListShowColumn: 1
  }),
  getters: {
    ListDataCount(state: PicState): number {
      return state.ListDataShow.length
    },

    IsListSelected(state: PicState): boolean {
      return state.ListSelected.size > 0
    },

    IsListSelectedMulti(state: PicState): boolean {
      return state.ListSelected.size > 1
    },
    ListSelectedCount(state: PicState): number {
      return state.ListSelected.size
    },
    ListDataSelectCountInfo(state: PicState): string {
      return '已选中 ' + state.ListSelected.size + ' / ' + state.ListDataShow.length + ' 个'
    },

    IsListSelectedAll(state: PicState): boolean {
      return state.ListSelected.size > 0 && state.ListSelected.size == state.ListDataShow.length
    },

    IsListSelectedFavAll(state: PicState): boolean {
      const list = state.ListDataShow
      const len = list.length
      let isAllFav = true

      for (let i = 0, maxi = len; i < maxi; i++) {
        if (state.ListSelected.has(list[i].file_id)) {
          if (!list[i].starred) {
            isAllFav = false
            break
          }
        }
      }

      return isAllFav
    },
    FileOrderDesc(state: PicState): string {
      switch (state.ListOrderKey) {
        case 'name desc':
          return '名称 · 降'
        case 'name asc':
          return '名称 · 升'
        case 'updated_at desc':
          return '时间 · 降'
        case 'updated_at asc':
          return '时间 · 升'
        case 'size desc':
          return '大小 · 降'
        case 'size asc':
          return '大小 · 升'
      }
      return '选择文件排序'
    }
  },
  actions: {
    mSaveDirFileLoading(drive_id: string, album_id: string, album_name: string) {
      const order = TreeStore.GetDirOrder(drive_id, album_id)
      if (this.AlbumId != album_id || this.DriveID != drive_id) {
        this.$patch({
          DriveID: drive_id,
          AlbumId: album_id,
          AlbumName: album_name,
          ListOrderKey: order,
          ListLoading: true,
          ListLoadingIndex: 0,
          ListSearchKey: '',
          ListDataRaw: [],
          ListDataShow: [],
          ListDataGrid: [],
          ListSelected: new Set(),
          ListFocusKey: '',
          ListSelectKey: ''
        })
      } else {
        this.$patch({
          DriveID: drive_id,
          AlbumId: album_id,
          AlbumName: album_name,
          ListOrderKey: order,
          ListLoading: true,
          ListLoadingIndex: 0,
          ListSearchKey: '',
          ListDataRaw: [],
          ListDataShow: [],
          ListDataGrid: []
        })
      }
      useFootStore().mSaveDirInfo('pan', '文件列表加载中...')
    }
  }
})

export default usePicStore

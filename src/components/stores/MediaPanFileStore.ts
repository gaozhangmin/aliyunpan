import { defineStore } from 'pinia'
import { IAliGetFileModel } from '../../aliapi/alimodels'
import { ArrayToMap } from '../../utils/utils'
import fuzzysort from 'fuzzysort'
import {
  GetFocusNext,
  GetSelectedList,
  GetSelectedListID,
  KeyboardSelectOne,
  MouseSelectOne,
  SelectAll
} from '../../utils/selecthelper'
import { OrderDir } from '../../utils/filenameorder'
import { onHideRightMenuScroll } from '../../utils/keyboardhelper'

type Item = IAliGetFileModel

export interface GridItem {
  file_id: string
  files: IAliGetFileModel[]
}

export interface MediaPanFileState {
  DriveID: string
  DirID: string
  AlbumID: string
  DirName: string

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

  scrollToFile: string
}

type State = MediaPanFileState
const KEY = 'file_id'

const useMediaPanFileStore = defineStore('mediaPanFile', {
  state: (): State => ({
    DriveID: '',
    DirID: '',
    AlbumID: '',
    DirName: '',

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
    ListShowColumn: 1,
    scrollToFile: ''
  }),

  getters: {
    ListDataCount(state: State): number {
      return state.ListDataShow.length
    },

    IsListSelected(state: State): boolean {
      return state.ListSelected.size > 0
    },

    IsListSelectedMulti(state: State): boolean {
      let isMulti = state.ListSelected.size > 1
      if (isMulti && state.DirID === 'mypic') {
        return false
      }
      return isMulti
    },
    ListSelectedCount(state: State): number {
      return state.ListSelected.size
    },
    ListDataSelectCountInfo(state: State): string {
      return '已选中 ' + state.ListSelected.size + ' / ' + state.ListDataShow.length + ' 个'
    },

    IsListSelectedAll(state: State): boolean {
      return state.ListSelected.size > 0 && state.ListSelected.size == state.ListDataShow.length
    },

    IsListSelectedFavAll(state: State): boolean {
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

    SelectDirType(state: State): string {
      const file_id = state.DirID
      if (file_id == 'recover') return 'recover'
      if (file_id == 'trash') return 'trash'
      if (file_id == 'favorite') return 'favorite'
      if (state.AlbumID) return 'mypic'
      if (file_id == 'pic' || file_id == 'pic_root' || file_id == 'mypic') return 'pic'
      if (file_id.startsWith('search')) return 'search'
      if (file_id.startsWith('color')) return 'color'
      if (file_id.startsWith('video')) return 'video'
      return 'pan'
    },
    FileOrderDesc(state: State): string {
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
        case 'file_count desc':
          return '数量 · 降'
        case 'file_count asc':
          return '数量 · 升'
      }
      return '选择文件排序'
    }
  },

  actions: {
    mSaveDirFileLoading(drive_id: string, dirID: string, dirName: string, albumID: string = '') {
      if (this.DirID != dirID || this.DriveID != drive_id || this.AlbumID != albumID) {
        this.$patch({
          DriveID: drive_id,
          DirID: dirID,
          AlbumID: albumID,
          DirName: dirName,
          ListOrderKey: 'name asc',
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
          DirID: dirID,
          AlbumID: albumID,
          DirName: dirName,
          ListOrderKey: 'name asc',
          ListLoading: true,
          ListLoadingIndex: 0,
          ListSearchKey: '',
          ListDataRaw: [],
          ListDataShow: [],
          ListDataGrid: []
        })
      }
    },

    mSaveDirFileLoadingFinish(drive_id: string, dirID: string, list: Item[], itemsTotal: number = 0) {
      if (this.DirID && (drive_id != this.DriveID || dirID != this.DirID)) return

      this.ListDataRaw = list
      this.$patch({ ListLoading: false, ListLoadingIndex: 0 })
      this.mRefreshListDataShow(true)
    },

    mSearchListData(value: string) {
      this.$patch({ ListSearchKey: value })
      this.mRefreshListDataShow(true)
    },

    mOrderListData(value: string) {
      if (!value || value == this.ListOrderKey) return
      this.$patch({ ListOrderKey: value, ListSelected: new Set<string>(), ListFocusKey: '', ListSelectKey: '' })
      this.mRefreshListDataShow(true)
    },

    mGridListData(value: string, column: number) {
      if (this.ListShowMode == value && this.ListShowColumn == column) return
      this.$patch({ ListShowMode: value == 'list' ? 'list' : 'grid', ListShowColumn: value == 'list' ? 1 : column })
      this.mRefreshListDataShow(true)
    },

    mRefreshListDataShow(refreshRaw: boolean) {
      if (!refreshRaw) {
        const listDataShow = this.ListDataShow.concat()
        Object.freeze(listDataShow)
        const listDataGrid = this.ListDataGrid.concat()
        Object.freeze(listDataGrid)
        this.$patch({ ListDataShow: listDataShow, ListDataGrid: listDataGrid })
        return
      }
      let showList: Item[] = []
      if (this.ListSearchKey) {
        const results = fuzzysort.go(this.ListSearchKey, this.ListDataRaw, {
          threshold: -200000,
          keys: ['name', 'namesearch'],
          scoreFn: (a) => Math.max(a[0] ? a[0].score : -200000, a[1] ? a[1].score : -200000)
        })
        for (let i = 0, maxi = results.length; i < maxi; i++) {
          if (results[i].score > -200000) showList.push(results[i].obj)
        }
        // 重新排序
        const orders = this.ListOrderKey
          .replace(' desc', ' DESC')
          .replace(' asc', ' ASC')
          .split(' ')
        OrderDir(orders[0], orders[1], showList)
      } else {
        showList = this.ListDataRaw.concat()
      }
      Object.freeze(showList)
      const gridList: GridItem[] = []
      const column = this.ListShowColumn
      for (let i = 0, maxi = showList.length; i < maxi; i += column) {
        const grid: GridItem = {
          file_id: showList[i].file_id,
          files: [showList[i]]
        }
        for (let j = 1; j < column && i + j < maxi; j++) {
          grid.files.push(showList[i + j])
        }
        gridList.push(grid)
      }
      Object.freeze(gridList)
      const oldSelected = this.ListSelected
      const newSelected = new Set<string>()
      let key = ''
      for (let i = 0, maxi = showList.length; i < maxi; i++) {
        key = showList[i][KEY]
        if (oldSelected.has(key)) newSelected.add(key)
      }
      this.$patch({ ListDataShow: showList, ListDataGrid: gridList, ListSelected: newSelected })
    },

    mSelectAll() {
      if (!this.ListDataShow.length) return
      let selectKey = this.ListDataShow[0].file_id
      let ListSelected = SelectAll(this.ListDataShow, KEY, this.ListSelected)
      if (this.ListDataShow.length === this.ListSelected.size) selectKey = ''
      this.$patch({ ListSelected: ListSelected, ListFocusKey: selectKey, ListSelectKey: selectKey })
      this.mRefreshListDataShow(false)
    },

    mMouseSelect(key: string, Ctrl: boolean, Shift: boolean) {
      if (this.ListDataShow.length == 0) return
      const data = MouseSelectOne(this.ListDataShow, KEY, this.ListSelected, this.ListFocusKey, this.ListSelectKey, key, Ctrl, Shift, '')
      this.$patch({ ListSelected: data.selectedNew, ListFocusKey: data.focusLast, ListSelectKey: data.selectedLast })
      this.mRefreshListDataShow(false)
    },

    mKeyboardSelect(key: string, Ctrl: boolean, Shift: boolean) {
      if (this.ListDataShow.length == 0) return
      const data = KeyboardSelectOne(this.ListDataShow, KEY, this.ListSelected, this.ListFocusKey, this.ListSelectKey, key, Ctrl, Shift, '')
      this.$patch({ ListSelected: data.selectedNew, ListFocusKey: data.focusLast, ListSelectKey: data.selectedLast })
      this.mRefreshListDataShow(false)
    },

    mRangSelect(lastkey: string, file_idList: string[]) {
      if (this.ListDataShow.length == 0) return
      const selectedNew = new Set<string>(this.ListSelected)
      for (let i = 0, maxi = file_idList.length; i < maxi; i++) {
        selectedNew.add(file_idList[i])
      }
      this.$patch({ ListSelected: selectedNew, ListFocusKey: lastkey, ListSelectKey: lastkey })
      this.mRefreshListDataShow(false)
    },

    mCancelSelect() {
      onHideRightMenuScroll()
      this.ListSelected.clear()
      this.ListFocusKey = ''
      this.mRefreshListDataShow(false)
    },

    GetSelected() {
      return GetSelectedList(this.ListDataShow, KEY, this.ListSelected)
    },

    GetSelectedID() {
      return GetSelectedListID(this.ListDataShow, KEY, this.ListSelected)
    },

    GetSelectedParentDirID() {
      return GetSelectedListID(this.ListDataShow, 'parent_file_id', this.ListSelected)
    },

    GetSelectedFirst(): Item | undefined {
      const list = GetSelectedList(this.ListDataShow, KEY, this.ListSelected)
      if (list.length > 0) return list[0]
      return undefined
    },

    mSetFocus(key: string) {
      this.ListFocusKey = key
      this.mRefreshListDataShow(false)
    },

    mGetFocus(): string {
      if (!this.ListFocusKey && this.ListDataShow.length > 0) return this.ListDataShow[0][KEY]
      return this.ListFocusKey
    },

    mGetFocusNext(position: string): string {
      return GetFocusNext(this.ListDataShow, KEY, this.ListFocusKey, position, '')
    },

    mSaveFileScrollTo(file_id: string) {
      if (file_id == 'refresh') file_id = this.ListSelectKey
      this.scrollToFile = file_id
    }
  }
})

export default useMediaPanFileStore
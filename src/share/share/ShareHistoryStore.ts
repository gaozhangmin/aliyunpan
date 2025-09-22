import fuzzysort from 'fuzzysort'
import { defineStore } from 'pinia'
import { IAliShareRecentItem } from '../../aliapi/alimodels'
import { GetFocusNext, GetSelectedList, KeyboardSelectOne, MouseSelectOne, SelectAll } from '../../utils/selecthelper'
import { HanToPin } from '../../utils/utils'

type Item = IAliShareRecentItem

export interface ShareHistoryState {
  ListLoading: boolean
  ListDataRaw: Item[]
  ListDataShow: Item[]

  ListSelected: Set<string>
  ListOrderKey: string
  ListFocusKey: string
  ListSelectKey: string
  ListSearchKey: string
}

type State = ShareHistoryState
const KEY = 'share_id'

const useShareHistoryStore = defineStore('sharehistory', {
  state: (): State => ({
    ListLoading: false,
    ListDataRaw: [],
    ListDataShow: [],
    ListSelected: new Set<string>(),
    ListOrderKey: 'mtime',
    ListFocusKey: '',
    ListSelectKey: '',
    ListSearchKey: ''
  }),

  getters: {
    ListDataCount(state: State): number {
      return state.ListDataShow.length
    },

    IsListSelected(state: State): boolean {
      return state.ListSelected.size > 0
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

    ListStats(state: State) {
      const stats = { preview: 0, browse: 0, save: 0, previewMax: 0, forbidden: 0 }
      const list = state.ListDataShow
      let item: Item
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        item = list[i]
        stats.preview += item.preview_count
        stats.previewMax = Math.max(stats.previewMax, item.preview_count)
        stats.browse += item.browse_count
        stats.save += item.save_count
        if (item.status == 'forbidden') stats.forbidden++
      }
      return stats
    }
  },

  actions: {

    aLoadListData(list: Item[]) {
      let item: Item
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        item = list[i]
        item.display_name = HanToPin(item.share_name)
      }
      this.ListDataRaw = this.mGetOrder(this.ListOrderKey, list)
      const oldSelected = this.ListSelected
      const newSelected = new Set<string>()
      let key = ''
      let findFocusKey = false
      let findSelectKey = false
      let ListFocusKey = this.ListFocusKey
      let ListSelectKey = this.ListSelectKey
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        key = list[i][KEY]
        if (oldSelected.has(key)) newSelected.add(key)
        if (key == ListFocusKey) findFocusKey = true
        if (key == ListSelectKey) findSelectKey = true
      }
      if (!findFocusKey) ListFocusKey = ''
      if (!findSelectKey) ListSelectKey = ''

      this.$patch({
        ListSelected: newSelected,
        ListFocusKey: ListFocusKey,
        ListSelectKey: ListSelectKey,
        ListSearchKey: ''
      })
      this.mRefreshListDataShow(true)
    },

    mSearchListData(value: string) {
      this.$patch({ ListSelected: new Set<string>(), ListFocusKey: '', ListSelectKey: '', ListSearchKey: value })
      this.mRefreshListDataShow(true)
    },

    mOrderListData(value: string) {
      this.$patch({ ListOrderKey: value, ListSelected: new Set<string>(), ListFocusKey: '', ListSelectKey: '' })
      this.ListDataRaw = this.mGetOrder(value, this.ListDataRaw)
      this.mRefreshListDataShow(true)
    },

    mGetOrder(order: string, list: Item[]) {
      if (order == 'ctime') list.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime())
      if (order == 'mtime') list.sort((a, b) => new Date(b.gmt_modified).getTime() - new Date(a.gmt_modified).getTime())
      if (order == 'preview') list.sort((a, b) => b.preview_count - a.preview_count)
      if (order == 'browse') list.sort((a, b) => b.browse_count - a.browse_count)
      if (order == 'save') list.sort((a, b) => b.save_count - a.save_count)
      return list
    },

    mRefreshListDataShow(refreshRaw: boolean) {
      if (!refreshRaw) {
        const ListDataShow = this.ListDataShow.concat()
        Object.freeze(ListDataShow)
        this.ListDataShow = ListDataShow
        return
      }
      if (this.ListSearchKey) {
        const searchList: Item[] = []
        const results = fuzzysort.go(this.ListSearchKey, this.ListDataRaw, {
          threshold: -200000,
          keys: ['share_name', 'display_name'],
          scoreFn: (a) => Math.max(a[0] ? a[0].score : -200000, a[1] ? a[1].score : -200000)
        })
        for (let i = 0, maxi = results.length; i < maxi; i++) {
          if (results[i].score > -200000) searchList.push(results[i].obj as IAliShareRecentItem)
        }
        Object.freeze(searchList)
        this.ListDataShow = searchList
      } else {
        const listDataShow = this.ListDataRaw.concat()
        Object.freeze(listDataShow)
        this.ListDataShow = listDataShow
      }

      const freezeList = this.ListDataShow
      const oldSelected = this.ListSelected
      const newSelected = new Set<string>()
      let key = ''
      for (let i = 0, maxi = freezeList.length; i < maxi; i++) {
        key = freezeList[i][KEY]
        if (oldSelected.has(key)) newSelected.add(key)
      }
      this.ListSelected = newSelected
    },


    mSelectAll() {
      this.$patch({
        ListSelected: SelectAll(this.ListDataShow, KEY, this.ListSelected),
        ListFocusKey: '',
        ListSelectKey: ''
      })
      this.mRefreshListDataShow(false)
    },
    mMouseSelect(key: string, Ctrl: boolean, Shift: boolean) {
      if (this.ListDataShow.length == 0) return
      const data = MouseSelectOne(this.ListDataShow, KEY, this.ListSelected, this.ListFocusKey, this.ListSelectKey, key, Ctrl, Shift, '')
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

    mKeyboardSelect(key: string, Ctrl: boolean, Shift: boolean) {
      if (this.ListDataShow.length == 0) return
      const data = KeyboardSelectOne(this.ListDataShow, KEY, this.ListSelected, this.ListFocusKey, this.ListSelectKey, key, Ctrl, Shift, '')
      this.$patch({ ListSelected: data.selectedNew, ListFocusKey: data.focusLast, ListSelectKey: data.selectedLast })
      this.mRefreshListDataShow(false)
    },

    GetSelected() {
      return GetSelectedList(this.ListDataShow, KEY, this.ListSelected)
    },

    GetSelectedFirst() {
      const list = GetSelectedList(this.ListDataShow, KEY, this.ListSelected)
      if (list.length > 0) return list[0]
      return undefined
    },
    mSetFocus(key: string) {
      this.ListFocusKey = key
      this.mRefreshListDataShow(false)
    },

    mGetFocus() {
      if (!this.ListFocusKey && this.ListDataShow.length > 0) return this.ListDataShow[0][KEY]
      return this.ListFocusKey
    },

    mGetFocusNext(position: string) {
      return GetFocusNext(this.ListDataShow, KEY, this.ListFocusKey, position, '')
    }
  }
})

export default useShareHistoryStore

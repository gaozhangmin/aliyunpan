import fuzzysort from 'fuzzysort'
import { defineStore } from 'pinia'
import { GetSelectedList, GetFocusNext, SelectAll, MouseSelectOne, KeyboardSelectOne } from '../../utils/selecthelper'


export interface IAliHistoryShareItem {
  popularity: number
  browse_count: number
  preview_count: number
  save_count: number
  share_id: string
  share_url: string
  share_name: string
  share_msg: string
  full_share_msg: string
  status: string
  is_punished: boolean
  is_public: boolean
  gmt_created: string
  gmt_modified: string
  creator: string
}

type Item = IAliHistoryShareItem

export interface HistoryShareState {
  
  ListLoading: boolean
  
  ListDataRaw: Item[]
  
  ListDataShow: Item[]

  
  ListSelected: Set<string>
  
  ListOrderKey: string
  
  ListFocusKey: string
  
  ListSelectKey: string
  
  ListSearchKey: string
}
type State = HistoryShareState

const KEY = 'share_id'

const useHistoryShareStore = defineStore('historyshare', {
  state: (): State => ({
    ListLoading: false,
    ListDataRaw: [],
    ListDataShow: [],
    ListSelected: new Set<string>(),
    ListOrderKey: 'time',
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
    }
  },

  actions: {
    
    aLoadListData(list: Item[]) {
      this.ListDataRaw = this.mGetOrder(this.ListOrderKey, list)
      
      const oldSelected = this.ListSelected
      const newSelected = new Set<string>()
      let key = ''
      let findFocusKey = false
      let findSelectKey = false
      let listFocusKey = this.ListFocusKey
      let listSelectKey = this.ListSelectKey
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        key = list[i][KEY]
        if (oldSelected.has(key)) newSelected.add(key) 
        if (key == listFocusKey) findFocusKey = true
        if (key == listSelectKey) findSelectKey = true
      }
      if (!findFocusKey) listFocusKey = ''
      if (!findSelectKey) listSelectKey = ''
      
      this.$patch({ ListSelected: newSelected, ListFocusKey: listFocusKey, ListSelectKey: listSelectKey, ListSearchKey: '' })
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
      if (order == 'mtime') list.sort((a, b) => new Date(b.gmt_modified).getTime() - new Date(a.gmt_modified).getTime())
      if (order == 'ctime') list.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime())
      if (order == 'preview') list.sort((a, b) => b.preview_count - a.preview_count)
      if (order == 'save') list.sort((a, b) => b.save_count - a.save_count)
      if (order == 'popularity') list.sort((a, b) => b.popularity - a.popularity)

      return list
    },
    
    mRefreshListDataShow(refreshRaw: boolean) {
      if (!refreshRaw) {
        const listDataShow = this.ListDataShow.concat() 
        Object.freeze(listDataShow)
        this.ListDataShow = listDataShow
        return
      }
      if (this.ListSearchKey) {
        
        const searchList: Item[] = []
        const results = fuzzysort.go(this.ListSearchKey, this.ListDataRaw, {
          threshold: -200000,
          keys: ['share_name', 'description'],
          scoreFn: (a) => Math.max(a[0] ? a[0].score : -200000, a[1] ? a[1].score : -200000)
        })
        for (let i = 0, maxi = results.length; i < maxi; i++) {
          if (results[i].score > -200000) searchList.push(results[i].obj)
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
      this.$patch({ ListSelected: SelectAll(this.ListDataShow, KEY, this.ListSelected), ListFocusKey: '', ListSelectKey: '' })
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
    },
    mDeleteFiles(share_idList: string[]) {
      const fileMap = new Set(share_idList)
      const listDataRaw = this.ListDataRaw
      const newDataList: Item[] = []
      for (let i = 0, maxi = listDataRaw.length; i < maxi; i++) {
        const item = listDataRaw[i]
        if (!fileMap.has(item.share_id)) {
          newDataList.push(item)
        }
      }
      this.ListDataRaw = newDataList
      this.mRefreshListDataShow(true) 
    }
  }
})

export default useHistoryShareStore

import fuzzysort from 'fuzzysort'
import { defineStore } from 'pinia'
import { IStateDownFile } from './M3u8DownloadDAL'
import { GetSelectedList, GetFocusNext, SelectAll, MouseSelectOne, KeyboardSelectOne } from '../../utils/selecthelper'
import { humanSize } from '../../utils/format'
import message from '../../utils/message'
import { useM3u8DownloadedStore } from '../../store'
import { AriaDeleteList, AriaStopList } from '../../utils/aria2c'
import DBDown from '../../utils/dbdown'

type Item = IStateDownFile
type State = DowningState
const KEY = 'DownID'

export interface DowningState {

  ListLoading: boolean

  ListDataRaw: Item[]

  ListDataShow: Item[]

  ListSelected: Set<string>

  ListOrderKey: string

  ListFocusKey: string

  ListSelectKey: string

  ListSearchKey: string
}

const useM3u8DownloadingStore = defineStore('m3u8downloading', {
  state: (): State => ({
    ListLoading: false,
    ListDataRaw: [],
    ListDataShow: [],
    ListSelected: new Set<string>(),
    ListOrderKey: 'DownID',
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
      let stats = { count: 0, runningCount: 0, totalSize: 0, totalSizeStr: '' }
      let list = state.ListDataShow
      let item: Item
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        item = list[i]
        stats.count++
        stats.totalSize += item.Info.size
        if (item.Down.IsDowning) stats.runningCount++
      }
      stats.totalSizeStr = humanSize(stats.totalSize)
      return stats
    }
  },

  actions: {

    aLoadListData(list: Item[]) {

      let item: Item
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        item = list[i]
      }
      this.ListDataRaw = this.mGetOrder(this.ListOrderKey, list)

      let oldSelected = this.ListSelected
      let newSelected = new Set<string>()
      let key = ''
      for (let i = 0, maxi = list.length; i < maxi; i++) {
        key = list[i][KEY]
        if (oldSelected.has(key)) newSelected.add(key)
      }

      this.$patch({ ListSelected: newSelected, ListFocusKey: '', ListSelectKey: '', ListSearchKey: '' })
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
      return list
    },

    /**
     * 刷新显示的列表数据
     * @param refreshRaw 是否从原始数据中刷新显示
     */
    mRefreshListDataShow(refreshRaw: boolean) {
      if (!refreshRaw) {
        let ListDataShow = this.ListDataShow.concat()
        Object.freeze(ListDataShow)
        this.ListDataShow = ListDataShow
        return
      }
      if (this.ListSearchKey) {

        let searchlist: Item[] = []
        let results = fuzzysort.go(this.ListSearchKey, this.ListDataRaw, {
          threshold: -200000,
          keys: ['Info.name'],
          scoreFn: (a) => Math.max(a[0] ? a[0].score : -200000, a[1] ? a[1].score : -200000)
        })
        for (let i = 0, maxi = results.length; i < maxi; i++) {
          if (results[i].score > -200000) searchlist.push(results[i].obj as Item)
        }
        Object.freeze(searchlist)
        this.ListDataShow = searchlist
      } else {

        let ListDataShow = this.ListDataRaw.concat()
        Object.freeze(ListDataShow)
        this.ListDataShow = ListDataShow
      }

      let freezelist = this.ListDataShow
      let oldSelected = this.ListSelected
      let newSelected = new Set<string>()
      let key = ''
      for (let i = 0, maxi = freezelist.length; i < maxi; i++) {
        key = freezelist[i][KEY]
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
      let list = GetSelectedList(this.ListDataShow, KEY, this.ListSelected)
      if (list.length > 0) return list[0]
      return undefined
    },

    mSetFocus(key: string) {
      this.ListFocusKey = key
      this.mRefreshListDataShow(false)
    },

    mGetFocus() {
      if (this.ListFocusKey == '' && this.ListDataShow.length > 0) return this.ListDataShow[0][KEY]
      return this.ListFocusKey
    },

    mGetFocusNext(position: string) {
      return GetFocusNext(this.ListDataShow, KEY, this.ListFocusKey, position, '')
    },

    mDeleteFiles(shareidlist: string[]) {
      let filemap = new Set(shareidlist)
      let ListDataRaw = this.ListDataRaw
      let NewDataList: Item[] = []
      for (let i = 0, maxi = ListDataRaw.length; i < maxi; i++) {
        let item = ListDataRaw[i]
        if (!filemap.has(item[KEY])) {
          NewDataList.push(item)
        }
      }
      if (this.ListDataRaw.length != NewDataList.length) {
        this.ListDataRaw = NewDataList
        this.mRefreshListDataShow(true)
      }
    },

    mAddDownload({ downlist, tip}: { downlist: Item[]; tip: boolean}) {
      const DowningList = this.ListDataRaw
      const savelist = []
      const haslist = new Map<string, boolean>()
      for (let i = 0; i < DowningList.length; i++) {
        haslist.set(DowningList[i].DownID, true)
      }
      for (let d = 0; d < downlist.length; d++) {
        const downitem = downlist[d]
        if (!haslist.has(downitem.DownID)) {
          Object.freeze(downitem.Info)
          savelist.push(downitem)
        }
      }
      DBDown.saveDownings(JSON.parse(JSON.stringify(savelist)))
      DowningList.push(...savelist);
      this.mRefreshListDataShow(true)
      if (tip) {
        if (savelist.length == 0) {
          message.info('下载任务已存在，请勿重复创建任务')
        } else {
          message.success('成功创建 ' + savelist.length.toString() + '个下载任务')
        }
      }
    },

    /**
     * 开始下载，只改变状态，待定时任务处理
     */
    mStartDowning() {
      const DowningList = this.ListDataRaw
      for (const DownID of this.ListSelected) {
        for (let j = 0; j < DowningList.length; j++) {
          if (DowningList[j].DownID == DownID) {
            const down = DowningList[j].Down;
            if (down.IsDowning || down.IsCompleted) continue
            down.IsStop = false
            down.DownState = '队列中'
            down.DownSpeed = 0
            down.DownSpeedStr = ''
            down.IsFailed = false
            down.FailedCode = 0
            down.FailedMessage = ''
            down.AutoTry = 0
            break
          }
        }
      }
    },

    /**
     * 开始全部
     */
    mStartAllDowning() {
      const DowningList = this.ListDataRaw
      for (let j = 0; j < DowningList.length; j++) {
        const down = DowningList[j].Down
        if (down.IsDowning || down.IsCompleted) continue
        down.IsStop = false
        down.DownState = '队列中'
        down.DownSpeed = 0
        down.DownSpeedStr = ''
        down.IsFailed = false
        down.FailedCode = 0;
        down.FailedMessage = ''
        down.AutoTry = 0
      }
    },

    /**
     * 暂停下载，只改变状态，待定时任务处理
     */
    mStopDowning() {
      const gidList: string[] = []
      const downIDList: string[] = []
      const downList: Item[] = []
      const DowningList = this.ListDataRaw
      for (const DownID of this.ListSelected) {
        for (let j = 0; j < DowningList.length; j++) {
          if (DowningList[j].DownID == DownID) {
            const down = DowningList[j].Down
            if (down.IsCompleted) continue
            gidList.push(DowningList[j].Info.GID)
            downIDList.push(DowningList[j].DownID)
            downList.push(DowningList[j])
            down.IsDowning = false
            down.IsCompleted = false
            down.IsStop = true
            down.DownState = '已暂停'
            down.DownSpeed = 0
            down.DownSpeedStr = ''
            down.IsFailed = false
            down.FailedCode = 0
            down.FailedMessage = ''
            down.AutoTry = 0
            break
          }
        }
      }
      AriaStopList(gidList).then(r => {})
      // DownDAL.stopDowning(false, downIDList) // TODO
      this.mRefreshListDataShow(true)
      DBDown.saveDownings(JSON.parse(JSON.stringify(downList)))
    },

    /**
     * 暂停全部
     */
    mStopAllDowning() {
      const gidList: string[] = []
      const downIDList: string[] = []
      const DowningList = this.ListDataRaw
      for (let j = 0; j < DowningList.length; j++) {
        const down = DowningList[j].Down
        if (down.IsCompleted) continue
        downIDList.push(DowningList[j].DownID)
        gidList.push(DowningList[j].Info.GID)
        down.IsDowning = false
        down.IsStop = true
        down.DownState = '已暂停'
        down.DownSpeed = 0
        down.DownSpeedStr = ''
        down.IsFailed = false
        down.FailedCode = 0
        down.FailedMessage = ''
        down.AutoTry = 0
      }
      AriaStopList(gidList).then(r => {})
      // DownDAL.stopDowning(false, downIDList) // TODO
      this.mRefreshListDataShow(true)
      DBDown.saveDownings(JSON.parse(JSON.stringify(DowningList)))
    },

    /**
     * 删除下载，修改为“待删除”状态，并从列表中删除 <br/>
     * 注：下载服务中的执行列表，请根据状态做进一步处理
     * @param downIDList
     */
    mDeleteDowning(downIDList: string[]) {
      const gidList: string[] = []
      const DowningList = this.ListDataRaw
      const newListSelected = new Set(this.ListSelected);
      const newList: Item[] = [];
      for (let j = 0; j < DowningList.length; j++) {
        const DownID = DowningList[j].DownID;
        if (downIDList.includes(DownID)) {
          gidList.push(DowningList[j].Info.GID)
          DowningList[j].Down.DownState = '待删除'
          if (newListSelected.has(DownID)) newListSelected.delete(DownID);
        } else {
          newList.push(DowningList[j]);
        }
      }
      this.ListDataRaw = newList;
      this.ListSelected = newListSelected;
      DBDown.deleteDownings(JSON.parse(JSON.stringify(downIDList)))
      this.mRefreshListDataShow(true)
      AriaStopList(gidList).then(r => {})
      AriaDeleteList(gidList).then(r => {})
      // DownDAL.deleteDowning(false, downIDList) // TODO
    },

    /**
     * 删除全部，修改为“待删除”状态，并从列表中删除 <br/>
     * 注：下载服务中的执行列表，请根据状态做进一步处理
     */
    mDeleteAllDowning() {
      const gidList: string[] = []
      const DowningList = this.ListDataRaw
      this.ListSelected = new Set<string>()
      const downIDList: string[] = []
      for (let j = 0; j < DowningList.length; j++) {
        const DownID = DowningList[j].DownID
        DowningList[j].Down.DownState = '待删除'
        downIDList.push(DownID)
        gidList.push(DowningList[j].Info.GID)
      }
      DowningList.splice(0, DowningList.length)
      DBDown.deleteDowningAll()
      this.mRefreshListDataShow(true)
      AriaStopList(gidList).then(r => {})
      AriaDeleteList(gidList).then(r => {})
      // DownDAL.deleteDowning(false, downIDList) // TODO
    },

    /**
     * 排序
     * @param downIDList 要放在前面的上传ID
     */
    mOrderDowning(downIDList: string[]) {
      const DowningList = this.ListDataRaw
      const newlist: Item[] = [];
      const lastlist: Item[] = [];

      for (let j = 0; j < DowningList.length; j++) {
        const DownID = DowningList[j].DownID;
        let find = false;
        for (let i = 0; i < downIDList.length; i++) {
          if (downIDList[i] == DownID) {
            newlist.push(DowningList[j]);
            find = true;
            break;
          }
        }
        if (!find) {
          lastlist.push(DowningList[j]);
        }
      }
      DowningList.splice(0, DowningList.length, ...newlist, ...lastlist);
      this.mRefreshListDataShow(true)
    },

    mSaveToDowned(DownID: string) {
      const DowningList = this.ListDataRaw
      for (let j = 0; j < DowningList.length; j++) {
        if (DowningList[j].DownID == DownID && DowningList[j].Down.DownState === '已完成') {
          const item = DowningList[j]
          DowningList.splice(j, 1)
          DBDown.deleteDowning(item.DownID)
          item.Down.DownTime = Date.now()
          item.DownID = item.Down.DownTime.toString() + '_' + item.DownID
          useM3u8DownloadedStore().ListDataRaw.splice(0, 0, item)
          useM3u8DownloadedStore().mRefreshListDataShow(true)
          DBDown.saveDowned(item.DownID, JSON.parse(JSON.stringify(item)))
          break;
        }
      }
      if (this.ListSelected.has(DownID)) this.ListSelected.delete(DownID)
    },

    mUpdateDownState(data: any) {
      const DowningList = this.ListDataRaw
      const DownID = data.DownID;
      for (let j = 0; j < DowningList.length; j++) {
        if (DowningList[j].DownID == DownID) {
          DowningList[j].Down = { ...DowningList[j].Down, ...data };
          break;
        }
      }
    }

  }
})

export default useM3u8DownloadingStore

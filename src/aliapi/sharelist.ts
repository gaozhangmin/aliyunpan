import DebugLog from '../utils/debuglog'
import { humanDateTime, humanExpiration, Sleep } from '../utils/format'
import message from '../utils/message'
import AliHttp, { IUrlRespData } from './alihttp'
import { IAliShareBottleFishItem, IAliShareItem } from './alimodels'
import AliDirFileList from './dirfilelist'
import { IAliHistoryShareItem } from '../share/share/HistoryShareStore'

export interface IAliShareResp {
  items: IAliShareItem[]
  itemsKey: Set<string>
  next_marker: string

  m_time: number 
  m_user_id: string 
}

export interface IAliShareBottleFishResp {
  items: IAliShareBottleFishItem[]
  itemsKey: Set<string>
  next_marker: string

  m_time: number
  m_user_id: string
}

export interface IAliHistoryShareResp {
  items: IAliHistoryShareItem[]
  itemsKey: Set<string>
  next_marker: string
  m_time: number
  m_user_id: string
}

export default class AliShareList {
  
  static async ApiShareListAll(user_id: string): Promise<IAliShareResp> {
    const dir: IAliShareResp = {
      items: [],
      itemsKey: new Set(),
      next_marker: '',
      m_time: 0,
      m_user_id: user_id
    }

    do {
      const isGet = await AliShareList.ApiShareListOnePage(dir)
      if (!isGet) {
        break 
      }
    } while (dir.next_marker)
    return dir
  }

  static async ApiHistoryShareListAll(user_id: string): Promise<IAliHistoryShareResp> {
    const dir: IAliHistoryShareResp = {
      items: [],
      itemsKey: new Set(),
      next_marker: '',
      m_time: 0,
      m_user_id: user_id
    }

    do {
      const isGet = await AliShareList.ApiHistoryShareListOnePage(dir)
      if (!isGet) {
        break
      }
    } while (dir.next_marker)
    return dir
  }

  static async ApiShareListOnePage(dir: IAliShareResp): Promise<boolean> {
    const url = 'adrive/v3/share_link/list'
    const postData = {
      
      marker: dir.next_marker,
      creator: dir.m_user_id,
      include_canceled: false,
      order_by: 'created_at',
      order_direction: 'DESC'
    }
    const resp = await AliHttp.Post(url, postData, dir.m_user_id, '')
    return AliShareList._ShareListOnePage(dir, resp)
  }


  static async ApiHistoryShareListOnePage(dir: IAliHistoryShareResp): Promise<boolean> {
    const url = 'https://api.alipan.com/adrive/v2/share_link/recent_copy_list'
    const postData = {
      limit: 50,
      marker: dir.next_marker,
      order_by: "gmt_modified DESC"
    }
    const resp = await AliHttp.Post(url, postData, dir.m_user_id, '')
    return AliShareList._HistoryShareListOnePage(dir, resp)
  }

  static _HistoryShareListOnePage(dir: IAliHistoryShareResp, resp: IUrlRespData): boolean {
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        dir.next_marker = resp.body.next_marker || ''
        for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
          const item = resp.body.items[i] as IAliHistoryShareItem
          if (dir.itemsKey.has(item.share_id)) continue

          if (!item.share_msg) item.share_msg = ''
          if (!item.share_name) item.share_name = 'share_name'
          if (!item.popularity) item.popularity = 0
          if (!item.preview_count) item.preview_count = 0
          if (!item.save_count) item.save_count = 0
          if (item.status == 'forbidden') item.share_msg = '分享违规'
          dir.items.push(item)
          dir.itemsKey.add(item.share_id)
        }

        return true
      } else if (resp.code == 404) {

        dir.items.length = 0
        dir.next_marker = ''
        return true
      } else if (resp.body && resp.body.code) {
        dir.items.length = 0
        dir.next_marker = resp.body.code
        message.warning('列出分享列表出错' + resp.body.code, 2)
        return false
      } else {
        DebugLog.mSaveWarning('_ShareListOnePage err=' + (resp.code || ''))
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('_ShareListOnePage', err)
    }
    dir.next_marker = 'error ' + resp.code
    return false
  }

  static async ApiShareBottleFishListAll(user_id: string): Promise<IAliShareBottleFishResp> {
    const dir: IAliShareBottleFishResp = {
      items: [],
      itemsKey: new Set(),
      next_marker: '',
      m_time: 0,
      m_user_id: user_id
    }
    do {
      const isGet = await AliShareList.ApiShareBottleFishListOnePage(dir)
      if (!isGet) {
        break
      }
    } while (dir.next_marker)
    return dir
  }

  static async ApiShareBottleFishListOnePage(dir: IAliShareBottleFishResp): Promise<boolean> {
    const url = 'adrive/v1/bottle/list'
    const postData = { limit: 100 }
    const resp = await AliHttp.Post(url, postData, dir.m_user_id, '')
    return AliShareList._ShareBottleFishListOnePage(dir, resp)
  }

  static _ShareListOnePage(dir: IAliShareResp, resp: IUrlRespData): boolean {
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        dir.next_marker = resp.body.next_marker
        const downUrl = 'https://api.alipan.com/v2/file/download?t=' + Date.now().toString()
        const timeNow = new Date().getTime()
        for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
          const item = resp.body.items[i] as IAliShareItem
          if (dir.itemsKey.has(item.share_id)) continue
          let icon = 'iconwenjian'
          let first_file
          if (item.first_file) {
            first_file = AliDirFileList.getFileInfo(item.first_file, downUrl)
            icon = first_file.icon || 'iconwenjian'
          }
          const add = Object.assign({}, item, { first_file, icon }) as IAliShareItem
          if (!add.share_msg) add.share_msg = ''
          if (!add.share_name) add.share_name = 'share_name'
          if (!add.share_pwd) add.share_pwd = ''
          if (!add.preview_count) add.preview_count = 0
          if (!add.download_count) add.download_count = 0
          if (!add.save_count) add.save_count = 0
          if (!add.expired) add.expired = false
          if (item.created_at) {
            add.created_at = humanDateTime(new Date(item.created_at).getTime())
          } else {
            add.created_at = ''
          }

          add.share_msg = humanExpiration(item.expiration, timeNow)
          if (item.status == 'forbidden') add.share_msg = '分享违规'
          dir.items.push(add)
          dir.itemsKey.add(add.share_id)
        }

        return true
      } else if (resp.code == 404) {
        
        dir.items.length = 0
        dir.next_marker = ''
        return true
      } else if (resp.body && resp.body.code) {
        dir.items.length = 0
        dir.next_marker = resp.body.code
        message.warning('列出分享列表出错' + resp.body.code, 2)
        return false
      } else {
        DebugLog.mSaveWarning('_ShareListOnePage err=' + (resp.code || ''))
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('_ShareListOnePage', err)
    }
    dir.next_marker = 'error ' + resp.code
    return false
  }

  static _ShareBottleFishListOnePage(dir: IAliShareBottleFishResp, resp: IUrlRespData): boolean {
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        dir.next_marker = ''
        for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
          const item = resp.body.items[i] as IAliShareBottleFishItem
          const add = Object.assign({}, item) as IAliShareBottleFishItem
          if (dir.itemsKey.has(item.bottleId)) continue
          if (!add.share_name) add.share_name = 'share_name'
          if (add.gmtCreate) {
            add.gmt_created = humanDateTime(new Date(add.gmtCreate).getTime())
          } else {
            add.gmt_created = ''
          }
          if (add.saved) add.saved_msg = '已保存'
          else add.saved_msg = '未保存'
          dir.items.push(add)
          dir.itemsKey.add(add.bottleId)
        }
        return true
      } else if (resp.code == 404) {
        dir.items.length = 0
        dir.next_marker = ''
        return true
      } else if (resp.body && resp.body.code) {
        dir.items.length = 0
        dir.next_marker = resp.body.code
        message.warning('列出好运瓶领取记录列表出错' + resp.body.code, 2)
        return false
      } else if (!AliHttp.HttpCodeBreak(resp.code)) {
        DebugLog.mSaveWarning('_ShareBottleFishListOnePage err=' + (resp.code || ''), resp.body)
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('_ShareBottleFishListOnePage', err)
    }
    dir.next_marker = 'error ' + resp.code
    return false
  }

  static async ApiShareListUntilShareID(user_id: string, share_id: string): Promise<boolean> {
    const url = 'adrive/v3/share_link/list'
    const postData = {
      
      marker: '',
      creator: user_id,
      include_canceled: false,
      order_by: 'created_at',
      order_direction: 'DESC'
    }
    for (let j = 0; j < 10; j++) {
      const resp = await AliHttp.Post(url, postData, user_id, '')
      try {
        if (AliHttp.IsSuccess(resp.code)) {
          for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
            const item = resp.body.items[i] as IAliShareItem
            if (item.share_id == share_id) return true 
          }
        }
      } catch {}
      await Sleep(500)
    }
    return false
  }
}

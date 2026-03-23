import DebugLog from '../utils/debuglog'
import { humanDateTime, humanExpiration } from '../utils/format'
import message from '../utils/message'
import AliHttp, { IUrlRespData } from './alihttp'
import { IAliShareBottleFishItem, IAliShareItem, IAliShareRecentItem } from './alimodels'
import AliDirFileList from './dirfilelist'
import { useSettingStore } from '../store'
import { isCloud123User } from './utils'
import { apiCloud123ShareList } from '../cloud123/share'

export interface IAliShareResp {
  items: IAliShareItem[]
  itemsKey: Set<string>
  next_marker: string

  m_time: number
  m_user_id: string
}

export interface IAliShareRecentResp {
  items: IAliShareRecentItem[]
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


export default class AliShareList {

  static async ApiShareListAll(user_id: string): Promise<IAliShareResp> {
    if (isCloud123User(user_id)) {
      return await AliShareList.ApiCloud123ShareListAll(user_id)
    }
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

  static async ApiShareListOnePage(dir: IAliShareResp): Promise<boolean> {
    if (isCloud123User(dir.m_user_id)) {
      return await AliShareList.ApiCloud123ShareListOnePage(dir)
    }
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

  static _ShareListOnePage(dir: IAliShareResp, resp: IUrlRespData): boolean {
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        dir.next_marker = resp.body.next_marker
        const downUrl = 'https://api.aliyundrive.com/v2/file/download?t=' + Date.now().toString()
        const timeNow = new Date().getTime()
        for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
          const item = resp.body.items[i] as IAliShareItem
          if (dir.itemsKey.has(item.share_id)) continue
          let icon = 'iconwenjian'
          let first_file
          if (item.first_file) {
            first_file = AliDirFileList.getFileInfo(dir.m_user_id, item.first_file, downUrl)
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
      } else if (!AliHttp.HttpCodeBreak(resp.code)) {
        DebugLog.mSaveWarning('_ShareListOnePage err=' + (resp.code || ''), resp.body)
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('_ShareListOnePage', err)
    }
    dir.next_marker = 'error ' + resp.code
    return false
  }


  static async ApiShareRecentListAll(user_id: string): Promise<IAliShareRecentResp> {
    const dir: IAliShareRecentResp = {
      items: [],
      itemsKey: new Set(),
      next_marker: '',
      m_time: 0,
      m_user_id: user_id
    }
    let max: number = useSettingStore().debugFavorListMax
    do {
      const isGet = await AliShareList.ApiShareRecentListOnePage(dir)
      if (!isGet) {
        break
      }
      if (dir.items.length >= max && max > 0) {
        dir.next_marker = ''
        break
      }
    } while (dir.next_marker)
    return dir
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

  static async ApiShareRecentListOnePage(dir: IAliShareRecentResp): Promise<boolean> {
    const url = 'adrive/v2/share_link/recent_copy_list'
    const postData = { limit: 50, marker: dir.next_marker, order_by: 'gmt_modified DESC' /* 更新时间 降序 */ }
    const resp = await AliHttp.Post(url, postData, dir.m_user_id, '')
    return AliShareList._ShareRecentListOnePage(dir, resp)
  }

  static async ApiShareBottleFishListOnePage(dir: IAliShareBottleFishResp): Promise<boolean> {
    const url = 'adrive/v1/bottle/list'
    const postData = { limit: 100 }
    const resp = await AliHttp.Post(url, postData, dir.m_user_id, '')
    return AliShareList._ShareBottleFishListOnePage(dir, resp)
  }

  static _ShareRecentListOnePage(dir: IAliShareRecentResp, resp: IUrlRespData): boolean {
    try {
      if (AliHttp.IsSuccess(resp.code)) {
        dir.next_marker = resp.body.next_marker
        for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
          const item = resp.body.items[i] as IAliShareRecentItem
          const add = Object.assign({}, item) as IAliShareRecentItem
          if (dir.itemsKey.has(item.share_id)) continue
          if (!add.share_msg) add.share_msg = ''
          if (!add.share_name) add.share_name = 'share_name'
          if (!add.preview_count) add.preview_count = 0
          if (!add.file_count) add.file_count = 0
          if (!add.save_count) add.save_count = 0
          if (!add.browse_count) add.browse_count = 0
          if (add.gmt_created) {
            add.gmt_created = humanDateTime(new Date(add.gmt_created).getTime())
          } else {
            add.gmt_created = ''
          }
          if (add.gmt_modified) {
            add.gmt_modified = humanDateTime(new Date(add.gmt_modified).getTime())
          } else {
            add.gmt_modified = ''
          }
          if (add.status == 'forbidden') add.share_msg = '分享违规'
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
        message.warning('列出历史分享列表出错' + resp.body.code, 2)
        return false
      } else if (!AliHttp.HttpCodeBreak(resp.code)) {
        DebugLog.mSaveWarning('_ShareRecentListOnePage err=' + (resp.code || ''), resp.body)
      }
    } catch (err: any) {
      DebugLog.mSaveDanger('_ShareRecentListOnePage', err)
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
    if (isCloud123User(user_id)) {
      let lastShareId = 0
      do {
        const resp = await apiCloud123ShareList(user_id, lastShareId, 100)
        if (resp.error) return false
        for (let i = 0, maxi = resp.list.length; i < maxi; i++) {
          if (String(resp.list[i].shareId) === share_id) return true
        }
        if (resp.lastShareId === -1) break
        lastShareId = resp.lastShareId
      } while (true)
      return false
    }
    const url = 'adrive/v3/share_link/list'
    const postData = {
      marker: '',
      creator: user_id,
      include_canceled: false,
      order_by: 'created_at',
      order_direction: 'DESC'
    }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    for (let i = 0, maxi = resp.body.items.length; i < maxi; i++) {
      const item = resp.body.items[i] as IAliShareItem
      if (item.share_id == share_id) return true
    }
    return false
  }

  private static async ApiCloud123ShareListAll(user_id: string): Promise<IAliShareResp> {
    const dir: IAliShareResp = {
      items: [],
      itemsKey: new Set(),
      next_marker: '',
      m_time: 0,
      m_user_id: user_id
    }
    do {
      const isGet = await AliShareList.ApiCloud123ShareListOnePage(dir)
      if (!isGet) break
    } while (dir.next_marker)
    return dir
  }

  private static async ApiCloud123ShareListOnePage(dir: IAliShareResp): Promise<boolean> {
    const lastShareId = dir.next_marker ? Number(dir.next_marker) : 0
    const resp = await apiCloud123ShareList(dir.m_user_id, Number.isNaN(lastShareId) ? 0 : lastShareId, 100)
    if (resp.error) {
      message.warning('列出分享列表出错' + resp.error, 2)
      return false
    }
    const timeNow = new Date().getTime()
    for (let i = 0, maxi = resp.list.length; i < maxi; i++) {
      const item = resp.list[i]
      const share_id = String(item.shareId)
      if (dir.itemsKey.has(share_id)) continue
      const share_url = item.shareKey ? `https://www.123pan.com/s/${item.shareKey}` : ''
      const add: IAliShareItem = {
        created_at: '',
        creator: '',
        description: '',
        display_name: '',
        display_label: '',
        download_count: item.downloadCount || 0,
        drive_id: 'cloud123',
        expiration: item.expiration || '',
        expired: item.expired === 1,
        file_id: '',
        file_id_list: [],
        icon: 'iconwenjian',
        preview_count: item.previewCount || 0,
        save_count: item.saveCount || 0,
        share_id: share_id,
        share_msg: '',
        full_share_msg: '',
        share_name: item.shareName || '分享链接',
        share_policy: '',
        share_pwd: item.sharePwd || '',
        share_url: share_url,
        status: item.expired === 1 ? 'expired' : '',
        updated_at: '',
        is_share_saved: false,
        share_saved: ''
      }
      add.share_msg = humanExpiration(add.expiration, timeNow)
      if (add.expired) add.share_msg = '过期失效'
      if (!add.share_name) add.share_name = 'share_name'
      dir.items.push(add)
      dir.itemsKey.add(add.share_id)
    }
    dir.next_marker = resp.lastShareId === -1 ? '' : String(resp.lastShareId)
    return true
  }
}

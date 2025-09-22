import { IAliAlbumInfo, IAliGetDirModel } from './alimodels'
import AliHttp, { IUrlRespData } from './alihttp'
import DebugLog from '../utils/debuglog'
import { HanToPin } from '../utils/utils'

export default class AliAlbum {

  /**
   * 创建相册
   */
  static async ApiAlbumCreate(user_id: string, album_name: string, album_description: string): Promise<string> {
    if (!user_id || !album_name) return '创建相册出错'
    const url = 'adrive/v1/album/create'
    const postData = { name: album_name, description: album_description }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const result = resp.body as IAliAlbumInfo
      if (result) return 'success'
      else return '创建相册出错'
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumCreate err=' + (resp.code || ''))
    }
    return '创建相册出错'
  }

  /**
   * 获取相册路径
   */
  static async ApiAlbumGetPath(user_id: string, drive_id: string, album_id: string): Promise<IAliGetDirModel[]> {
    if (!user_id || !drive_id || !album_id) return []
    const url = 'adrive/v1/album/get'
    const postData = { album_id: album_id }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const list: IAliGetDirModel[] = []
      list.push({
        __v_skip: true,
        drive_id: drive_id,
        file_id: 'mypic',
        parent_file_id: '',
        name: '我的相册',
        namesearch: '',
        size: 0,
        time: 0,
        description: ''
      } as IAliGetDirModel)
      if (resp.body.name.length > 0) {
        list.push({
          __v_skip: true,
          drive_id: drive_id,
          file_id: resp.body.album_id,
          album_id: resp.body.album_id,
          parent_file_id: 'mypic',
          name: resp.body.name,
          namesearch: HanToPin(resp.body.name),
          size: 0,
          time: new Date(resp.body.updated_at).getTime(),
          description: resp.body.description || ''
        } as IAliGetDirModel)
      }
      return list
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumGetPath err=' + album_id + ' ' + (resp.code || ''), resp.body)
    }
    return []
  }

  /**
   * 列出相册
   */
  static async ApiAlbumList(user_id: string, limit?: string, order_by?: string, order_direction?: string) {
    if (!user_id) return []
    const url = 'adrive/v1/album/list'
    const postData = {
      limit: limit || 20,
      order_by: order_by || 'updated_at',
      order_direction: order_direction || 'DESC'
    }
    const data: IAliAlbumInfo[] = []
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const items = resp.body.items
      if (items && items.length > 0) {
        for (let item of items) {
          let coverUrl = ''
          if (item.cover && item.cover.list.length > 0) {
            coverUrl = item.cover.list[0].download_url || ''
          }
          data.push({ ...item, coverUrl })
        }
      }
      return data
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumList err=' + (resp.code || ''))
    }
    return []
  }

  /**
   * 更新相册
   */
  static async ApiAlbumUpdate(user_id: string, album_id: string, name: string, description: string): Promise<IUrlRespData | undefined> {
    if (!user_id || !album_id) return undefined
    const url = 'adrive/v1/album/update'
    const postData = { name, album_id, description }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return resp.body as IUrlRespData
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumUpdate err=' + (resp.code || ''))
    }
    return undefined
  }

  /**
   * 删除相册（不会删除文件）
   */
  static async ApiAlbumDelete(user_id: string, album_id: string): Promise<IUrlRespData | undefined> {
    if (!user_id || !album_id) return undefined
    const url = 'adrive/v1/album/delete'
    const resp = await AliHttp.Post(url, { album_id }, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return resp.body as IUrlRespData
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumDelete err=' + (resp.code || ''))
    }
    return undefined
  }

  /**
   * 添加文件到相册
   */
  static async ApiAlbumAddFiles(user_id: string, album_id: string, drive_file_list: {
    drive_id: string,
    file_id: string
  }[]): Promise<IUrlRespData | undefined> {
    if (!user_id || !album_id || !drive_file_list) return undefined
    const url = 'adrive/v1/album/add_files'
    const resp = await AliHttp.Post(url, { album_id, drive_file_list }, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return resp.body as IUrlRespData
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumAddFiles err=' + (resp.code || ''))
    }
    return undefined
  }

  /**
   * 文件移出相册（不会删除文件）
   */
  static async ApiAlbumDeleteFiles(user_id: string, album_id: string, drive_file_list: {
    drive_id: string,
    file_id: string
  }[]): Promise<IUrlRespData | undefined> {
    if (!user_id || !album_id || !drive_file_list) return undefined
    const url = 'adrive/v1/album/delete_files'
    const resp = await AliHttp.Post(url, { album_id, drive_file_list }, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return resp.body as IUrlRespData
    } else if (!AliHttp.HttpCodeBreak(resp.code)) {
      DebugLog.mSaveWarning('ApiAlbumDeleteFiles err=' + (resp.code || ''))
    }
    return undefined
  }
}
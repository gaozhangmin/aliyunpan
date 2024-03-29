import {
  AliAlbumFileInfo,
  IAliAlbumInfo,
  IAliAlbumsList,
  IAliAlubmCreateInfo,
  IAliAlubmListInfo,
  IAliGetDirModel
} from './alimodels'
import AliHttp, { IUrlRespData } from './alihttp'
import DebugLog from '../utils/debuglog'
import { HanToPin } from '../utils/utils'
import { GetDriveID } from './utils'
import { useSettingStore, useUserStore } from '../store'

export default class AliAlbum {

  static async ApiAlbumsList(): Promise<IAliAlbumsList[]> {
    const url = 'adrive/v1/album/list'
    const albums: IAliAlbumsList[] = []
    if (!GetDriveID(useUserStore().user_id, 'pic')) {
      return albums
    }
    const userId = useUserStore().user_id
    let max: number = useSettingStore().debugFileListMax
    let next_marker = ''
    do {
      const resp = await AliHttp.Post(url, {next_marker: next_marker}, userId, '')
      if (AliHttp.IsSuccess(resp.code)) {
        const items = resp.body.items as IAliAlubmListInfo[]
        if (items) {
          items.forEach((item) => {
            if (item.cover && item.cover.list
              && item.cover.list.length > 0
              && item.cover.list[0].thumbnail) {
              albums.push({
                name: item.album_id,
                friendly_name: item.name,
                preview: item.cover.list[0].thumbnail,
                image_count: item.image_count
              })
            } else {
              albums.push({
                name: item.album_id,
                friendly_name: item.name,
                preview: '',
                image_count: item.image_count
              })
            }

          })
          next_marker = resp.body.next_marker
        } else {
          next_marker = ''
        }

      } else {
        next_marker = ''
        break
      }
      if (albums.length >= max && max > 0) {
        next_marker = ''
        break
      }
    } while(next_marker)
    return albums
  }

  static async ApiAlbumGet(album_id: string): Promise<IAliAlubmListInfo | undefined> {
    const userId = useUserStore().user_id
    const url = 'adrive/v1/album/get'
    const resp = await AliHttp.Post(url, {album_id}, userId, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return resp.body as IAliAlubmListInfo
    } else {
      DebugLog.mSaveWarning('ApiAlbumsList err='  + (resp.code || ''))
    }
    return undefined
  }

  static async ApiTotalPhotosNum(): Promise<Number> {
    const driver_id = GetDriveID(useUserStore().user_id, 'pic')
    const userId = useUserStore().user_id
    const url = 'adrive/v2/file/search'

    if (!driver_id) {
      return 0
    }
    const postData = {
      "drive_id": driver_id,
      "query": "type = \"file\"",
      "limit": 1,
      "return_total_count": true,
      "marker":"",
    }
    const resp = await AliHttp.Post(url, postData, userId, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return  resp.body.total_count
    }
    return 0
  }


  static async ApiLimitedPhotos(marker="", limited=100): Promise<AliAlbumFileInfo[]> {
    const driver_id = GetDriveID(useUserStore().user_id, 'pic')
    const userId = useUserStore().user_id
    const url = 'adrive/v2/file/search'
    let max: number = useSettingStore().debugFileListMax

    const results:AliAlbumFileInfo[] = []
    if (!driver_id) {
      return results
    }

    const postData = {
      "drive_id": driver_id,
      "query": "type = \"file\"",
      "image_thumbnail_process": "image/resize,w_400/format,jpeg",
      "image_url_process": "image/resize,w_1920/format,jpeg",
      "video_thumbnail_process": "video/snapshot,t_0,f_jpg,ar_auto,w_1000",
      "limit": limited,
      "marker":marker,
      "order_by": "created_at DESC"
    }
    const resp = await AliHttp.Post(url, postData, userId, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const items =  resp.body.items as AliAlbumFileInfo[]

      if (items) {
        items.forEach((item) => {
          item.next_marker = resp.body.next_marker
        })
        results.push(...items)
        return results
      }
    }
    return results
  }


  static async ApiAllPhotos(): Promise<AliAlbumFileInfo[]> {
    const driver_id = GetDriveID(useUserStore().user_id, 'pic')
    const userId = useUserStore().user_id
    const url = 'adrive/v1.0/openFile/search'
    let marker = '';
    let max: number = useSettingStore().debugFileListMax

    const results:AliAlbumFileInfo[] = []
    if (!driver_id) {
      return results
    }

    do {
      const postData = {
        drive_id: driver_id,
        query: "type = \"file\"",
        image_thumbnail_process: "image/resize,w_400/format,jpeg",
        image_url_process: "image/resize,w_1920/format,jpeg",
        video_thumbnail_process: "video/snapshot,t_0,f_jpg,ar_auto,w_1000",
        marker:marker,
        order_by: "created_at DESC"
      }
      const resp = await AliHttp.Post(url, postData, userId, '')
      if (AliHttp.IsSuccess(resp.code)) {
        const items =  resp.body.items as AliAlbumFileInfo[]
        if (items) {
          results.push(...items)
          marker = resp.body.next_marker
        } else {
          marker = ''
        }
      } else {
        marker = ''
        break
      }
      if (max > 0 && results.length >= max) {
        marker = ''
        break
      }
    } while (marker)
    return results
  }

  static async ApiAlbumListFiles(album_id: string, marker="", limited=100): Promise<AliAlbumFileInfo[]> {
    const userId = useUserStore().user_id
    const url = 'adrive/v1/album/list_files'
    const postData = {
      album_id,
      image_thumbnail_process: "image/resize,w_400/format,jpeg",
      video_thumbnail_process: "video/snapshot,t_0,f_jpg,ar_auto,w_1000",
      image_url_process: "image/resize,w_1920/format,jpeg",
      limit: limited,
      marker:marker,
      order_direction: "DESC"
    }
    const results:AliAlbumFileInfo[] = []
    const driver_id = GetDriveID(useUserStore().user_id, 'pic')
    if (!driver_id) {
      return results
    }
    const resp = await AliHttp.Post(url, postData, userId, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const items =  resp.body.items as AliAlbumFileInfo[]
      if (items) {
        items.forEach((item) => {
          item.next_marker = resp.body.next_marker
        })
        results.push(...items)
        return results
      }
    }
    return results
  }

  static async ApiAlbumCreate_1(name: string, description: string): Promise<{ album_id: string; error: string }> {
    const userId = useUserStore().user_id
    const url = 'adrive/v1/album/create'
    const resp = await AliHttp.Post(url, {name, description}, userId, '')
    if (AliHttp.IsSuccess(resp.code)) {
      const item =  resp.body as  IAliAlubmCreateInfo
      return {album_id: item.album_id, error: ''}
    } else {
      DebugLog.mSaveWarning('ApiAlbumCreate err='  + (resp.code || ''))
    }
    return {album_id: '', error: resp.body?.code || '创建相册出错'}
  }

  static async ApiAlbumUpdat_1(album_id:string, name: string, description: string): Promise<IUrlRespData> {
    const userId = useUserStore().user_id
    // { "album_id": "cfe400000000478599575b69356c5a4962383669", "description": "ff", "name": "未命名" }
    const url = 'adrive/v1/album/update'
    return await AliHttp.Post(url, {name, album_id}, userId, '')
  }

  static async ApiAlbumFilesDelete(album_id:string, file_list:string[]): Promise<IUrlRespData> {
    const userId = useUserStore().user_id
    const drive_id = GetDriveID(userId, 'pic')
    const data:{drive_id:string, file_id:string}[] = []
    file_list.forEach((file_id) => {
      data.push({drive_id, file_id})
    })
    console.log("ApiAlbumFilesDelete data=", data, album_id)
    // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
    const url = 'adrive/v1/album/delete_files'
    return await AliHttp.Post(url, {album_id, "drive_file_list": data}, userId, '')
  }


  static async ApiAlbumDelete_1(album_id:string): Promise<IUrlRespData> {
    const userId = useUserStore().user_id
    const url = 'adrive/v1/album/delete'
    return await AliHttp.Post(url, {album_id}, userId, '')
  }

  static async ApiAlbumAddExistPic(album_id:string, file_list:string[]): Promise<IUrlRespData> {
    const userId = useUserStore().user_id
    const drive_id = GetDriveID(userId, 'pic')
    const data:{drive_id:string, file_id:string}[] = []
    file_list.forEach((file_id) => {
      data.push({drive_id, file_id})
    })
    const postData = {album_id, "drive_file_list": data}
    // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
    const url = 'adrive/v1/album/add_files'
    return await AliHttp.Post(url, postData, userId, '')
  }

  static async trashPhotos(file_ids: string[]): Promise<boolean> {
    const user_id = useUserStore().user_id
    const drive_id = GetDriveID(user_id, 'pic')
    // @ts-ignore
    const requestData = []
    file_ids.forEach((file_id) => {
      requestData.push({
        "body": {
          "drive_id": drive_id,
          "file_id": file_id
        },
        "headers": {
          "Content-Type": "application/json"
        },
        "id": file_id,
        "method": "POST",
        "url": "/recyclebin/trash"
      })
    })
    const url = 'v2/batch'
    // @ts-ignore
    const postData = { requests: requestData, resource: "file" }
    const resp = await AliHttp.Post(url, postData, user_id, '')
    if (AliHttp.IsSuccess(resp.code)) {
      return true
    } else {
      DebugLog.mSaveWarning('UploadFileDelete err=' + (resp.code || ''))
      return false
    }
  }

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

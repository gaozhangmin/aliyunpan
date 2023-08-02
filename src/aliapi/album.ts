import {AliAlbumFileInfo, IAliAlbumsList, IAliAlubmCreateInfo, IAliAlubmListInfo} from './alimodels'
import AliHttp, {IUrlRespData} from "./alihttp";
import DebugLog from "../utils/debuglog";
import {useSettingStore, useUserStore} from "../store";
import {GetDriveID} from "./utils";

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
        const url = 'adrive/v1.0/openFile/search'

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
        const url = 'adrive/v1.0/openFile/search'
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

    static async ApiAlbumCreate(name: string, description: string): Promise<{ album_id: string; error: string }> {
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

    static async ApiAlbumUpdate(album_id:string, name: string, description: string): Promise<IUrlRespData> {
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


    static async ApiAlbumDelete(album_id:string): Promise<IUrlRespData> {
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
}
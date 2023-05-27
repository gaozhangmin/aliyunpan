import {
    AliAlbumFileInfo, IAliAlbumsList,
    IAliAlubmCreateInfo,
    IAliAlubmListInfo, IAliGetFileModel
} from './alimodels'
import AliHttp, {IUrlRespData} from "./alihttp";
import DebugLog from "../utils/debuglog";
import {useSettingStore, useUserStore} from "../store";
import {GetDriveID} from "./utils";

export default class AliAlbum {

    static async ApiAlbumsList(): Promise<IAliAlbumsList[]> {
        const url = 'adrive/v1/album/list'
        const albums: IAliAlbumsList[] = []
        if (!GetDriveID(useUserStore().user_id, 'pic')) return albums
        const userId = useUserStore().user_id
        let max: number = useSettingStore().debugFileListMax
        let next_marker = ''
        do {
            const resp = await AliHttp.Post(url, {next_marker: next_marker}, userId, '')
            if (AliHttp.IsSuccess(resp.code)) {
                const items = resp.body.items as IAliAlubmListInfo[]
                if (items) {
                    items.forEach((item) => {
                        console.log("album item", item)
                        if (item.cover) {
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

    // https://api.aliyundrive.com/adrive/v1/album/add_files
    static async ApiAlbumAddFiles(album_id: string, file_ids: string[]): Promise<IUrlRespData> {
        const driver_id = GetDriveID(useUserStore().user_id, 'pic')
        const userId = useUserStore().user_id
        const url = 'adrive/v1/album/add_files'
        const drive_file_list: { driver_id: string; file_id: string; }[]  = []
        file_ids.forEach((file_id) => {
            drive_file_list.push({driver_id, file_id});
        })
        const postData = {
            "album_id": album_id,
            "drive_file_list":drive_file_list
        }
        return await AliHttp.Post(url, postData, userId, '')
    }


    static async ApiAllPhotos(): Promise<AliAlbumFileInfo[]> {
        const driver_id = GetDriveID(useUserStore().user_id, 'pic')
        const userId = useUserStore().user_id
        const url = 'adrive/v3/file/search'
        let marker = '';
        let max: number = useSettingStore().debugFileListMax

        const results:AliAlbumFileInfo[] = []

        do {
            const postData = {
                "drive_id": driver_id,
                "query": "type = \"file\"",
                "image_thumbnail_process": "image/resize,w_400/format,jpeg",
                "image_url_process": "image/resize,w_1920/format,jpeg",
                "video_thumbnail_process": "video/snapshot,t_0,f_jpg,ar_auto,w_1000",
                "limit": 100,
                "marker":marker,
                "order_by": "created_at DESC"
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
            if (results.length >= max && max > 0) {
                marker = ''
                break
            }
        } while (marker)
        return results
    }

    static async ApiAlbumsAllPhotos(): Promise<AliAlbumFileInfo[]> {
        const userId = useUserStore().user_id
        const url = 'adrive/v1/album/list_files'
        const albums = await AliAlbum.ApiAlbumsList()
        const allPhotos: AliAlbumFileInfo[] = []
        for (const album of albums) {
            const album_id = album.name
            const resp = await AliHttp.Post(url, {album_id}, userId, '')
            if (AliHttp.IsSuccess(resp.code)) {
                const photos = resp.body.items as AliAlbumFileInfo[]
                photos.forEach((photo) => {
                    photo.album_name = album.friendly_name
                })
                allPhotos.push(...photos)
            } else {
                DebugLog.mSaveWarning('ApiAlbumListFiles album: ' + album.friendly_name + 'error: ' + (resp.code || ''))
            }
        }
        return allPhotos
    }



    static async ApiAlbumListFiles(album_id: string): Promise<AliAlbumFileInfo[] | undefined> {
        const userId = useUserStore().user_id
        const url = 'adrive/v1/album/list_files'
        const resp = await AliHttp.Post(url, {album_id}, userId, '')
        if (AliHttp.IsSuccess(resp.code)) {
            return resp.body.items as AliAlbumFileInfo[]
        } else {
            DebugLog.mSaveWarning('ApiAlbumListFiles err='  + (resp.code || ''))
        }
        return undefined
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
        const resp = await AliHttp.Post(url, {name, album_id}, userId, '')
        return resp
    }

    static async ApiAlbumFilesDelete(user_id: string, album_id:string, drive_file_list:{ "drive_id":string, "file_id": string}[]): Promise<number> {
        // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
        const url = 'adrive/v1/album/delete_files'
        const resp = await AliHttp.Post(url, {album_id, drive_file_list}, user_id, '')
        return resp.code
    }


    static async ApiAlbumDelete(album_id:string): Promise<IUrlRespData> {
        const userId = useUserStore().user_id
        const url = 'adrive/v1/album/delete'
        const resp = await AliHttp.Post(url, {album_id}, userId, '')
        return resp
    }

    static async ApiAlbumAddExistPic(user_id: string, album_id:string, drive_file_list:{ "drive_id":string, "file_id": string}[]): Promise<number> {
        // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
        const url = 'adrive/v1/album/add_files'
        const resp = await AliHttp.Post(url, {album_id, drive_file_list}, user_id, '')
        return resp.code
    }
}
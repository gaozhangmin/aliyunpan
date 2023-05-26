import {
    AliAlbumFileInfo, IAliAlbumsList,
    IAliAlubmCreateInfo,
    IAliAlubmListInfo, IAliGetFileModel
} from './alimodels'
import AliHttp, {IUrlRespData} from "./alihttp";
import DebugLog from "../utils/debuglog";
import {IAliFileResp} from "./dirfilelist";
import {usePanFileStore, useSettingStore, useUserStore} from "../store";
import TreeStore from "../store/treestore";
import {OrderDir, OrderFile} from "../utils/filenameorder";
import message from "../utils/message";
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
                console.log("resp", resp)
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

    static async ApiAlbumUpdate(user_id: string, album_id:string, name: string, description: string): Promise<IAliAlubmCreateInfo | undefined> {
        // { "album_id": "cfe400000000478599575b69356c5a4962383669", "description": "ff", "name": "未命名" }
        const url = 'adrive/v1/album/update'
        const resp = await AliHttp.Post(url, {name, album_id, description}, user_id, '')
        if (AliHttp.IsSuccess(resp.code)) {
            return resp.body.items as  IAliAlubmCreateInfo
        } else {
            DebugLog.mSaveWarning('ApiAlbumUpdate err='  + (resp.code || ''))
        }
        return undefined
    }

    static async ApiAlbumFilesDelete(user_id: string, album_id:string, drive_file_list:{ "drive_id":string, "file_id": string}[]): Promise<number> {
        // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
        const url = 'adrive/v1/album/delete_files'
        const resp = await AliHttp.Post(url, {album_id, drive_file_list}, user_id, '')
        return resp.code
    }

    static async ApiAlbumAddExistPic(user_id: string, album_id:string, drive_file_list:{ "drive_id":string, "file_id": string}[]): Promise<number> {
        // { "album_id": "cfe400000000478599575b69356c5a4962383669", "drive_file_list": [{ "drive_id": "9600002", "file_id": "623b00000000d89ef21d4118838aed83de7575ba" }] }
        const url = 'adrive/v1/album/add_files'
        const resp = await AliHttp.Post(url, {album_id, drive_file_list}, user_id, '')
        return resp.code
    }
}
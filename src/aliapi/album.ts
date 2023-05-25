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

        const userId = useUserStore().user_id
        const drive_id = GetDriveID(userId, 'pic')
        if (!drive_id) return albums
        let max: number = useSettingStore().debugFileListMax
        let next_marker = ''
        do {
            const resp = await AliHttp.Post(url, {next_marker: next_marker}, userId, '')
            if (AliHttp.IsSuccess(resp.code)) {
                const items = resp.body.items as IAliAlubmListInfo[]
                if (items) {
                    items.forEach((item) => {
                        albums.push({
                            name: item.album_id,
                            friendly_name: item.name,
                            preview: item.cover.list[0].download_url}
                        )
                    })
                    next_marker = resp.body.next_marker
                } else {
                    next_marker = ''
                }

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
            return resp.body.items as IAliAlubmListInfo
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

    static async ApiAlbumCreate(user_id: string, name: string, description: string): Promise<IAliAlubmCreateInfo | undefined> {
        const url = 'adrive/v1/album/create'
        const resp = await AliHttp.Post(url, {name, description}, user_id, '')
        if (AliHttp.IsSuccess(resp.code)) {
            return resp.body.items as  IAliAlubmCreateInfo
        } else {
            DebugLog.mSaveWarning('ApiAlbumCreate err='  + (resp.code || ''))
        }
        return undefined
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
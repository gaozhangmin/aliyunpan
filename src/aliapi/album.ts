import {
    AliAlbumFileInfo, IAliAlbumResp,
    IAliAlubmCreateInfo,
    IAliAlubmListInfo, IAliGetFileModel
} from "./alimodels";
import AliHttp, {IUrlRespData} from "./alihttp";
import DebugLog from "../utils/debuglog";
import {IAliFileResp} from "./dirfilelist";
import {usePanFileStore, useSettingStore, useUserStore} from "../store";
import TreeStore from "../store/treestore";
import {OrderDir, OrderFile} from "../utils/filenameorder";
import message from "../utils/message";
import {GetDriveID} from "./utils";

export default class AliAlbum {

    static async ApiAlbumsList(drive_id: string): Promise<IAliAlbumResp> {
        const url = 'adrive/v1/album/list'
        const albums: IAliAlbumResp = {
            items: [],
            itemsKey: new Set(),
            next_marker: '',
            m_drive_id: drive_id,
            m_user_id: '',
        }

        const userId = useUserStore().user_id
        if (!drive_id) drive_id = GetDriveID(userId, 'pic')
        if (!drive_id) return albums
        albums.m_drive_id = drive_id
        albums.m_user_id = userId
        let max: number = useSettingStore().debugFileListMax
        do {
            const resp = await AliHttp.Post(url, {next_marker: albums.next_marker}, userId, '')
            if (AliHttp.IsSuccess(resp.code)) {
                const items = resp.body.items as IAliAlubmListInfo[]
                if (items) {
                    items.forEach((item) => {
                        if (!albums.itemsKey.has(item.album_id)) {
                            albums.itemsKey.add(item.album_id)
                            albums.items.push(item)
                        }
                    })
                    albums.next_marker = resp.body.next_marker
                } else {
                    albums.next_marker = ''
                }

            }
            if (albums.items.length >= max && max > 0) {
                albums.next_marker = ''
                break
            }
        } while(albums.next_marker)
        return albums
    }

    static async ApiAlbumGet(user_id: string,  album_id: string): Promise<IAliAlubmListInfo | undefined> {
        const url = 'adrive/v1/album/get'
        const resp = await AliHttp.Post(url, {album_id}, user_id, '')
        if (AliHttp.IsSuccess(resp.code)) {
            return resp.body.items as IAliAlubmListInfo
        } else {
            DebugLog.mSaveWarning('ApiAlbumsList err='  + (resp.code || ''))
        }
        return undefined
    }

    static async ApiAlbumListFiles(user_id: string,  album_id: string): Promise<AliAlbumFileInfo[] | undefined> {
        const url = 'adrive/v1/album/list_files'
        const resp = await AliHttp.Post(url, {album_id}, user_id, '')
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
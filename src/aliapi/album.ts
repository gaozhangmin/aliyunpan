import {IAliFileItem} from "./alimodels";
import AliHttp from "./alihttp";
import DebugLog from "../utils/debuglog";

export default class AliAlbum {

    static async ApiAlbumFileList(user_id: string, drive_id: string, file_id: string, orderby: string, order: string, limit: number): Promise<IAliFileItem | undefined> {
        const url = 'adrive/v3/file/search'
        const postData = {
            drive_id: drive_id,
            file_id: file_id,
            limit: limit,
            image_thumbnail_process: "image/resize,w_400/format,jpeg",
            image_url_process: "image/resize,w_1920/format,jpeg",
            video_thumbnail_process: "video/snapshot,t_0,f_jpg,ar_auto,w_1000",
            query: 'type="file"',
            order_by: (orderby + ' ' + order).toLowerCase(),
        }
        const resp = await AliHttp.Post(url, postData, user_id, '')
        if (AliHttp.IsSuccess(resp.code)) {
            return resp.body as IAliFileItem
        } else {
            DebugLog.mSaveWarning('ApiAlbumFileList err=' + file_id + ' ' + (resp.code || ''))
        }
        return undefined
    }

    static async ApiAlbumGetFiles(user_id: string, drive_id: string, file_id: string) {

    }

    static async ApiAlbumDeleteFiles() {

    }
}
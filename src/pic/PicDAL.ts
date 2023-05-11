import DB from '../utils/db'
import useUserStore from '../user/userstore'
import AliAlbum from '../aliapi/album'
import usePanTreeStore from '../pan/pantreestore'
import { GetDriveID } from '../aliapi/utils'

export default class PicDAL {
  static async aReLoadPicListToShow(drive_id: string, file_id: string) {
    const userId = useUserStore().user_id
    if (!drive_id) drive_id = GetDriveID(userId, 'pic')
    if (!drive_id) return false

    // if (file_id == 'refresh') file_id = pantreeStore.selectDir.file_id
    // const isBack = file_id == 'back'
    // if (isBack) {
    //     if (pantreeStore.History.length > 0) {
    //         pantreeStore.History.splice(0, 1)
    //         if (pantreeStore.History.length > 0) {
    //             drive_id = pantreeStore.History[0].drive_id
    //             file_id = pantreeStore.History[0].file_id
    //         }
    //     }
    //     pantreeStore.History = []
    //     file_id = 'root'
    // }
    const picList = await AliAlbum.ApiAlbumFileList(userId, drive_id, file_id, 'name', 'DESC', 50)
    console.log('picList', picList)
    return picList
  }
}

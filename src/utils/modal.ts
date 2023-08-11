import { IAliGetFileModel, IAliShareItem } from '../aliapi/alimodels'
import { useModalStore } from '../store'

export function modalCloseAll() {
  useModalStore().showModal('', {})
}

export function modalUserSpace() {
  useModalStore().showModal('userspace', {})
}
export function modalCreatNewFile(panType: string) {
  if (panType == 'backupPan') {
    useModalStore().showModal('createBackupPanFile', {})
  } else if (panType == 'resourcePan') {
    useModalStore().showModal('createResourcePanFile', {})
  }

}
export function modalCreatNewDir(panType: string, dirtype: string, parentdirid: string = '', callback: any = undefined) {
  if (panType == 'backupPan') {
    useModalStore().showModal('creatBackupPanDir', { dirtype, parentdirid, callback })
  } else {
    useModalStore().showModal('creatResourcePanDir', { dirtype, parentdirid, callback })
  }
}

export function modalCreatNewAlbum() {
  useModalStore().showModal('createalbum', { })
}

export function modalMoveToAlbum(photos_file_id:string[]) {
  useModalStore().showModal('movetoalubm', { photos_file_id })
}

export function modalCreatNewShareLink(sharetype: string, filelist: IAliGetFileModel[]) {
  useModalStore().showModal('createShare', { sharetype, filelist })
}

export function modalCreatRapidLink(sharetype: string, filelist: IAliGetFileModel[]) {
  useModalStore().showModal('createRapidLink', { sharetype, filelist })
}

export function modalDaoRuShareLink(shareUrl='', sharePwd='') {
  useModalStore().showModal('importShare', {shareUrl, sharePwd})
}
export function modalDaoRuShareLinkMulti() {
  useModalStore().showModal('importMultipleShare', {})
}

export function modalRename(panType: string, istree: boolean, ismulti: boolean) {
  if (panType == 'backupPan') {
    useModalStore().showModal(ismulti ? 'renameBackupPanMultiple' : 'renameBackupPan', { istree })
  } else {
    useModalStore().showModal(ismulti ? 'renameResourcePanMultiple' : 'renameResourcePan', { istree })
  }

}

export function modalEditShareLink(sharelist: IAliShareItem[]) {
  useModalStore().showModal('editshare', { sharelist })
}

export function modalShowShareLink(share_id: string, share_pwd: string, share_token: string, withsave: boolean, file_id_list: string[]) {
  useModalStore().showModal('showshare', { share_id, share_pwd, share_token, withsave, file_id_list })
}

export function modalSelectPanDir(panType: string, selecttype: string, selectid: string,
                                  callback: (user_id: string, drive_id: string, dirID: string, dirName: string) => void,
                                  category?: string,
                                  extFilter?: RegExp) {
  if (panType == 'backupPan') {
    useModalStore().showModal('selectBackupPanDir', { selecttype, selectid, category, extFilter, callback })
  } else {
    useModalStore().showModal('selectResourcePanDir', { selecttype, selectid, category, extFilter, callback })
  }

}

export function modalShuXing(panType: string, istree: boolean, ismulti: boolean) {
  ismulti = false
  if (panType == 'backupPan') {
    useModalStore().showModal(ismulti ? 'backupPanMultipleAttribute' : 'backupPanAttribute', { istree })
  } else {
    useModalStore().showModal(ismulti ? 'resourcePanMultipleAttribute' : 'resourcePanAttribute', { istree })
  }

}

export function modalSearchPan(panType: string) {
  if (panType == 'backupPan') {
    useModalStore().showModal('searchBackupPan', {})
  } else {
    useModalStore().showModal('searchResourcePan', {})
  }

}

export function modalDLNAPlayer() {
  useModalStore().showModal('dlna', {})
}
export function modalM3U8Download(panType: string) {
  if (panType == 'backupPan') {
    useModalStore().showModal('backupPanM3u8download', {})
  } else {
    useModalStore().showModal('resourcePanM3u8download', {})
  }

}

export function modalCopyFileTree(panType: string, filelist: IAliGetFileModel[]) {
  if (panType == 'backupPan') {
    useModalStore().showModal('copyBackupPanFileTree', { filelist })
  } else {
    useModalStore().showModal('copyResourcePanFileTree', { filelist })
  }

}

export function modalArchive(panType: string, user_id: string, drive_id: string, file_id: string, file_name: string, parent_file_id: string, password: string) {
  if (panType == 'backupPan') {
    useModalStore().showModal('archiveBackupPan', { user_id, drive_id, file_id, file_name, parent_file_id, password })
  } else {
    useModalStore().showModal('archiveResourcePan', { user_id, drive_id, file_id, file_name, parent_file_id, password })
  }

}

export function modalArchivePassword(panType: string, user_id: string, drive_id: string, file_id: string, file_name: string, parent_file_id: string, domain_id: string, ext: string) {
  if (panType == 'backupPan') {
    useModalStore().showModal('archiveBackupPanPassword', { user_id, drive_id, file_id, file_name, parent_file_id, domain_id, ext })
  } else {
    useModalStore().showModal('archiveResourcePanPassword', { user_id, drive_id, file_id, file_name, parent_file_id, domain_id, ext })

  }
}

export function modalUpload(panType: string, file_id: string, filelist: string[]) {
  if (panType == 'backupPan') {
    useModalStore().showModal('uploadBackupPan', { file_id, filelist })
  } else {
    useModalStore().showModal('uploadResourcePan', { file_id, filelist })
  }

}

export function modalDownload(panType: string, istree: boolean) {
  if (panType == 'backupPan') {
    useModalStore().showModal('downloadBackupPan', { istree })
  } else {
    useModalStore().showModal('downloadResourcePan', { istree })
  }

}

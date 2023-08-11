<script lang="ts">
import { defineComponent } from 'vue'
import { useModalStore } from '../store'
import UserSpaceModal from '../user/UserSpaceModal.vue'
import CreatNewFileModal from '../pan/topbtns/CreatNewFileModal.vue'
import CreatNewFileResModal from '../resPan/topbtns/CreatNewFileModal.vue'
import RenameModal from '../pan/topbtns/RenameModal.vue'
import RenameResModal from '../resPan/topbtns/RenameModal.vue'
import RenameMultiModal from '../pan/topbtns/RenameMultiModal.vue'
import RenameMultiResModal from '../resPan/topbtns/RenameMultiModal.vue'
import CreatNewDirModal from '../pan/topbtns/CreatNewDirModal.vue'
import CreatNewDirResModal from '../ResPan/topbtns/CreatNewDirModal.vue'
import DaoRuShareLinkResModal from '../resPan/topbtns/DaoRuShareLinkModal.vue'
import EditShareLinkModal from '../share/share/EditShareLinkModal.vue'
import DaoRuShareLinkMultiResModal from '../ResPan/topbtns/DaoRuShareLinkMultiModal.vue'
import ShowShareLinkModal from '../share/share/ShowShareLinkModal.vue'
import SelectPanDirModal from '../pan/topbtns/SelectPanDirModal.vue'
import SelectPanDirResModal from '../ResPan/topbtns/SelectPanDirModal.vue'
import CreatNewShareLinkResModal from '../resPan/topbtns/CreatNewShareLinkModal.vue'
import CreatRapidLinkModal from '../pan/topbtns/CreatNewShareLinkModal.vue'

import ShuXingModal from '../pan/topbtns/ShuXingModal.vue'
import ShuXingResModal from '../ResPan/topbtns/ShuXingModal.vue'
import ShuXingMultiModal from '../pan/topbtns/ShuXingMultiModal.vue'
import ShuXingMultiResModal from '../pan/topbtns/ShuXingMultiModal.vue'
import SearchPanModal from '../pan/topbtns/SearchPanModal.vue'
import SearchPanResModal from '../ResPan/topbtns/SearchPanModal.vue'
import DLNAPlayerModal from '../pan/topbtns/DLNAPlayerModal.vue'
import M3U8DownloadModal from '../pan/topbtns/M3U8DownloadModal.vue'
import M3U8DownloadResModal from '../ResPan/topbtns/M3U8DownloadModal.vue'
import CopyFileTreeModal from '../pan/topbtns/CopyFileTreeModal.vue'
import CopyFileTreeResModal from '../ResPan/topbtns/CopyFileTreeModal.vue'
import ArchiveModal from '../pan/topbtns/ArchiveModal.vue'
import ArchiveResModal from '../ResPan/topbtns/ArchiveModal.vue'
import ArchivePasswordModal from '../pan/topbtns/ArchivePasswordModal.vue'
import ArchivePasswordResModal from '../ResPan/topbtns/ArchivePasswordModal.vue'
import AlphaModal from '../pan/topbtns/AlphaModal.vue'
import AlphaResModal from '../ResPan/topbtns/AlphaModal.vue'
import UploadModal from '../pan/topbtns/UploadModal.vue'
import UploadResModal from '../ResPan/topbtns/UploadModal.vue'
import DownloadModal from '../pan/topbtns/DownloadModal.vue'
import DownloadResModal from '../ResPan/topbtns/DownloadModal.vue'
import SelectSubTitleModal from '../pan/topbtns/SelectSubTitleModal.vue'
import CreatNewAlbumModal from "../pan/topbtns/CreatNewAlbumModal.vue";
import CreatNewAlbumResModal from "../ResPan/topbtns/CreatNewAlbumModal.vue";
import MoveToAlbumModal from '../pan/topbtns/MoveToAlbumModal.vue'
import MoveToAlbumResModal from '../ResPan/topbtns/MoveToAlbumModal.vue'

export default defineComponent({
  components: {
    MoveToAlbumModal,
    CreatNewAlbumModal,
    UserSpaceModal,
    CreatNewFileModal,
    CreatNewFileResModal,
    RenameModal,
    RenameResModal,
    RenameMultiModal,
    RenameMultiResModal,
    CreatNewDirModal,
    CreatNewDirResModal,
    DaoRuShareLinkResModal,
    EditShareLinkModal,
    DaoRuShareLinkMultiResModal,
    ShowShareLinkModal,
    SelectPanDirModal,
    SelectPanDirResModal,
    CreatNewShareLinkResModal,
    CreatRapidLinkModal,
    ShuXingModal,
    ShuXingResModal,
    ShuXingMultiModal,
    ShuXingMultiResModal,
    SearchPanModal,
    SearchPanResModal,
    DLNAPlayerModal,
    M3U8DownloadModal,
    M3U8DownloadResModal,
    AlphaModal,
    CopyFileTreeModal,
    CopyFileTreeResModal,
    ArchiveModal,
    ArchiveResModal,
    ArchivePasswordModal,
    ArchivePasswordResModal,
    UploadModal,
    UploadResModal,
    DownloadModal,
    DownloadResModal
  },
  setup() {
    const modalStore = useModalStore()
    return { modalStore }
  }
})
</script>

<template>
  <AlphaModal />

  <UserSpaceModal :visible="modalStore.modalName == 'userspace'" />
  <CreatNewFileModal :visible="modalStore.modalName == 'createBackupPanFile'" />
  <CreatNewFileResModal :visible="modalStore.modalName == 'createResourcePanFile'" />
  <CreatNewAlbumModal :visible="modalStore.modalName == 'createalbum'" />
  <MoveToAlbumModal :visible="modalStore.modalName == 'movetoalubm'"  :photos_file_id='modalStore.modalData.photos_file_id' :album_id='modalStore.modalData.album_id' />
  <CreatNewDirModal :visible="modalStore.modalName == 'creatBackupPanDir'" :dirtype="modalStore.modalData.dirtype || ''" :parentdirid="modalStore.modalData.parentdirid || ''" :callback="modalStore.modalData.callback" />
  <CreatNewDirResModal :visible="modalStore.modalName == 'creatResourcePanDir'" :dirtype="modalStore.modalData.dirtype || ''" :parentdirid="modalStore.modalData.parentdirid || ''" :callback="modalStore.modalData.callback" />

  <CreatNewShareLinkResModal :visible="modalStore.modalName == 'createShare'" :sharetype="modalStore.modalData.sharetype || ''" :filelist="modalStore.modalData.filelist || []" />
  <CreatRapidLinkModal :visible="modalStore.modalName == 'createRapidLink'" :sharetype="modalStore.modalData.sharetype || ''" :filelist="modalStore.modalData.filelist || []" />

  <DaoRuShareLinkResModal :visible="modalStore.modalName == 'importShare'" :shareUrl="modalStore.modalData.shareUrl || ''" :sharePwd="modalStore.modalData.sharePwd || ''" />
  <DaoRuShareLinkMultiResModal :visible="modalStore.modalName == 'importMultipleShare'" />

  <RenameModal :visible="modalStore.modalName == 'renameBackupPan'" :istree="modalStore.modalData.istree || false" />
  <RenameResModal :visible="modalStore.modalName == 'renameResourcePan'" :istree="modalStore.modalData.istree || false" />
  <RenameMultiModal :visible="modalStore.modalName == 'renameBackupPanMultiple'" :istree="modalStore.modalData.istree || false" />
  <RenameMultiResModal :visible="modalStore.modalName == 'renameResourcePanMultiple'" :istree="modalStore.modalData.istree || false" />
  <ShuXingModal :visible="modalStore.modalName == 'backupPanAttribute'" :istree="modalStore.modalData.istree || false" />
  <ShuXingResModal :visible="modalStore.modalName == 'resourcePanAttribute'" :istree="modalStore.modalData.istree || false" />
  <ShuXingMultiModal :visible="modalStore.modalName == 'backupPanMultipleAttribute'" :istree="modalStore.modalData.istree || false" />
  <ShuXingMultiResModal :visible="modalStore.modalName == 'resourcePanMultipleAttribute'" :istree="modalStore.modalData.istree || false" />
  <SearchPanModal :visible="modalStore.modalName == 'searchBackupPan'" />
  <SearchPanResModal :visible="modalStore.modalName == 'searchResourcePan'" />

<!--  <DLNAPlayerModal :visible="modalStore.modalName == 'dlna'" />-->
  <M3U8DownloadModal :visible="modalStore.modalName == 'backupPanM3u8download'" />
  <M3U8DownloadResModal :visible="modalStore.modalName == 'resourcePanM3u8download'" />
  <CopyFileTreeModal :visible="modalStore.modalName == 'copyBackupPanFileTree'" :filelist="modalStore.modalData.filelist || []" />
  <CopyFileTreeResModal :visible="modalStore.modalName == 'copyResourcePanFileTree'" :filelist="modalStore.modalData.filelist || []" />s
  <ArchiveModal
    :visible="modalStore.modalName == 'archiveBackupPan'"
    :user_id="modalStore.modalData.user_id || ''"
    :drive_id="modalStore.modalData.drive_id || ''"
    :file_id="modalStore.modalData.file_id || ''"
    :file_name="modalStore.modalData.file_name || ''"
    :parent_file_id="modalStore.modalData.parent_file_id || ''"
    :password="modalStore.modalData.password || ''" />
  <ArchiveResModal
    :visible="modalStore.modalName == 'archiveResourcePan'"
    :user_id="modalStore.modalData.user_id || ''"
    :drive_id="modalStore.modalData.drive_id || ''"
    :file_id="modalStore.modalData.file_id || ''"
    :file_name="modalStore.modalData.file_name || ''"
    :parent_file_id="modalStore.modalData.parent_file_id || ''"
    :password="modalStore.modalData.password || ''" />
  <ArchivePasswordModal
    :visible="modalStore.modalName == 'archiveBackupPanPassword'"
    :user_id="modalStore.modalData.user_id || ''"
    :drive_id="modalStore.modalData.drive_id || ''"
    :file_id="modalStore.modalData.file_id || ''"
    :file_name="modalStore.modalData.file_name || ''"
    :parent_file_id="modalStore.modalData.parent_file_id || ''"
    :password="modalStore.modalData.password || ''"
    :domain_id="modalStore.modalData.domain_id || ''"
    :ext="modalStore.modalData.ext || ''" />
  <ArchivePasswordResModal
    :visible="modalStore.modalName == 'archiveResourcePanPassword'"
    :user_id="modalStore.modalData.user_id || ''"
    :drive_id="modalStore.modalData.drive_id || ''"
    :file_id="modalStore.modalData.file_id || ''"
    :file_name="modalStore.modalData.file_name || ''"
    :parent_file_id="modalStore.modalData.parent_file_id || ''"
    :password="modalStore.modalData.password || ''"
    :domain_id="modalStore.modalData.domain_id || ''"
    :ext="modalStore.modalData.ext || ''" />

  <EditShareLinkModal :visible="modalStore.modalName == 'editshare'" :sharelist="modalStore.modalData.sharelist || []" />
  <ShowShareLinkModal
    :visible="modalStore.modalName == 'showshare'"
    :share_id="modalStore.modalData.share_id || ''"
    :share_pwd="modalStore.modalData.share_pwd || ''"
    :share_token="modalStore.modalData.share_token || ''"
    :withsave="modalStore.modalData.withsave || false"
    :file_id_list="modalStore.modalData.file_id_list || []" />

  <UploadModal :visible="modalStore.modalName == 'uploadBackupPan'" :file_id="modalStore.modalData.file_id || ''" :filelist="modalStore.modalData.filelist || []" />
  <UploadResModal :visible="modalStore.modalName == 'uploadResourcePan'" :file_id="modalStore.modalData.file_id || ''" :filelist="modalStore.modalData.filelist || []" />
  <DownloadModal :visible="modalStore.modalName == 'downloadBackupPan'" :istree="modalStore.modalData.istree || false" />
  <DownloadResModal :visible="modalStore.modalName == 'downloadResourcePan'" :istree="modalStore.modalData.istree || false" />

  <SelectPanDirModal :visible="modalStore.modalName == 'selectBackupPanDir'"
                     :selecttype="modalStore.modalData.selecttype || ''"
                     :selectid="modalStore.modalData.selectid || ''"
                     :category="modalStore.modalData.category"
                     :extFilter="modalStore.modalData.extFilter"
                     :callback='modalStore.modalData.callback' />
  <SelectPanDirResModal :visible="modalStore.modalName == 'selectResourcePanDir'"
                     :selecttype="modalStore.modalData.selecttype || ''"
                     :selectid="modalStore.modalData.selectid || ''"
                     :category="modalStore.modalData.category"
                     :extFilter="modalStore.modalData.extFilter"
                     :callback='modalStore.modalData.callback' />
</template>
<style>
.modalclass .arco-modal-body {
  padding: 24px 16px 16px 16px;
}

.modaltitle .titletips {
  padding: 0 4px;
  font-size: 14px;
  line-height: 25px;
  color: rgb(var(--primary-6));
}

.modaltitle .onerowtitle {
  font-size: 16px;
  line-height: 25px;
  flex-grow: 1;
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 32px;
}

.modalfoot {
  display: flex;
  align-items: center;
}

.modalfoot .tips {
  font-size: 14px;
  line-height: 25px;
  color: var(--color-text-2);
}

.modalfoot button:not(:last-of-type) {
  margin-right: 12px;
}

.modalbody .arco-form-item-label-col {
  padding-right: 4px;
}
</style>

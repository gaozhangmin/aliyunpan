import { defineStore } from 'pinia'
import { IAliGetDirModel } from '../../aliapi/alimodels'
import { h } from 'vue'

export interface MediaPanTreeState {
  user_id: string
  drive_id: string

  selectDir: IAliGetDirModel

  selectDirPath: IAliGetDirModel[]
}

type State = MediaPanTreeState

export const fileiconfn = (icon: string) => h('i', { class: 'iconfont ' + icon })

const useMediaPanTreeStore = defineStore('mediaPanTree', {
  state: (): State => ({
    user_id: '',
    drive_id: '',
    selectDir: {
      __v_skip: true,
      drive_id: '',
      file_id: '',
      album_id: '',
      album_type: '',
      parent_file_id: '',
      name: '',
      namesearch: '',
      path: '',
      size: 0,
      time: 0,
      description: ''
    },
    selectDirPath: []
  }),

  getters: {},

  actions: {
    mSaveUser(user_id: string, drive_id: string) {
      this.$patch({ user_id, drive_id })
    },

    mShowDir(dir: IAliGetDirModel, dirPath: IAliGetDirModel[]) {
      this.$patch({
        selectDir: dir,
        selectDirPath: dirPath
      })
    }
  }
})

export default useMediaPanTreeStore
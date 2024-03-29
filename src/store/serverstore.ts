import { defineStore } from 'pinia'


export interface IShareSiteModel {
  title: string
  url: string
  tip: string
  group: string
  color: string
  external: string
}

export interface IShareSiteGroupModel {
  group: string,
  title: string
}

export interface ServerState {
  shareSiteList: IShareSiteModel[]
  shareSiteGroupList: IShareSiteGroupModel[]
  helpUrl: string
}

const useServerStore = defineStore('serverstore', {
  state: (): ServerState => ({
    shareSiteList: [],
    shareSiteGroupList: [],
    helpUrl: 'aHR0cHM6Ly94YnlzaXRlLnBhZ2VzLmRldi8='
  }),
  actions: {

    mSaveShareSiteList(shareSiteList: IShareSiteModel[]) {
      this.shareSiteList = shareSiteList || []
    },

    mSaveShareSiteGroupList(shareSiteGroupList: IShareSiteGroupModel[]) {
      this.shareSiteGroupList = shareSiteGroupList || []
    },

    mSaveHelpUrl(url: string) {
      this.helpUrl = url || 'aHR0cHM6Ly94YnlzaXRlLnBhZ2VzLmRldi8='
    }
  }
})

export default useServerStore

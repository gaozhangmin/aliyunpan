import { defineStore } from 'pinia'
import Config from '../utils/config'


export interface IShareSiteModel {
  title: string
  url: string
  tip: string
  group: string,
  color: string
}

export interface IShareSiteGroupModel {
  group: string,
  title: string
}

export interface ServerState {

  shareSiteList: IShareSiteModel[]
  movieSiteList: IShareSiteModel[]
  shareSiteGroupList: IShareSiteGroupModel[]
  helpUrl: string
  salesUrl: string
  proxyUrl: string
}

const useServerStore = defineStore('serverstore', {
  state: (): ServerState => ({
    shareSiteList: [],
    movieSiteList: [],
    shareSiteGroupList: [],
    salesUrl: '',
    proxyUrl: Config.tmdbProxyUrl,
    helpUrl: 'aHR0cHM6Ly94YnlzaXRlLnBhZ2VzLmRldi8='
  }),
  actions: {

    mSaveShareSiteList(shareSiteList: IShareSiteModel[]) {
      this.shareSiteList = shareSiteList || []
    },

    mSaveMovieSiteList(movieSiteList: IShareSiteModel[]) {
      this.movieSiteList = movieSiteList || []
    },

    mSaveShareSiteGroupList(shareSiteGroupList: IShareSiteGroupModel[]) {
      this.shareSiteGroupList = shareSiteGroupList || []
    },

    mSaveHelpUrl(url: string) {
      this.helpUrl = url || 'aHR0cHM6Ly94YnlzaXRlLnBhZ2VzLmRldi8='
    },
    mSaveSalesUrl(url: string) {
      this.salesUrl = url
    },
    mSaveProxyUrl(url: string) {
      this.proxyUrl = url
    }
  }
})

export default useServerStore

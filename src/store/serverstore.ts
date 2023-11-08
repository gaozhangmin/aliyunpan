import { defineStore } from 'pinia'


export interface IShareSiteModel {
  title: string
  url: string
  tip: string
}

export interface ServerState {

  shareSiteList: IShareSiteModel[]
  movieSiteList: IShareSiteModel[]
  helpUrl: string
  salesUrl: string
}

const useServerStore = defineStore('serverstore', {
  state: (): ServerState => ({
    shareSiteList: [],
    movieSiteList: [],
    salesUrl: '',
    helpUrl: 'aHR0cHM6Ly9naXRodWIuY29tL2dhb3poYW5nbWluL2FsaXl1bnBhbg=='
  }),
  actions: {

    mSaveShareSiteList(shareSiteList: IShareSiteModel[]) {
      this.shareSiteList = shareSiteList || []
    },

    mSaveMovieSiteList(movieSiteList: IShareSiteModel[]) {
      this.movieSiteList = movieSiteList || []
    },

    mSaveHelpUrl(url: string) {
      this.helpUrl = url || 'aHR0cHM6Ly9naXRodWIuY29tL2dhb3poYW5nbWluL2FsaXl1bnBhbg=='
    },
    mSaveSalesUrl(url: string) {
      this.salesUrl = url
    }
  }
})

export default useServerStore

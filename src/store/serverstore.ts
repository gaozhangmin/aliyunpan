import { defineStore } from 'pinia'


export interface IShareSiteModel {
  title: string
  url: string
  tip: string
}

export interface ServerState {
  
  shareSiteList: IShareSiteModel[]
  helpUrl: string
}

const useServerStore = defineStore('serverstore', {
  state: (): ServerState => ({
    shareSiteList: [],
    helpUrl: 'aHR0cHM6Ly9naXRodWIuY29tL1BpbmdLdU5ldC9hbGl5dW5wYW4='
  }),
  actions: {
    
    mSaveShareSiteList(shareSiteList: IShareSiteModel[]) {
      this.shareSiteList = shareSiteList || []
    },
    
    mSaveHelpUrl(url: string) {
      this.helpUrl = url || 'aHR0cHM6Ly9naXRodWIuY29tL1BpbmdLdU5ldC9hbGl5dW5wYW4='
    }
  }
})

export default useServerStore

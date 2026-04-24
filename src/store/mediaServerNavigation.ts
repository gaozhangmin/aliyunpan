import { defineStore } from 'pinia'
import type { MediaServerPrimaryTab, MediaServerRoute } from '../types/mediaServer'

interface MediaServerNavigationState {
  currentTab: MediaServerPrimaryTab
  routeStack: MediaServerRoute[]
}

const useMediaServerNavigationStore = defineStore('media-server-navigation', {
  state: (): MediaServerNavigationState => ({
    currentTab: 'home',
    routeStack: [{ kind: 'registry' }]
  }),
  getters: {
    currentRoute(state): MediaServerRoute {
      return state.routeStack[state.routeStack.length - 1] || { kind: 'registry' }
    }
  },
  actions: {
    reset() {
      this.currentTab = 'home'
      this.routeStack = [{ kind: 'registry' }]
    },
    openRegistry() {
      this.routeStack = [{ kind: 'registry' }]
    },
    goHome() {
      this.currentTab = 'home'
      this.routeStack = [{ kind: 'home' }]
    },
    goSearch(query = '') {
      this.currentTab = 'search'
      this.routeStack = [{ kind: 'search', query }]
    },
    goLibraryRoot() {
      this.currentTab = 'library'
      this.routeStack = [{ kind: 'library-root' }]
    },
    replace(route: MediaServerRoute) {
      if (this.routeStack.length === 0) this.routeStack = [route]
      else this.routeStack[this.routeStack.length - 1] = route
    },
    push(route: MediaServerRoute) {
      this.routeStack.push(route)
    },
    back() {
      if (this.routeStack.length > 1) this.routeStack.pop()
    }
  }
})

export default useMediaServerNavigationStore

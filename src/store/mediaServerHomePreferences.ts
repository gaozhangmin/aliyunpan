import { defineStore } from 'pinia'

export type MediaServerPosterType = 'portrait' | 'landscape'
export type MediaServerBrowseMode = 'grid' | 'list'

export interface MediaServerHomePreferencesState {
  showPosterLabels: boolean
  nextUpPosterType: MediaServerPosterType
  recentlyAddedPosterType: MediaServerPosterType
  latestInLibraryPosterType: MediaServerPosterType
  collectionBrowseMode: MediaServerBrowseMode
  latestInLibraryBrowseMode: MediaServerBrowseMode
  showRecentlyAdded: boolean
  resumeNextUp: boolean
  maxNextUpDays: number
  homeLibraryOrder: string[]
  hiddenHomeLibraryIds: string[]
  homeSectionOrder: string[]
  hiddenHomeSectionIds: string[]
}

const STORAGE_KEY = 'media-server-home-preferences'

const defaults = (): MediaServerHomePreferencesState => ({
  showPosterLabels: true,
  nextUpPosterType: 'portrait',
  recentlyAddedPosterType: 'portrait',
  latestInLibraryPosterType: 'portrait',
  collectionBrowseMode: 'grid',
  latestInLibraryBrowseMode: 'grid',
  showRecentlyAdded: true,
  resumeNextUp: true,
  maxNextUpDays: 366,
  homeLibraryOrder: [],
  hiddenHomeLibraryIds: [],
  homeSectionOrder: [],
  hiddenHomeSectionIds: []
})

const useMediaServerHomePreferencesStore = defineStore('media-server-home-preferences', {
  state: (): MediaServerHomePreferencesState => defaults(),
  actions: {
    ensureLoaded() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        Object.assign(this, defaults(), JSON.parse(raw))
      } catch {
        Object.assign(this, defaults())
      }
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        showPosterLabels: this.showPosterLabels,
        nextUpPosterType: this.nextUpPosterType,
        recentlyAddedPosterType: this.recentlyAddedPosterType,
        latestInLibraryPosterType: this.latestInLibraryPosterType,
        collectionBrowseMode: this.collectionBrowseMode,
        latestInLibraryBrowseMode: this.latestInLibraryBrowseMode,
        showRecentlyAdded: this.showRecentlyAdded,
        resumeNextUp: this.resumeNextUp,
        maxNextUpDays: this.maxNextUpDays,
        homeLibraryOrder: this.homeLibraryOrder,
        hiddenHomeLibraryIds: this.hiddenHomeLibraryIds,
        homeSectionOrder: this.homeSectionOrder,
        hiddenHomeSectionIds: this.hiddenHomeSectionIds
      }))
    },
    setPartial(payload: Partial<MediaServerHomePreferencesState>) {
      Object.assign(this, payload)
      this.save()
    }
  }
})

export default useMediaServerHomePreferencesStore

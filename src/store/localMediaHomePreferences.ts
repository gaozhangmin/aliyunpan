import { defineStore } from 'pinia'

export type LocalMediaHomePosterType = 'portrait' | 'landscape'
export type LocalMediaHomeSectionKey =
  | 'continue'
  | 'recent'
  | 'movies'
  | 'tv'
  | 'documentary'
  | 'animation'
  | 'unmatched'
  | 'unwatched'
  | 'favorites'
  | 'playlists'
  | 'genres'
  | 'ratings'
  | 'years'
  | 'folders'

export interface LocalMediaHomePreferencesState {
  showPosterLabels: boolean
  continuePosterType: LocalMediaHomePosterType
  recentlyAddedPosterType: LocalMediaHomePosterType
  libraryPosterType: LocalMediaHomePosterType
  showRecentlyAdded: boolean
  homeSectionOrder: LocalMediaHomeSectionKey[]
  hiddenHomeSectionIds: LocalMediaHomeSectionKey[]
}

const STORAGE_KEY = 'local-media-home-preferences'

const defaults = (): LocalMediaHomePreferencesState => ({
  showPosterLabels: true,
  continuePosterType: 'landscape',
  recentlyAddedPosterType: 'portrait',
  libraryPosterType: 'portrait',
  showRecentlyAdded: true,
  homeSectionOrder: [],
  hiddenHomeSectionIds: []
})

const useLocalMediaHomePreferencesStore = defineStore('local-media-home-preferences', {
  state: (): LocalMediaHomePreferencesState => defaults(),
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
        continuePosterType: this.continuePosterType,
        recentlyAddedPosterType: this.recentlyAddedPosterType,
        libraryPosterType: this.libraryPosterType,
        showRecentlyAdded: this.showRecentlyAdded,
        homeSectionOrder: this.homeSectionOrder,
        hiddenHomeSectionIds: this.hiddenHomeSectionIds
      }))
    },
    setPartial(payload: Partial<LocalMediaHomePreferencesState>) {
      Object.assign(this, payload)
      this.save()
    }
  }
})

export default useLocalMediaHomePreferencesStore

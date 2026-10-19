import { describe, expect, it } from 'vitest'
import { detailCollectionTarget, playlistSelection, applyPlaylistSelection } from '../detailCollections'
import { libraryPlaylistMembers } from '../unifiedLibraryCategories'
import type { MediaLibraryItem } from '../../types/media'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'

const movie: MediaLibraryItem = { id: 'movie_7', parentId: 'root', name: 'Movie', type: 'movie', genres: [], driveFiles: [], addedAt: new Date() }
const tv: MediaLibraryItem = { ...movie, id: 'tv_123', name: 'Show', type: 'tv' }
describe('macOS-style detail collection actions', () => {
  it('keeps detail mounted during tag browsing and routes Back to the saved detail', () => {
    const library = readFileSync(resolve(process.cwd(), 'src/components/MediaLibrary.vue'), 'utf8')
    const view = readFileSync(resolve(process.cwd(), 'src/views/UnifiedMediaLibraryView.vue'), 'utf8')
    expect(library).toContain('v-if="currentMediaItem"\n        v-show="showingDetail"')
    expect(library).toContain('function returnToTagDetail()')
    expect(library).toContain('restoreDetailFilters()')
    expect(view).toContain('videoView?.returnToTagDetail() ||')
  })
  it('keeps empty heroes dark and gives both detail renderers a viewport-height artwork stage', () => {
    const detail = readFileSync(resolve(process.cwd(), 'src/components/MediaDetail.vue'), 'utf8')
    const server = readFileSync(resolve(process.cwd(), 'src/views/MediaServerWorkspace.vue'), 'utf8')
    expect(detail).toContain("backgroundImage: 'none'")
    expect(detail).not.toContain('linear-gradient(180deg, #fbfbfc')
    expect(detail).toContain('min-height: max(620px, calc(100vh - 140px))')
    expect(server).toContain('min-height: max(620px, calc(100vh - 140px))')
  })
  it('reloads tag-filtered pages and forwards the tag title to the unified header', () => {
    const library = readFileSync(resolve(process.cwd(), 'src/components/MediaLibrary.vue'), 'utf8')
    expect(library).toContain('const selectedGenreValue = selectedGenre.value')
    expect(library).toContain('props.selectedRating, selectedGenre.value, selectedYear.value, selectedRating.value, activeTab.value')
    expect(library).toContain("emit('tagTitleChange', tagValue)")
    for (const path of ['src/views/MediaLibraryView.vue', 'src/views/UnifiedMediaLibraryView.vue']) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8')
      expect(source).toMatch(/tagTitleChange|tag-title-change/)
      const { descriptor } = parse(source)
      const script = compileScript(descriptor, { id: path })
      expect(compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
    }
  })
  it('centers the server episode play control and plays the clicked episode without selecting another card', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/views/MediaServerWorkspace.vue'), 'utf8')
    expect(source).toContain('@click.stop="playHomeMediaItem(episode)"')
    expect(source).toContain('@keydown.enter.self="selectDetailEpisode(episode.id)"')
    expect(source).toMatch(/\.detail-episode-play-overlay \{[^}]*inset: 50% auto auto 50%;[^}]*width: 40px;[^}]*height: 40px;/)
    const { descriptor } = parse(source)
    const script = compileScript(descriptor, { id: 'MediaServerWorkspace.vue' })
    expect(compileTemplate({ source: descriptor.template!.content, filename: 'MediaServerWorkspace.vue', id: 'MediaServerWorkspace.vue', compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  })
  it('shares the picker UI and keeps collection actions inside the four-button dropdown', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/MediaDetail.vue'), 'utf8')
    const series = readFileSync(resolve(process.cwd(), 'src/components/CustomMediaSeriesModal.vue'), 'utf8')
    expect(source).toContain('<MediaCollectionPicker')
    expect(source).not.toContain('details-section')
    expect(source).not.toContain('详细信息')
    expect(source).toContain('class="scraped-media-info-section"')
    expect(source).toContain('class="detail-media-card"')
    expect(source).toMatch(/#xbybody \.media-detail \.hero-copy \{[^}]*align-self: end;[^}]*gap: 9px;/)
    expect(source).toContain('.hero-copy .hero-meta { order: 5; align-self: stretch; }')
    expect(source).toContain(':aria-label="`播放第 ${episode.episodeNumber} 集`" @click.stop="handleEpisodePlay(episode)"')
    expect(source).toMatch(/#xbybody \.media-detail \.episode-play-overlay \{\s*display: flex;\s*inset: 50% auto auto 50%;/)
    expect(series).toContain('<MediaCollectionPicker')
    const buttonStyle = source.slice(source.indexOf("[arco-theme='dark'] #xbybody .media-detail .action-button {"))
    expect(buttonStyle.slice(0, buttonStyle.indexOf('}'))).toContain('border-radius: 999px')
    const actions = source.slice(source.indexOf('<div ref="actionButtonsRef"'), source.indexOf('</a-dropdown>', source.indexOf('<div ref="actionButtonsRef"')))
    expect(actions.match(/class="action-button"/g)).toHaveLength(5)
    expect(source).toContain('@click="togglePlaylist"')
    expect(source).toContain('@click="addToCustomSeries"')
    for (const path of ['MediaCollectionPicker.vue', 'CustomMediaSeriesModal.vue', 'MediaDetail.vue']) {
      const { descriptor } = parse(readFileSync(resolve(process.cwd(), 'src/components', path), 'utf8'))
      const script = compileScript(descriptor, { id: path })
      expect(compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
    }
  })
  it('targets the selected episode and keeps the full canonical series ID', () => {
    expect(detailCollectionTarget(tv, { seasonNumber: 2, episodeNumber: 3, name: 'Third' })).toEqual({ id: 'tv_123_2_3', title: 'Show · S2E3 Third' })
    expect(detailCollectionTarget({ ...tv, id: 'tv_123_1_1' }, { seasonNumber: 2, episodeNumber: 3, name: 'Third' })?.id).toBe('tv_123_2_3')
    expect(detailCollectionTarget(tv)).toBeNull()
    expect(detailCollectionTarget(movie)?.id).toBe(movie.id)
  })
  it('uses the detail picker for poster menus and saves membership only on Done', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/MediaLibrary.vue'), 'utf8')
    expect(source).toContain('<MediaCollectionPicker')
    expect(source).not.toContain('<div class="poster-playlist-picker">')
    expect(source).toContain('@done="savePlaylistSelection"')
    expect(source).toContain('@close="playlistVisible = false"')
    expect(source).toContain('playlistTargetIds.value.every(id => mediaStore.playlists[name].includes(id))')
    expect(source).toContain('applyPlaylistSelection(mediaStore.playlists, playlistTargetId.value, selectedPlaylists.value,')
    const { descriptor } = parse(source)
    const script = compileScript(descriptor, { id: 'MediaLibrary.vue' })
    expect(compileTemplate({ source: descriptor.template!.content, filename: 'MediaLibrary.vue', id: 'MediaLibrary.vue', compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  })
  it('initializes selected lists and stages changes without mutating saved membership', () => {
    const lists = { Favorites: ['movie_7', 'other'], Later: ['other'], Empty: [] }
    const selected = playlistSelection(lists, movie.id)
    expect(selected).toEqual(['Favorites'])
    selected.splice(0, 1, 'Later')
    expect(lists.Favorites).toEqual(['movie_7', 'other'])
    expect(applyPlaylistSelection(lists, movie.id, selected)).toEqual({ Favorites: ['other'], Later: ['other', 'movie_7'], Empty: [] })
  })
  it('saving twice does not duplicate items or resurrect deleted lists', () => {
    expect(applyPlaylistSelection({ List: ['movie_7'] }, movie.id, ['List', 'Deleted'])).toEqual({ List: ['movie_7'] })
    expect(applyPlaylistSelection({ List: [] }, '', ['List'])).toEqual({ List: [] })
  })
  it('resolves series episode members and individual movies inside an aggregate collection', () => {
    const episode = { id: 30, seasonNumber: 2, episodeNumber: 3, name: 'Third', driveFiles: [] }
    const parent = { ...tv, seasons: [{ id: 2, name: 'Season', seasonNumber: 2, episodeCount: 1, episodes: [episode] }] }
    const collection = { ...movie, id: 'collection_9', collectionMovies: [{ ...movie, type: 'movie' as const }] }
    expect(libraryPlaylistMembers([parent, collection], ['tv_123_2_3', 'movie_7']).map(item => item.id)).toEqual(['tv_123_2_3', 'movie_7'])
  })
})

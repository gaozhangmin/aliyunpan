import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
describe('poster action routing regressions', () => {
  const home = readFileSync('src/views/UnifiedMediaLibraryView.vue', 'utf8')
  it('does not navigate before dispatching homepage menu actions', () => {
    const local = home.slice(home.indexOf('async function localPosterAction'), home.indexOf('const homeActionPending'))
    const server = home.slice(home.indexOf('async function serverPosterAction'), home.indexOf('const localCard'))
    expect(local).not.toContain('showCategory(')
    expect(server).not.toContain('showServer(')
    expect(home).toContain('@custom-series="showCustomSeries"')
  })
  it.each(['src/components/MediaPersonalRatingModal.vue', 'src/components/media-server/home/MediaServerPosterRow.vue', 'src/components/LibraryObjectActions.vue', 'src/components/UnifiedLibraryBrowser.vue', 'src/components/MediaPosterMenu.vue', 'src/components/UnifiedMediaRow.vue', 'src/views/UnifiedMediaLibraryView.vue'])('compiles updated menu surfaces: %s', file => {
    const { descriptor, errors } = parse(readFileSync(file, 'utf8'))
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: file })
    expect(compileTemplate({ source: descriptor.template!.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  })
})

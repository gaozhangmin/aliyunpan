import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'

const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8')
describe('media server source UI', () => {
  it('offers cover selection only for media servers', () => {
    const source = read('views/UnifiedMediaLibraryView.vue')
    const options = source.slice(source.indexOf('const contextOptions'), source.indexOf('function persistSources'))
    const serverOptions = options.slice(options.indexOf("sourceMenu.value?.key.startsWith('server:')"), options.indexOf("  : [{ id: 'play'"))
    const folderOptions = options.slice(0, options.indexOf("sourceMenu.value?.key.startsWith('server:')"))
    expect(serverOptions).toContain("id: 'cover'")
    expect(folderOptions).not.toContain("id: 'cover'")
    expect(source).toContain("sourceDialog.value = 'cover'")
  })
  it('edits the specific server without opening the registry window', () => {
    const source = read('views/UnifiedMediaLibraryView.vue')
    const action = source.slice(source.indexOf('async function sourceAction'), source.indexOf('function saveSourceDialog'))
    expect(action).toContain('addRegistryView.value?.editServer(key.slice(7))')
    expect(action).not.toContain('showRegistry.value = true')
    expect(source).toContain('<ServerRegistry ref="addRegistryView" form-only')
    expect(action).toContain("addRegistryView.value?.openIconManager(key.slice(7))")
    expect(action).toContain("endpointServerId.value = key.slice(7)")
  })
  it('uses separate provider artwork, including custom-icon fallback, instead of rack icons', () => {
    const source = read('views/UnifiedMediaLibraryView.vue')
    expect(source).not.toContain('<Server ')
    expect(source).not.toContain('icon: Server')
    expect(source.match(/<MediaServerIcon /g)?.length).toBeGreaterThanOrEqual(4)
    expect(source).toContain('.file-source-art :deep(img.media-server-provider-icon) { position: static; inset: auto; object-fit: contain; border-radius: 0 }')
    const icon = read('components/media-server/MediaServerIcon.vue')
    for (const provider of ['emby', 'jellyfin', 'plex']) expect(icon).toContain(`assets/media-server/${provider}.svg`)
    expect(icon).toContain('props.server.customIconUrl || providerIcon.value')
    expect(icon).toContain('@error="failedCustomIcon = true"')
  })
  it.each(['views/UnifiedMediaLibraryView.vue', 'components/media-server/MediaServerIcon.vue', 'components/media-server/MediaServerEndpointsModal.vue', 'components/media-server/MediaServerRegistryPanel.vue'])('compiles %s', path => {
    const { descriptor } = parse(read(path))
    const script = compileScript(descriptor, { id: path })
    expect(compileTemplate({ source: descriptor.template!.content, filename: path, id: path, compilerOptions: { bindingMetadata: script.bindings } }).errors).toEqual([])
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, nextTick } from 'vue'
import * as Vue from 'vue'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import UnifiedHomeManagement from '../../components/UnifiedHomeManagement.vue'
import useCategoryPlacement from '../../store/categoryPlacement'
import useUnifiedHomePreferences, { UNIFIED_HOME_PREFERENCES_KEY } from '../../store/unifiedHomePreferences'
import { undiscoveredHomeIDs, newlyVisibleServerFavoriteIDs, defaultHomeSettings, FIXED_HOME_MENU_IDS, withFixedHomeMenus, homeMenuTitle, isHomeItemEnabled, mergeHomeOrder, moveHomeItem, visibleHomeItems, visibleHomeSections, type HomeManagementItem } from '../unifiedHomeManagement'

const items: HomeManagementItem[] = [
  { id: 'sources', title: '收藏夹', sourceId: 'local', available: true },
  { id: 'a:42', title: '最新电影', sourceId: 'a', sourceTitle: 'Emby A', available: true },
  { id: 'b:42', title: '最新电影', sourceId: 'b', sourceTitle: 'Emby B', available: true },
  { id: 'a:next', title: '即将播放', sourceId: 'a', available: false },
  { id: 'local:movies:group:test', title: '子分类', sourceId: 'local', available: true, child: true }
]

it('deduplicates series and keeps shortcut favorites separate from favorite media', () => {
  const series = { id: 'custom-series', title: '系列', sourceId: 'local', available: true }
  const shortcuts = { ...series, id: 'sources', title: '收藏夹' }
  const menus = withFixedHomeMenus([series, shortcuts, series, { ...shortcuts, id: 'local:favorites' }])
  const settings = { ...defaultHomeSettings(), order: ['custom-series', 'custom-series', 'sources', 'local:favorites'] }
  expect(menus.map(item => item.id)).toEqual(['custom-series', 'sources'])
  expect(visibleHomeItems(menus, settings).map(item => item.id)).toEqual(['custom-series', 'sources'])
  expect(visibleHomeSections(menus, settings)).toHaveLength(2)
})

describe('unified home management settings', () => {
  it.each([
    ['custom-series', 'custom-series:selected', 'custom-series:new'],
    ['custom-series', 'catalog:series/selected', 'catalog:series/new'],
    ['local:genres', 'local:genres:group:selected', 'local:genres:group:new']
  ])('keeps selected children of hidden %s visible without opting in new children', (parentId, childId, newChildId) => {
    const parent = { id: parentId, title: 'Parent', sourceId: 'local', available: true }
    const selected = { ...parent, id: childId, title: 'Selected', child: childId.includes(':group:'), optIn: true }
    const discovered = { ...selected, id: newChildId, title: 'New' }
    const catalog = [parent, selected, discovered]
    const settings = { ...defaultHomeSettings(), order: [childId, parentId], hidden: [parentId] }
    const reloaded = JSON.parse(JSON.stringify({ ...settings, order: mergeHomeOrder(settings.order, catalog) }))

    expect(isHomeItemEnabled(parent, reloaded)).toBe(false)
    expect(isHomeItemEnabled(selected, reloaded)).toBe(true)
    expect(isHomeItemEnabled(discovered, reloaded)).toBe(false)
    expect(visibleHomeItems(catalog, reloaded)).toEqual([selected])
    expect(visibleHomeSections(catalog, reloaded)).toEqual([selected])
    expect(reloaded.order).not.toContain(newChildId)
    expect(visibleHomeItems(catalog, { ...reloaded, hidden: [...reloaded.hidden, childId] })).toEqual([])
  })

  it('uses one default and saved order before and after opening management', () => {
    const catalog = withFixedHomeMenus([
      { id: 'music', title: 'Music', sourceId: 'local', available: true },
      ...items
    ])
    for (const order of [[], ['b:42', 'music', 'a:42']]) {
      const settings = { ...defaultHomeSettings(), order }
      const draft = { ...settings, order: mergeHomeOrder(order, catalog) }
      expect(visibleHomeSections(catalog, settings)).toEqual(visibleHomeItems(catalog, settings))
      expect(visibleHomeItems(catalog, draft)).toEqual(visibleHomeItems(catalog, settings))
    }
  })

  it('enables catalog categories and leaf groups only when explicitly selected', () => {
    const catalog: HomeManagementItem[] = [
      { id: 'catalog:tv/recent', title: 'Recent TV', sourceId: 'local', available: true, optIn: true },
      items[4]
    ]
    expect(visibleHomeItems(catalog, defaultHomeSettings())).toEqual([])
    expect(mergeHomeOrder([], catalog)).toEqual([])
    expect(visibleHomeItems(catalog, { ...defaultHomeSettings(), order: catalog.map(item => item.id) })).toEqual(catalog)
  })
  it('shows music without tracks and still allows hiding it', () => {
    const menus = withFixedHomeMenus([{ id: 'music', title: '音乐', sourceId: 'local', available: false }])
    expect(visibleHomeItems(menus, defaultHomeSettings()).map(item => item.id)).toEqual(['music'])
    expect(visibleHomeItems(menus, { ...defaultHomeSettings(), hidden: ['music'] })).toEqual([])
  })
  it('puts servers after all local sidebar menus and source shortcuts first on home', () => {
    const mixed = withFixedHomeMenus([
      ...items,
      { id: 'books', title: 'Books', sourceId: 'local', available: true },
      { id: 'local:years', title: 'Years', sourceId: 'local', available: true }
    ])
    expect(visibleHomeItems(mixed, defaultHomeSettings()).map(item => item.id)).toEqual(['sources', 'books', 'local:years', 'a:42', 'b:42'])
    expect(visibleHomeSections(mixed, defaultHomeSettings())[0].id).toBe('sources')
    const custom = { ...defaultHomeSettings(), order: ['b:42', 'books', 'sources'] }
    expect(visibleHomeSections(mixed, custom).slice(0, 3).map(item => item.id)).toEqual(custom.order)
    expect(visibleHomeSections(mixed, { ...defaultHomeSettings(), hidden: ['sources'] }).some(item => item.id === 'sources')).toBe(false)
  })
  it('keeps all eight default menus visible without content and respects management hiding', () => {
    const empty = FIXED_HOME_MENU_IDS.map(id => ({ id, title: id, sourceId: 'local', available: false }))
    const menus = withFixedHomeMenus([...items, ...empty.reverse()])
    expect(visibleHomeItems(menus, defaultHomeSettings()).filter(item => item.id !== 'sources').slice(0, FIXED_HOME_MENU_IDS.length).map(item => item.id)).toEqual(FIXED_HOME_MENU_IDS)
    const settings = { ...defaultHomeSettings(), hidden: ['local:movies', 'local:daily'] }
    expect(visibleHomeItems(menus, settings).map(item => item.id)).not.toContain('local:movies')
    expect(visibleHomeItems(menus, settings).map(item => item.id)).not.toContain('local:daily')
    expect(empty.every(item => !item.available)).toBe(true)
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    const cache = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => cache.get(key) || null, setItem: (key: string, value: string) => cache.set(key, value) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the same visible ordered items for normal management and home navigation', () => {
    const settings = { ...defaultHomeSettings(), order: ['b:42', 'sources', 'a:42'], hidden: ['a:42'] }
    expect(visibleHomeItems(items, settings).map(item => item.id)).toEqual(['b:42', 'sources'])
    expect(items).toHaveLength(5)
  })

  it('does not confuse identical library IDs on different servers', () => {
    const settings = { ...defaultHomeSettings(), hidden: ['a:42'], titles: { 'b:42': '自定义名称' } }
    expect(visibleHomeItems(items, settings).map(item => item.id)).toEqual(['sources', 'b:42'])
    expect(homeMenuTitle(items[2], settings)).toBe('自定义名称 - Emby B')
  })

  it('moves only visible rows, preserving hidden or temporarily offline rows', () => {
    const settings = { ...defaultHomeSettings(), order: ['sources', 'a:42', 'b:42', 'offline:42'], hidden: ['b:42'] }
    const moved = moveHomeItem(settings, ['sources', 'a:42'], 'a:42', 'sources')
    expect(moved.order).toEqual(['a:42', 'sources', 'b:42', 'offline:42'])
    expect(moved.hidden).toEqual(['b:42'])
    expect(moveHomeItem(settings, ['sources', 'a:42'], 'missing', 'sources')).toBe(settings)
  })

  it('merges late-loading server libraries without discarding prior edits', () => {
    expect(mergeHomeOrder(['b:42', 'offline:42'], items)).toEqual(['b:42', 'offline:42', 'sources', 'a:42', 'a:next'])
  })

  it('persists order, visibility and aliases through the placement authority', async () => {
    const preferences = useUnifiedHomePreferences()
    await useCategoryPlacement().applyHome({ order: ['b:42', 'sources'], hidden: ['a:42'], titles: { 'b:42': '自定义名称' } })
    expect(JSON.parse(localStorage.getItem(UNIFIED_HOME_PREFERENCES_KEY)!)).toEqual({ order: ['b:42', 'sources'], hidden: ['a:42'], titles: { 'b:42': '自定义名称' } })
    setActivePinia(createPinia())
    const reloaded = useUnifiedHomePreferences()
    const placement = useCategoryPlacement()
    placement.ensureLoaded()
    expect(reloaded).not.toHaveProperty('apply')
    expect(reloaded).not.toHaveProperty('rename')
    expect(reloaded).not.toHaveProperty('restoreOrder')
    expect(reloaded.hidden).toEqual(['a:42'])
    await placement.renameHome('a:42', '  新名称  ')
    expect(reloaded.hidden).toEqual(['a:42'])
    expect(reloaded.order).toEqual(['b:42', 'sources'])
    await placement.restoreOrder()
    expect(reloaded.order).toEqual([])
    expect(reloaded.hidden).toEqual([])
    expect(reloaded.titles).toEqual({ 'b:42': '自定义名称', 'a:42': '新名称' })
  })

  it('recovers from malformed saved settings', () => {
    localStorage.setItem(UNIFIED_HOME_PREFERENCES_KEY, '{broken')
    const preferences = useUnifiedHomePreferences()
    preferences.ensureLoaded()
    expect(preferences.order).toEqual([])
  })
})

// A lightweight Vue host exercises the real component without launching Electron
// or opening/modifying the user's existing profile.
interface Node { type: string; text: string; children: Node[]; props: Record<string, any>; parent?: Node }
const node = (type: string, text = ''): Node => ({ type, text, children: [], props: {} })
const renderer = createRenderer<Node, Node>({
  createElement: type => node(type), createText: text => node('text', text), createComment: text => node('comment', text),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(child); else parent.children.splice(index, 0, child)
  },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1) },
  setText(child, text) { child.text = text }, setElementText(child, text) { child.text = text; child.children = [] },
  parentNode: child => child.parent || null,
  nextSibling: child => child.parent?.children[child.parent.children.indexOf(child) + 1] || null,
  patchProp(element, key, _old, value) { element.props[key] = value }
})
const flatten = (root: Node): Node[] => [root, ...root.children.flatMap(flatten)]
const text = (root: Node): string => root.text + root.children.map(text).join('')

it('opens sorting first, then editing shows every server, including unavailable/hidden sections', async () => {
  const root = node('root')
  const save = vi.fn()
  const close = vi.fn()
  const filename = resolve(process.cwd(), 'src/components/UnifiedHomeManagement.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const compiled = compileTemplate({ filename, id: 'home-management-test', source: descriptor.template!.content, compilerOptions: { mode: 'function', bindingMetadata: compileScript(descriptor, { id: 'home-management-test' }).bindings } })
  expect(compiled.errors).toEqual([])
  // Vitest's Node transform supplies SSR setup; compile the same template for
  // this custom client renderer, and provide its harmless SSR bookkeeping.
  const render = new Function('Vue', compiled.code)(Vue)
  const app = renderer.createApp({ ...UnifiedHomeManagement, render }, {
    items, settings: { ...defaultHomeSettings(), hidden: ['b:42'] },
    groups: [{ id: 'a', title: 'Emby A', nodes: [items[1], items[3]].map(item => ({ id: item.id, title: item.title, item, children: item.id === 'a:next' ? [{ id: items[4].id, title: items[4].title, item: items[4] }] : [] })) }, { id: 'b', title: 'Emby B', nodes: [{ id: items[2].id, title: items[2].title, item: items[2] }] }],
    onSave: save, onClose: close
  })
  app.provide(Vue.ssrContextKey, { modules: new Set() })
  app.component('a-modal', { render: () => null })
  app.component('a-input', { render: () => null })
  app.mount(root)
  expect(flatten(root).filter(item => item.props.class === 'management-row')).toHaveLength(2)
  expect(flatten(root).filter(item => item.type === 'h3')).toHaveLength(1)
  // Exercise the actual pointer handlers: move previews, release persists,
  // cancellation restores the original order without saving.
  const listeners = new Map<string, Function>()
  const ghost = { style: {}, querySelector: () => null, removeAttribute: vi.fn(), setAttribute: vi.fn(), remove: vi.fn() }
  const scroll = {
    setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 0, bottom: 200 }),
    querySelectorAll: () => ['sources', 'a:42'].map((id, index) => ({ dataset: { sortId: id }, getBoundingClientRect: () => ({ top: index * 52, height: 52 }) }))
  }
  const row = { closest: () => scroll, getBoundingClientRect: () => ({ top: 0, left: 0, width: 600, height: 52 }), cloneNode: () => ghost }
  const handle = { closest: () => row, setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
  vi.stubGlobal('window', { addEventListener: (name: string, fn: Function) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) })
  vi.stubGlobal('document', { body: { appendChild: vi.fn() } })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  try {
    const grip = flatten(root).find(item => String(item.props.class).includes('reorder-handle'))!
    const down = () => grip.props.onPointerdown({ button: 0, pointerId: 1, clientY: 26, currentTarget: handle, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    down()
    listeners.get('pointermove')!({ pointerId: 1, clientY: 80 })
    expect(save).not.toHaveBeenCalled()
    listeners.get('pointercancel')!()
    expect(save).not.toHaveBeenCalled()
    const secondGrip = flatten(root).filter(item => String(item.props.class).includes('reorder-handle'))[1]
    secondGrip.props.onPointerdown({ button: 0, pointerId: 1, clientY: 78, currentTarget: handle, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    listeners.get('pointermove')!({ pointerId: 1, clientY: 26 })
    await nextTick()
    expect(flatten(root).filter(item => item.props['data-sort-id']).map(item => item.props['data-sort-id'])).toEqual(['a:42', 'sources'])
    listeners.get('pointercancel')!()
    expect(save).not.toHaveBeenCalled()
    down()
    listeners.get('pointermove')!({ pointerId: 1, clientY: 80 })
    listeners.get('pointerup')!({ pointerId: 1 })
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][0].order.slice(0, 2)).toEqual(['a:42', 'sources'])
    expect(scroll.setPointerCapture).toHaveBeenCalledWith(1)
    expect(handle.setPointerCapture).not.toHaveBeenCalled()
    expect(ghost.remove).toHaveBeenCalledTimes(3)
    expect(listeners.size).toBe(0)
    save.mockClear()
  } finally { vi.unstubAllGlobals() }
  flatten(root).find(item => item.type === 'button' && item.props.class === 'edit')!.props.onClick()
  await nextTick()
  expect(flatten(root).filter(item => item.type === 'h3').map(text)).toContain('Emby A')
  expect(flatten(root).filter(item => item.type === 'h3').map(text)).toContain('Emby B')
  expect(text(root)).toContain('即将播放')
  flatten(root).find(item => item.type === 'button' && item.props.class === 'node-title' && text(item) === '即将播放')!.props.onClick()
  await nextTick()
  expect(flatten(root).find(item => item.type === 'h2') && text(flatten(root).find(item => item.type === 'h2')!)).toBe('即将播放')
  expect(text(root)).toContain('子分类')
  flatten(root).find(item => item.type === 'button' && item.props.class === 'circle')!.props.onClick()
  await nextTick()
  const toggles = flatten(root).filter(item => item.type === 'button' && String(item.props.class).includes('visibility'))
  const rowCount = flatten(root).filter(item => item.props.class === 'management-row').length
  toggles[0].props.onClick()
  await nextTick()
  expect(flatten(root).filter(item => item.props.class === 'management-row')).toHaveLength(rowCount - 1)
  toggles.at(-1)!.props.onClick()
  await nextTick()
  flatten(root).find(item => item.type === 'button' && String(item.props.class).includes('confirm'))!.props.onClick()
  expect(save.mock.calls[0][0].hidden).not.toContain('b:42')
  expect(close).toHaveBeenCalledOnce()
  app.unmount()
})

it('does not offer source-add actions in the sidebar or open registry from the home toolbar', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/views/UnifiedMediaLibraryView.vue'), 'utf8')
  const sidebar = source.split('<aside')[1].split('</aside>')[0]
  expect(sidebar).not.toContain('@click="addServer"')
  expect(sidebar).not.toContain('@click="addFolder"')
  expect(source).toContain('data-testid="unified-manage-home"')
  expect(source).toContain('@click="showHomeManagement = true"')
  expect(source).toContain(':items="homeItems" :groups="managementGroups"')
  expect(source).toContain('v-for="item in visibleHomeMenu"')
})


describe('placement changes preserve loaded Home data', () => {
  it('does not request data when adding local shelves or reordering existing remote favorites', () => {
    const previous = ['sources', 'a:server-favorites:movies', 'b:server-favorites:tv']
    const next = ['b:server-favorites:tv', 'catalog:tv/genres/Drama', 'sources', 'a:server-favorites:movies']
    expect(newlyVisibleServerFavoriteIDs(next, previous)).toEqual([])
  })
  it('requests only newly enabled remote favorites, without reloading siblings', () => {
    expect(newlyVisibleServerFavoriteIDs(
      ['a:server-favorites:movies', 'a:server-favorites:tv', 'a:server-favorites:tv', 'catalog:movies'],
      ['a:server-favorites:movies']
    )).toEqual(['a:server-favorites:tv'])
  })
  it('does not reload data for removed remote favorites', () => {
    expect(newlyVisibleServerFavoriteIDs(['sources'], ['sources', 'a:server-favorites:movies'])).toEqual([])
  })
})


it('preserves localized synthetic titles after saving the Home order', () => {
  const known = [
    { id: 'sources', title: '收藏夹', sourceId: 'local', available: true },
    { id: 'custom-series', title: '系列', sourceId: 'local', available: true }
  ]
  const order = ['sources', 'custom-series', 'catalog:movies/networks', 'resume', 'source:video']
  const fallback = undiscoveredHomeIDs(order, []).map(id => ({ id, title: id, sourceId: 'local', available: true }))
  const menus = withFixedHomeMenus([...known, ...fallback])
  expect(menus.find(item => item.id === 'sources')?.title).toBe('收藏夹')
  expect(menus.find(item => item.id === 'custom-series')?.title).toBe('系列')
  expect(fallback.map(item => item.id)).toEqual(['catalog:movies/networks'])
})

it('opens an empty metadata category and updates its children while it stays open', async () => {
  const root = node('root')
  const item = { id: 'catalog:movies/networks', title: '按网络', sourceId: 'local', available: true }
  const groups = Vue.reactive([{ id: 'local', title: '媒体库', nodes: [{ id: item.id, title: item.title, item, expandable: true,
    children: [] as Array<{ id: string; title: string; item: HomeManagementItem }> }] }])
  const filename = resolve(process.cwd(), 'src/components/UnifiedHomeManagement.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const compiled = compileTemplate({ filename, id: 'empty-category-test', source: descriptor.template!.content,
    compilerOptions: { mode: 'function', bindingMetadata: compileScript(descriptor, { id: 'empty-category-test' }).bindings } })
  expect(compiled.errors).toEqual([])
  const render = new Function('Vue', compiled.code)(Vue)
  const app = renderer.createApp({ ...UnifiedHomeManagement, render }, { items: [item], groups, settings: defaultHomeSettings() })
  app.provide(Vue.ssrContextKey, { modules: new Set() })
  app.component('a-modal', { render: () => null }); app.component('a-input', { render: () => null })
  app.mount(root)
  try {
    flatten(root).find(item => item.type === 'button' && item.props.class === 'edit')!.props.onClick()
    await nextTick()
    flatten(root).find(item => item.type === 'button' && item.props.class === 'node-title' && text(item) === '按网络')!.props.onClick()
    await nextTick()
    expect(flatten(root).some(item => item.props.role === 'status')).toBe(true)
    const child = { ...item, id: item.id + '/Netflix', title: 'Netflix' }
    groups[0].nodes[0].children.push({ id: child.id, title: child.title, item: child })
    await nextTick()
    expect(flatten(root).some(item => item.props.role === 'status')).toBe(false)
    expect(text(root)).toContain('Netflix')
  } finally { app.unmount() }
})

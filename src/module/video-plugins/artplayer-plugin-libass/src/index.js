import LibassAdapter from './adapter'

export default function artplayerPluginLibass(option) {
  return (art) => {
    const adapter = new LibassAdapter(art, option)
    return {
      name: 'artplayerPluginLibass',
      libass: adapter.libass,
      visible: adapter.visible,
      init: adapter.init.bind(adapter),
      resize: adapter.resize.bind(adapter),
      switch: adapter.switch.bind(adapter),
      show: adapter.show.bind(adapter),
      hide: adapter.hide.bind(adapter),
      destroy: adapter.destroy.bind(adapter)
    }
  }
}

if (typeof window !== 'undefined') {
  window['artplayerPluginLibass'] = artplayerPluginLibass
}

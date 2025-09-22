import JASSUB from 'jassub'
import JASSUBWorker from 'jassub/dist/jassub-worker.js?url'
import JASSUBWorkerWasm from 'jassub/dist/jassub-worker.wasm?url'

const defaultAssSubtitle = `[Script Info]\nScriptType: v4.00+`

export default class LibassAdapter {
  constructor(art, option) {
    const { constructor, template } = art

    this.art = art
    this.$video = template.$video
    this.$webvtt = template.$subtitle
    this.utils = constructor.utils

    this.libass = null

    art.once('ready', this.init.bind(this, option))
  }

  async init(option) {
    this.#checkWebAssemblySupport()

    await this.#createLibass(option)

    this.#addEventListeners()

    this.art.emit('artplayerPluginLibass:init', this)

    // set initial subtitle
    const initialSubtitle = this.art?.option?.subtitle?.url || this.art?.subtitle?.url
    if (initialSubtitle) {
      this.switch(initialSubtitle)
    }
  }

  switch(url) {
    this.art.emit('artplayerPluginLibass:switch', url)
    if (this.#isAbsoluteUrl(url) && this.utils.getExt(url) === 'ass') {
      this.libass.freeTrack()
      this.libass.setTrackByUrl(this.#toAbsoluteUrl(url))
      this.currentType = 'ass'
      this.visible = this.art.subtitle.show
    } else if (url.startsWith('blob:')) {
      fetch(url)
        .then(res => res.text())
        .then((text) => {
          URL.revokeObjectURL(url)
          if (text.includes('Script Info')) {
            this.libass.freeTrack()
            this.libass.setTrack(text)
            this.currentType = 'ass'
            this.visible = this.art.subtitle.show
          } else {
            this.currentType = 'webvtt'
            this.hide()
            this.libass.freeTrack()
          }
        })
    } else {
      this.currentType = 'webvtt'
      this.hide()
      this.libass.freeTrack()
    }
  }

  setVisibility(visible) {
    this.visible = visible
  }

  setOffset(offset) {
    this.timeOffset = offset
  }

  get active() {
    return this.currentType === 'ass'
  }

  get visible() {
    if (!this.libass)
      return false

    return this.libass.canvas.style.display !== 'none'
  }

  set visible(visible) {
    this.art.emit('artplayerPluginLibass:visible', visible)

    this.#setVttVisible(!this.active)

    if (this.libass.canvas) {
      this.libass.canvas.style.display = visible ? 'block' : 'none'
      if (visible) this.libass.resize()
    }
  }

  get timeOffset() {
    return this.libass.timeOffset
  }

  set timeOffset(offset) {
    this.art.emit('artplayerPluginLibass:timeOffset', offset)
    this.libass.timeOffset = offset
  }

  show() {
    this.visible = true
  }

  hide() {
    this.visible = false
  }

  destroy() {
    this.art.emit('artplayerPluginLibass:destroy')

    this.#removeEventListeners()

    this.libass.destroy()
    this.libass = null
  }

  resize() {
    this.art.emit('artplayerPluginLibass:resize')
    this.libass.resize()
  }

  async #createLibass(option = {}) {
    if (!option.workerUrl) {
      option.workerUrl = JASSUBWorker
    }
    if (!option.wasmUrl) {
      option.wasmUrl = JASSUBWorkerWasm
    }
    if (option.availableFonts) {
      option.availableFonts = Object
        .entries(option.availableFonts)
        .reduce((acc, [key, value]) => {
          acc[key] = this.#toAbsoluteUrl(value)
          return acc
        }, {})
    }
    this.libass = new JASSUB({
      subContent: defaultAssSubtitle,
      video: this.$video,
      canvas: this.#createCanvas(),
      ...option,
      fallbackFont: '微软雅黑',
      fonts: option.fonts?.map((font) => this.#toAbsoluteUrl(font))
    })
  }

  #createCanvas() {
    let canvasParent = document.createElement('div')
    canvasParent.className = 'artplayer-plugin-libass'
    canvasParent.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            user-select: none;
            pointer-events: none;
            z-index: 20;`
    let canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    canvasParent.appendChild(canvas)
    this.$video.insertAdjacentElement('afterend', canvasParent)
    return canvas
  }

  #addEventListeners() {
    this.art.on('subtitle', this.switch.bind(this))
    this.art.on('subtitleLoad', this.setVisibility.bind(this))
    this.art.on('subtitleOffset', this.setOffset.bind(this))
    this.art.on('resize', this.resize.bind(this))
    this.art.once('destroy', this.destroy.bind(this))
  }

  #removeEventListeners() {
    this.art.off('subtitle', this.switch)
    this.art.off('subtitleLoad', this.setVisibility)
    this.art.off('subtitleOffset', this.setOffset)
    this.art.off('resize', this.resize)
  }

  #setVttVisible(visible) {
    this.$webvtt.style.visibility = visible ? 'visible' : 'hidden'
  }

  #toAbsoluteUrl(url) {
    if (this.#isAbsoluteUrl(url))
      return url
    // handle absolute URL when the `Worker` of `BLOB` type loading network resources
    return new URL(url, import.meta.url).toString()
  }

  #isAbsoluteUrl(url) {
    return /^https?:\/\//.test(url)
  }

  #blobToText(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve('')
      reader.readAsText(blob)
    })
  }

  #checkWebAssemblySupport() {
    let supportsWebAssembly = false
    try {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
        const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        if (module instanceof WebAssembly.Module)
          supportsWebAssembly = (new WebAssembly.Instance(module) instanceof WebAssembly.Instance)
      }
    } catch (e) {
      //
    }

    this.utils.errorHandle(supportsWebAssembly, 'Browser does not support WebAssembly')
  }
}

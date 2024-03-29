import { UniversalDanmuParseFromSearch, UniversalDanmuParseFromUrl } from './danmuParse'
import getDanmuTop from './getDanmuTop'

export default class Danmuku {
  constructor(art, option) {
    const { constructor, template } = art

    this.utils = constructor.utils
    this.validator = constructor.validator
    this.$danmuku = template.$danmuku
    this.$player = template.$player

    this.art = art
    this.danmus = []
    this.queue = []
    this.option = art.storage.get('danmuku') || {}
    this.$refs = []
    this.isStop = false
    this.isHide = this.option ? this.option.hide : true
    this.timer = null
    this.config(option)

    if (this.option.useWorker) {
      try {
        this.worker = new Worker(new URL('./worker.js', import.meta.url))
      } catch (error) {
        //
      }
    }

    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.reset = this.reset.bind(this)
    this.destroy = this.destroy.bind(this)

    art.on('video:play', this.start)
    art.on('video:playing', this.start)
    art.on('video:pause', this.stop)
    art.on('video:waiting', this.stop)
    art.on('video:seeked', this.reset)
    // art.on('resize', this.reset)
    art.on('destroy', this.destroy)

    if (!this.isHide) {
      this.load()
    }
  }

  static get option () {
    return {
      danmuku: [],
      hide: true,
      speed: 13.5,
      margin: [10, '75%'],
      opacity: 1,
      color: '#FFFFFF',
      mode: 0,
      fontSize: 20,
      antiOverlap: true,
      useWorker: true,
      synchronousPlayback: false,
      sourceType: 'auto',
      matchType: 'folder',
      matchEsp: 'auto',
    }
  }

  static get scheme () {
    return {
      danmuku: 'array|function|string',
      hide: 'boolean',
      speed: 'number',
      margin: 'array',
      opacity: 'number',
      color: 'string',
      mode: 'number',
      fontSize: 'number|string',
      antiOverlap: 'boolean',
      useWorker: 'boolean',
      synchronousPlayback: 'boolean',
      sourceType: 'string',
      matchType: 'string',
      matchEsp: 'number|string'
    }
  }

  get isRotate () {
    return this.art.plugins.autoOrientation && this.art.plugins.autoOrientation.state
  }

  get marginTop () {
    const { clamp } = this.utils
    const value = this.option.margin[0]
    const { clientHeight } = this.$player

    if (typeof value === 'number') {
      return clamp(value, 0, clientHeight)
    }

    if (typeof value === 'string' && value.endsWith('%')) {
      const ratio = parseFloat(value) / 100
      return clamp(clientHeight * ratio, 0, clientHeight)
    }

    return Danmuku.option.margin[0]
  }

  get marginBottom () {
    const { clamp } = this.utils
    const value = this.option.margin[1]
    const { clientHeight } = this.$player

    if (typeof value === 'number') {
      return clamp(value, 0, clientHeight)
    }

    if (typeof value === 'string' && value.endsWith('%')) {
      const ratio = parseFloat(value) / 100
      return clamp(clientHeight * ratio, 0, clientHeight)
    }

    return Danmuku.option.margin[1]
  }

  filter (state, callback) {
    return this.queue.filter((danmu) => danmu.$state === state).map(callback)
  }

  getLeft ($ref) {
    const rect = $ref.getBoundingClientRect()
    return this.isRotate ? rect.top : rect.left
  }

  getRef () {
    const $refCache = this.$refs.pop()
    if ($refCache) return $refCache

    const $ref = document.createElement('div')

    $ref.style.cssText = `
            user-select: none;
            position: absolute;
            white-space: pre;
            pointer-events: none;
            perspective: 500px;
            display: inline-block;
            will-change: transform;
            font-weight: normal;
            line-height: 1.125;
            visibility: hidden;
            font-family: SimHei, "Microsoft JhengHei", Arial, Helvetica, sans-serif;
            text-shadow: rgb(0, 0, 0) 1px 0px 1px, rgb(0, 0, 0) 0px 1px 1px, rgb(0, 0, 0) 0px -1px 1px, rgb(0, 0, 0) -1px 0px 1px;
        `

    return $ref
  }

  getReady () {
    const { currentTime } = this.art
    return this.queue.filter((danmu) => {
      return (
        danmu.$state === 'ready' ||
        (danmu.$state === 'wait'
          && currentTime + 0.1 >= danmu.time
          && danmu.time >= currentTime - 0.1)
      )
    })
  }

  getEmits () {
    const result = []
    const { clientWidth } = this.$player
    const clientLeft = this.getLeft(this.$player)

    this.filter('emit', (danmu) => {
      const top = danmu.$ref.offsetTop
      const left = this.getLeft(danmu.$ref) - clientLeft
      const height = danmu.$ref.clientHeight
      const width = danmu.$ref.clientWidth
      const distance = left + width
      const right = clientWidth - distance
      const speed = distance / danmu.$restTime

      result.push({
        top, left,
        height, width,
        right, speed, distance,
        time: danmu.$restTime,
        mode: danmu.mode
      })
    })

    return result
  }

  getFontSize (fontSize) {
    const { clamp } = this.utils
    const { clientHeight } = this.$player

    if (typeof fontSize === 'number') {
      return clamp(fontSize, 12, clientHeight)
    }

    if (typeof fontSize === 'string' && fontSize.endsWith('%')) {
      const ratio = parseFloat(fontSize) / 100
      return clamp(clientHeight * ratio, 12, clientHeight)
    }

    return Danmuku.option.fontSize
  }

  postMessage (message = {}) {
    return new Promise((resolve) => {
      if (this.option.useWorker && this.worker && this.worker.postMessage) {
        message.id = Date.now()
        this.worker.postMessage(message)
        this.worker.onmessage = (event) => {
          const { data } = event
          if (data.id === message.id) {
            resolve(data)
          }
        }
      } else {
        const top = getDanmuTop(message)
        resolve({ top })
      }
    })
  }

  async load () {
    try {
      if (typeof this.option.danmuku === 'function') {
        this.danmus = await this.option.danmuku(this.option)
      } else if (typeof this.option.danmuku.then === 'function') {
        this.danmus = await this.option.danmuku
      } else if (typeof this.option.danmuku === 'string') {
        this.danmus = await UniversalDanmuParseFromUrl(this.option.danmuku, this.option)
      } else {
        this.danmus = this.option.danmuku
      }
      if (typeof this.danmus === 'string') {
        this.danmus = await UniversalDanmuParseFromUrl(this.danmus, this.option)
      } else if ('name' in this.danmus) {
        if (!this.danmus.pos) {
          return this
        }
        if (typeof this.option.matchEsp === 'number') {
          this.danmus.pos = this.option.matchEsp
        }
        this.danmus = await UniversalDanmuParseFromSearch(this.danmus, this.option)
      }
      if (!Array.isArray(this.danmus)) {
        if (this.option.sourceType === 'search') {
          this.art.notice.show = '未输入搜索的关键词'
        } else if (this.option.sourceType === 'input') {
          this.art.notice.show = '未输入解析的网址'
        } else {
          this.art.notice.show = '未找到相关弹幕'
        }
        return this
      }
      this.art.emit('artplayerPluginDanmuku:loaded', this.danmus)
      this.queue = []
      this.$danmuku.innerText = ''
      this.danmus.forEach((danmu) => this.emit(danmu))
    } catch (error) {
      console.log('error', error)
      this.art.emit('artplayerPluginDanmuku:error', error)
      this.art.notice.show = '未找到相关弹幕'
    }
    return this
  }

  config (option) {
    const { clamp } = this.utils

    this.option = Object.assign({}, Danmuku.option, this.option, option)

    this.validator(this.option, Danmuku.scheme)

    if (option.speed) {
      this.option.speed = clamp(this.option.speed, 1, 16)
      this.reset()
    }
    this.option.opacity = clamp(this.option.opacity, 0, 1)

    if (option.fontSize) {
      this.option.fontSize = this.getFontSize(this.option.fontSize)
      this.reset()
    }

    if (option.sourceType || option.matchType || option.matchEsp) {
      this.reset()
      this.load()
    }
    this.art.emit('artplayerPluginDanmuku:config', this.option)
    this.art.storage.set('danmuku', this.option)
    return this
  }

  makeWait (danmu) {
    danmu.$state = 'wait'
    if (danmu.$ref) {
      danmu.$ref.style.visibility = 'hidden'
      danmu.$ref.style.marginLeft = '0px'
      danmu.$ref.style.transform = 'translateX(0px)'
      danmu.$ref.style.transition = 'transform 0s linear 0s'
      this.$refs.push(danmu.$ref)
      danmu.$ref = null
    }
  }

  continue () {
    const { clientWidth } = this.$player
    this.filter('stop', (danmu) => {
      danmu.$state = 'emit'
      danmu.$lastStartTime = Date.now()
      switch (danmu.mode) {
        case 0: {
          const translateX = clientWidth + danmu.$ref.clientWidth
          danmu.$ref.style.transform = `translateX(${-translateX}px)`
          danmu.$ref.style.transition = `transform ${danmu.$restTime}s linear 0s`
          break
        }
        default:
          break
      }
    })

    return this
  }

  suspend () {
    const { clientWidth } = this.$player
    this.filter('emit', (danmu) => {
      danmu.$state = 'stop'
      switch (danmu.mode) {
        case 0: {
          const translateX = clientWidth - (this.getLeft(danmu.$ref) - this.getLeft(this.$player))
          danmu.$ref.style.transform = `translateX(${-translateX}px)`
          danmu.$ref.style.transition = 'transform 0s linear 0s'
          break
        }
        default:
          break
      }
    })

    return this
  }

  reset () {
    this.queue.forEach((danmu) => this.makeWait(danmu))
    return this
  }

  update () {
    this.timer = window.requestAnimationFrame(async () => {
      if (this.art.playing && !this.isHide) {
        this.filter('emit', (danmu) => {
          const emitTime = (Date.now() - danmu.$lastStartTime) / 1000
          danmu.$restTime -= emitTime
          danmu.$lastStartTime = Date.now()
          if (danmu.$restTime <= 0) {
            this.makeWait(danmu)
          }
        })

        const readys = this.getReady()
        const { clientWidth, clientHeight } = this.$player
        for (let index = 0; index < readys.length; index++) {
          const danmu = readys[index]
          danmu.$ref = this.getRef()
          danmu.$ref.innerText = danmu.text
          this.$danmuku.appendChild(danmu.$ref)

          danmu.$ref.style.left = `${clientWidth}px`
          danmu.$ref.style.opacity = this.option.opacity
          danmu.$ref.style.fontSize = `${this.option.fontSize}px`
          danmu.$ref.style.color = danmu.color
          danmu.$ref.style.border = danmu.border ? `1px solid ${danmu.color}` : null
          danmu.$ref.style.backgroundColor = danmu.border ? 'rgb(0 0 0 / 50%)' : null
          danmu.$ref.style.marginLeft = '0px'

          danmu.$lastStartTime = Date.now()
          danmu.$restTime =
            this.option.synchronousPlayback && this.art.playbackRate
              ? this.option.speed / Number(this.art.playbackRate)
              : this.option.speed

          const target = {
            mode: danmu.mode,
            height: danmu.$ref.clientHeight,
            speed: (clientWidth + danmu.$ref.clientWidth) / danmu.$restTime
          }

          const { top } = await this.postMessage({
            target,
            emits: this.getEmits(),
            antiOverlap: this.option.antiOverlap,
            clientWidth: clientWidth,
            clientHeight: clientHeight,
            marginBottom: this.marginBottom,
            marginTop: this.marginTop
          })

          if (danmu.$ref) {
            if (!this.isStop && top !== undefined) {
              danmu.$state = 'emit'
              danmu.$ref.style.visibility = 'visible'

              switch (danmu.mode) {
                case 0: {
                  danmu.$ref.style.top = `${top}px`
                  const translateX = clientWidth + danmu.$ref.clientWidth
                  danmu.$ref.style.transform = `translateX(${-translateX}px)`
                  danmu.$ref.style.transition = `transform ${danmu.$restTime}s linear 0s`
                  break
                }
                case 1:
                  danmu.$ref.style.left = '50%'
                  danmu.$ref.style.top = `${top}px`
                  danmu.$ref.style.marginLeft = `-${danmu.$ref.clientWidth / 2}px`
                  break
                default:
                  break
              }
            } else {
              danmu.$state = 'ready'
              this.$refs.push(danmu.$ref)
              danmu.$ref = null
            }
          }
        }
      }

      if (!this.isStop) {
        this.update()
      }
    })
    return this
  }

  stop () {
    this.isStop = true
    this.suspend()
    window.cancelAnimationFrame(this.timer)
    this.art.emit('artplayerPluginDanmuku:stop')
    return this
  }

  start () {
    this.isStop = false
    this.continue()
    this.update()
    this.art.emit('artplayerPluginDanmuku:start')
    return this
  }

  show () {
    this.isHide = false
    this.config({ hide: false })
    if (this.danmus.length === 0) {
      this.load()
    }
    this.start()
    this.$danmuku.style.display = 'block'
    this.art.emit('artplayerPluginDanmuku:show')
    return this
  }

  hide () {
    this.isHide = true
    this.config({ hide: true })
    this.stop()
    this.queue.forEach((item) => this.makeWait(item))
    this.$danmuku.style.display = 'none'
    this.art.emit('artplayerPluginDanmuku:hide')
    return this
  }

  emit (danmu) {
    this.validator(danmu, {
      text: 'string',
      mode: 'number|undefined',
      color: 'string|undefined',
      time: 'number|undefined',
      border: 'boolean|undefined'
    })

    if (!danmu.text.trim()) return this
    if (danmu.time) {
      danmu.time = this.utils.clamp(danmu.time, 0, Infinity)
    } else {
      danmu.time = this.art.currentTime + 0.5
    }
    if (danmu.mode === undefined) {
      danmu.mode = this.option.mode
    }
    if (danmu.color === undefined) {
      danmu.color = this.option.color
    }

    this.queue.push({
      ...danmu,
      $state: 'wait',
      $ref: null,
      $restTime: 0,
      $lastStartTime: 0
    })

    return this
  }

  destroy () {
    this.stop()
    if (this.worker && this.worker.terminate) this.worker.terminate()
    this.art.off('video:play', this.start)
    this.art.off('video:playing', this.start)
    this.art.off('video:pause', this.stop)
    this.art.off('video:waiting', this.stop)
    this.art.off('video:seeked', this.reset)
    // this.art.off('resize', this.reset)
    this.art.off('destroy', this.destroy)
    this.art.emit('artplayerPluginDanmuku:destroy')
  }
}

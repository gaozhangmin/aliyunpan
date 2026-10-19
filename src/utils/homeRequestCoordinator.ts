import type { MediaServerConfig } from '../types/mediaServer'

/** One scheduler for directory, resume and independently addressable Home shelves. */
export class HomeRequestCoordinator {
  private active = 0
  private bySource = new Map<string, number>()
  private queue: { source: string; signal: AbortSignal; start: (admitted: boolean) => void }[] = []
  private controllers = new Map<string, { source: string; controller: AbortController }>()
  private pending = new Map<string, Promise<unknown>>()
  private cache = new Map<string, { at: number; value: unknown }>()
  private generations = new Map<string, number>()
  private versions = new Map<string, string>()

  private version(config: MediaServerConfig): string {
    return JSON.stringify([config.type, config.baseUrl, config.userId, config.username, config.accessToken])
  }

  reconcile(configs: MediaServerConfig[]) {
    const current = new Map(configs.map(config => [config.id, this.version(config)]))
    for (const [source, version] of this.versions) {
      if (current.get(source) === version) continue
      this.cancelSource(source)
      this.versions.delete(source)
    }
  }

  private cancelSource(source: string) {
    this.generations.set(source, (this.generations.get(source) || 0) + 1)
    for (const entry of this.controllers.values()) if (entry.source === source) entry.controller.abort()
    const obsolete = this.queue.filter(job => job.source === source)
    this.queue = this.queue.filter(job => job.source !== source)
    for (const job of obsolete) job.start(false)
    for (const key of this.cache.keys()) if (key.startsWith(source + '|')) this.cache.delete(key)
  }

  isCurrent(config: MediaServerConfig): boolean { return this.versions.get(config.id) === this.version(config) }

  run<T>(config: MediaServerConfig, resource: string, force: boolean, load: (signal: AbortSignal) => Promise<T>, ttl = 60_000): Promise<T> {
    const version = this.version(config)
    const previous = this.versions.get(config.id)
    if (previous !== version) {
      this.cancelSource(config.id)
      this.versions.set(config.id, version)
      for (const key of this.cache.keys()) if (key.startsWith(config.id + '|')) this.cache.delete(key)
    }
    const key = config.id + '|' + version + '|' + resource + '|' + (this.generations.get(config.id) || 0)
    const pending = this.pending.get(key)
    if (pending) return pending as Promise<T>
    const cached = this.cache.get(key)
    if (!force && cached && Date.now() - cached.at < ttl) return Promise.resolve(cached.value as T)
    const controller = new AbortController()
    const signal = controller.signal
    this.controllers.set(key, { source: config.id, controller })
    const result = (async () => {
      const admitted = await new Promise<boolean>(resolve => { this.queue.push({ source: config.id, signal, start: resolve }); this.drain() })
      try {
        if (!admitted || signal.aborted) throw new DOMException('Superseded Home request', 'AbortError')
        if (this.versions.get(config.id) !== version) throw new Error('Superseded Home request')
        const value = await load(signal)
        if (signal.aborted) throw new DOMException('Superseded Home request', 'AbortError')
        if (this.versions.get(config.id) !== version) throw new Error('Superseded Home request')
        this.cache.set(key, { at: Date.now(), value }) // An empty result is still loaded.
        if (this.cache.size > 256) for (const [id, entry] of this.cache) if (Date.now() - entry.at >= 300_000) this.cache.delete(id)
        return value
      } finally {
        if (admitted) {
          this.active--
          this.bySource.set(config.id, (this.bySource.get(config.id) || 1) - 1)
        }
        this.controllers.delete(key)
        this.pending.delete(key)
        this.drain()
      }
    })()
    this.pending.set(key, result)
    return result
  }

  private drain() {
    while (this.active < 4) {
      const index = this.queue.findIndex(job => (this.bySource.get(job.source) || 0) < 2)
      if (index < 0) return
      const [job] = this.queue.splice(index, 1)
      this.active++
      this.bySource.set(job.source, (this.bySource.get(job.source) || 0) + 1)
      job.start(true)
    }
  }
}

export const homeRequests = new HomeRequestCoordinator()

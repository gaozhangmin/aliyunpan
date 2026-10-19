import { describe, expect, it, vi } from 'vitest'
import { HomeRequestCoordinator } from '../homeRequestCoordinator'
import type { MediaServerConfig } from '../../types/mediaServer'

const server = (id = 'one'): MediaServerConfig => ({ id, name: id, type: 'jellyfin', baseUrl: 'https://example.invalid', createdAt: 0, updatedAt: 0 })
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }

describe('Home request isolation', () => {
  it('joins repeated clicks and caches a successful empty shelf', async () => {
    const requests = new HomeRequestCoordinator()
    const gate = deferred<string[]>()
    const load = vi.fn(() => gate.promise)
    const first = requests.run(server(), 'shelf:A', true, load)
    const second = requests.run(server(), 'shelf:A', true, load)
    expect(second).toBe(first)
    await tick()
    expect(load).toHaveBeenCalledTimes(1)
    gate.resolve([])
    expect(await first).toEqual([])
    expect(await requests.run(server(), 'shelf:A', false, load)).toEqual([])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('retrying failed A leaves B and resume cached', async () => {
    const requests = new HomeRequestCoordinator()
    const b = vi.fn(async () => ['B'])
    const resume = vi.fn(async () => ['resume'])
    const a = vi.fn<() => Promise<string[]>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(['A'])
    await Promise.all([requests.run(server(), 'shelf:B', false, b), requests.run(server(), 'resume', false, resume)])
    await expect(requests.run(server(), 'shelf:A', false, a)).rejects.toThrow('offline')
    expect(await requests.run(server(), 'shelf:A', true, a)).toEqual(['A'])
    expect(await requests.run(server(), 'shelf:B', false, b)).toEqual(['B'])
    expect(await requests.run(server(), 'resume', false, resume)).toEqual(['resume'])
    expect(b).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('limits global concurrency to four and each source to two, releasing failed slots', async () => {
    const requests = new HomeRequestCoordinator()
    const gates = Array.from({ length: 6 }, () => deferred<string[]>())
    const loads = gates.map(gate => vi.fn(() => gate.promise))
    const pending = loads.map((load, index) => requests.run(server(index < 3 ? 'one' : 'two'), 'shelf:' + index, false, load))
    const settled = Promise.allSettled(pending)
    await tick()
    expect(loads.map(load => load.mock.calls.length)).toEqual([1, 1, 0, 1, 1, 0])
    gates[0].reject(new Error('offline'))
    await tick()
    expect(loads[2]).toHaveBeenCalledTimes(1)
    gates[3].resolve([])
    await tick()
    expect(loads[5]).toHaveBeenCalledTimes(1)
    gates.forEach(gate => gate.resolve([]))
    expect((await settled).filter(result => result.status === 'rejected')).toHaveLength(1)
  })

  it('rejects an old configuration response without replacing the new snapshot', async () => {
    const requests = new HomeRequestCoordinator()
    const oldConfig = server()
    const newConfig = { ...oldConfig, accessToken: 'replacement-test-token' }
    const oldResponse = deferred<string[]>()
    const old = requests.run(oldConfig, 'shelf:A', false, () => oldResponse.promise)
    const rejected = expect(old).rejects.toThrow('Superseded')
    await tick()
    expect(await requests.run(newConfig, 'shelf:A', false, async () => ['new'])).toEqual(['new'])
    oldResponse.resolve(['old'])
    await rejected
    expect(requests.isCurrent(oldConfig)).toBe(false)
    const fallback = vi.fn(async () => ['unexpected'])
    expect(await requests.run(newConfig, 'shelf:A', false, fallback)).toEqual(['new'])
    expect(fallback).not.toHaveBeenCalled()
  })

  it('fetches again after expiry without clearing another resource', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    try {
      const requests = new HomeRequestCoordinator()
      const load = vi.fn(async () => ['A'])
      await requests.run(server(), 'shelf:A', false, load)
      now.mockReturnValue(62_000)
      await requests.run(server(), 'shelf:A', false, load)
      expect(load).toHaveBeenCalledTimes(2)
    } finally { now.mockRestore() }
  })
  it('aborts active HTTP and removes queued work when a source disappears', async () => {
    const requests = new HomeRequestCoordinator()
    const signals: AbortSignal[] = []
    const load = vi.fn((signal: AbortSignal) => new Promise<string[]>((_, reject) => {
      signals.push(signal)
      signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true })
    }))
    const old = [0, 1, 2].map(i => requests.run(server(), 'shelf:' + i, false, load))
    const settled = Promise.allSettled(old)
    await tick()
    expect(load).toHaveBeenCalledTimes(2)
    requests.reconcile([server('other')])
    expect(signals.every(signal => signal.aborted)).toBe(true)
    expect((await settled).every(result => result.status === 'rejected')).toBe(true)
    expect(await requests.run(server('other'), 'catalog', false, async () => ['new'])).toEqual(['new'])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('does not join a cancelled request when credentials change back quickly', async () => {
    const requests = new HomeRequestCoordinator()
    const config = server()
    const slow = deferred<string[]>()
    const first = requests.run(config, 'catalog', false, () => slow.promise)
    const rejected = expect(first).rejects.toThrow('Superseded')
    await tick()
    requests.reconcile([{ ...config, accessToken: 'changed' }])
    const latest = requests.run(config, 'catalog', false, async () => ['latest'])
    expect(latest).not.toBe(first)
    expect(await latest).toEqual(['latest'])
    slow.resolve(['obsolete'])
    await rejected
    expect(await requests.run(config, 'catalog', false, async () => ['wrong'])).toEqual(['latest'])
  })

})

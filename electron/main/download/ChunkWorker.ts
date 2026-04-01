// electron/main/download/ChunkWorker.ts
// Runs inside a worker_threads Worker — no Electron APIs, Node.js built-ins only.
import { parentPort, workerData } from 'worker_threads'
import https from 'https'
import http from 'http'
import fs from 'fs'
import type { ChunkWorkerData, ChunkWorkerMessage, ChunkWorkerCommand } from './types'

const cfg: ChunkWorkerData = workerData

let shouldStop = false
let pendingThrottleMs = 0

parentPort!.on('message', (cmd: ChunkWorkerCommand) => {
  if (cmd.type === 'stop')     shouldStop = true
  if (cmd.type === 'throttle') pendingThrottleMs = Math.max(pendingThrottleMs, cmd.delayMs)
})

function run(): Promise<void> {
  const resumeFrom = cfg.start + cfg.written

  // Chunk already complete (resume scenario where this chunk was fully written before)
  if (resumeFrom > cfg.end) {
    parentPort!.postMessage({ type: 'done', chunkIndex: cfg.chunkIndex } satisfies ChunkWorkerMessage)
    return Promise.resolve()
  }

  const headers: Record<string, string> = {
    ...cfg.headers,
    'Range': `bytes=${resumeFrom}-${cfg.end}`
  }

  const protocol = cfg.url.startsWith('https') ? https : http
  // Open in r+ (read+write) so we can write at arbitrary byte positions
  const fd = fs.openSync(cfg.filePath, 'r+')
  let writeOffset = resumeFrom
  let localWritten = cfg.written

  return new Promise<void>((resolve, reject) => {
    // Guard against double-settlement (end+close both fire on normal completion)
    let settled = false
    function settle(fn: () => void) {
      if (settled) return
      settled = true
      try { fs.closeSync(fd) } catch {}
      fn()
    }

    const req = protocol.get(cfg.url, { headers }, (res) => {
      // 206 = Partial Content (Range OK), 200 = server ignored Range header (fallback)
      if (res.statusCode !== 206 && res.statusCode !== 200) {
        settle(() => reject(new Error(`HTTP ${res.statusCode}`)))
        return
      }

      res.on('data', (chunk: Buffer) => {
        if (shouldStop) {
          req.destroy()
          return
        }

        // Pause stream immediately so we control when the next chunk arrives
        res.pause()

        fs.writeSync(fd, chunk, 0, chunk.length, writeOffset)
        writeOffset += chunk.length
        localWritten += chunk.length

        parentPort!.postMessage({
          type: 'progress',
          chunkIndex: cfg.chunkIndex,
          written: localWritten
        } satisfies ChunkWorkerMessage)

        // Apply speed throttle requested by main thread, then resume
        const delay = pendingThrottleMs
        pendingThrottleMs = 0
        if (delay > 0) {
          setTimeout(() => { if (!shouldStop) res.resume() }, delay)
        } else {
          res.resume()
        }
      })

      res.on('end', () => {
        settle(() => {
          parentPort!.postMessage({ type: 'done', chunkIndex: cfg.chunkIndex } satisfies ChunkWorkerMessage)
          resolve()
        })
      })

      // 'close' fires when the TCP connection closes. For a clean HTTP completion,
      // 'end' fires first (settling the promise), then 'close' is a no-op.
      // If the connection drops before HTTP end (e.g. CDN URL expiry, network error),
      // only 'close' fires — we must detect and report this case, otherwise the worker
      // hangs silently and the download stalls indefinitely.
      res.on('close', () => {
        settle(() => {
          if (shouldStop) {
            // Intentional stop — worker exits cleanly without reporting an error
            resolve()
          } else {
            reject(new Error(`Connection closed before response completed (received ${writeOffset - resumeFrom} of ${cfg.end - resumeFrom + 1} bytes)`))
          }
        })
      })

      res.on('error', err => {
        settle(() => reject(err))
      })
    })

    req.setTimeout(30_000, () => req.destroy(new Error('Request timeout')))
    req.on('error', err => {
      settle(() => reject(err))
    })
  })
}

run().catch(err => {
  parentPort!.postMessage({
    type: 'error',
    chunkIndex: cfg.chunkIndex,
    message: String(err.message ?? err)
  } satisfies ChunkWorkerMessage)
})

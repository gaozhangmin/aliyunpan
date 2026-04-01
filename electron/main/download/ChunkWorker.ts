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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run(): Promise<void> {
  const resumeFrom = cfg.start + cfg.written

  // Chunk already complete (resume scenario where this chunk was fully written before)
  if (resumeFrom > cfg.end) {
    parentPort!.postMessage({ type: 'done', chunkIndex: cfg.chunkIndex } satisfies ChunkWorkerMessage)
    return
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
    const req = protocol.get(cfg.url, { headers }, (res) => {
      // 206 = Partial Content (Range OK), 200 = server ignored Range header (fallback)
      if (res.statusCode !== 206 && res.statusCode !== 200) {
        try { fs.closeSync(fd) } catch {}
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }

      res.on('data', async (chunk: Buffer) => {
        if (shouldStop) {
          req.destroy()
          return
        }

        // Apply speed throttle requested by main thread
        if (pendingThrottleMs > 0) {
          const delay = pendingThrottleMs
          pendingThrottleMs = 0
          res.pause()
          await sleep(delay)
          if (shouldStop) { req.destroy(); return }
          res.resume()
        }

        fs.writeSync(fd, chunk, 0, chunk.length, writeOffset)
        writeOffset += chunk.length
        localWritten += chunk.length

        parentPort!.postMessage({
          type: 'progress',
          chunkIndex: cfg.chunkIndex,
          written: localWritten
        } satisfies ChunkWorkerMessage)
      })

      res.on('end', () => {
        try { fs.closeSync(fd) } catch {}
        parentPort!.postMessage({ type: 'done', chunkIndex: cfg.chunkIndex } satisfies ChunkWorkerMessage)
        resolve()
      })

      res.on('error', err => {
        try { fs.closeSync(fd) } catch {}
        reject(err)
      })
    })

    req.setTimeout(30_000, () => req.destroy(new Error('Request timeout')))
    req.on('error', err => {
      try { fs.closeSync(fd) } catch {}
      reject(err)
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

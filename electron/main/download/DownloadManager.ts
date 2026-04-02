// electron/main/download/DownloadManager.ts
import { Worker } from 'worker_threads'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { EventEmitter } from 'events'
import type {
  DownloadTask, DownloadMeta, DownloadChunk,
  ChunkWorkerMessage, DownloadProgress
} from './types'
import { StateStore } from './StateStore'
import { SpeedLimiter } from './SpeedLimiter'

const WORKER_PATH = path.join(__dirname, 'ChunkWorker.js')
const PROGRESS_INTERVAL_MS = 2000

export class DownloadManager extends EventEmitter {
  private tasks = new Map<string, DownloadTask>()
  // gid → (chunkIndex → Worker)
  private chunkWorkers = new Map<string, Map<number, Worker>>()
  // gid → Set of chunkIndices that have sent 'done'
  private doneChunks = new Map<string, Set<number>>()
  private limiter = new SpeedLimiter(0)
  private progressTimer: ReturnType<typeof setInterval> | null = null
  private speedSnapshot = new Map<string, { completed: number; time: number }>()
  // gid → totalSize, kept until frontend confirms completion via download:remove
  private completedTasks = new Map<string, number>()

  constructor() {
    super()
    this.progressTimer = setInterval(() => this.flushProgress(), PROGRESS_INTERVAL_MS)
  }

  // ─── Public API ──────────────────────────────────────────────────

  setGlobalSpeed(bytesPerSec: number): void {
    this.limiter.setRate(bytesPerSec)
  }

  async add(params: {
    gid: string
    user_id: string; drive_id: string; file_id: string; encType: string
    url: string
    headers: Record<string, string>
    savePath: string
    fileName: string
    fileSize: number
    split: number
  }): Promise<void> {
    const { gid, url, headers, savePath, fileName, fileSize, split } = params

    // If task exists in paused or error state, resume it with the (possibly refreshed) URL
    if (this.tasks.has(gid)) {
      const existing = this.tasks.get(gid)!
      if (existing.state === 'paused' || existing.state === 'error') {
        existing.headers = headers
        existing.errorMessage = ''
        this.doneChunks.set(gid, new Set())
        this.chunkWorkers.set(gid, new Map())
        this.speedSnapshot.set(gid, { completed: existing.completedLength, time: Date.now() })
        this.spawnWorkers(existing, url)
      }
      return
    }

    const filePath  = path.join(savePath, fileName + '.td')
    const metaPath  = path.join(savePath, fileName + '.td.json')
    const finalPath = path.join(savePath, fileName)

    // Already fully downloaded
    if (fs.existsSync(finalPath)) {
      try {
        if (fs.statSync(finalPath).size === fileSize) {
          this.emit('completed', gid)
          return
        }
      } catch {}
    }

    // Resume or new download
    let meta = StateStore.read(metaPath)

    if (!meta) {
      const rangeOk = fileSize > 0 ? await this.probeRange(url, headers) : false
      const nChunks  = rangeOk && split > 1 ? split : 1
      const chunkSz  = Math.ceil(fileSize / nChunks)

      const chunks: DownloadChunk[] = Array.from({ length: nChunks }, (_, i) => ({
        start:   i * chunkSz,
        end:     Math.min((i + 1) * chunkSz - 1, fileSize - 1),
        written: 0
      }))

      meta = {
        gid,
        user_id:  params.user_id,
        drive_id: params.drive_id,
        file_id:  params.file_id,
        encType:  params.encType,
        totalSize: fileSize,
        rangeSupported: rangeOk,
        chunks
      }

      // Ensure save directory exists before creating files
      fs.mkdirSync(savePath, { recursive: true })

      // Pre-allocate the .td file so workers can write at any byte offset
      if (fileSize > 0) {
        const fd = fs.openSync(filePath, 'w')
        fs.ftruncateSync(fd, fileSize)
        fs.closeSync(fd)
      } else {
        fs.writeFileSync(filePath, '')
      }

      StateStore.write(metaPath, meta)
    }

    const completedLength = meta.chunks.reduce((s, c) => s + c.written, 0)

    const task: DownloadTask = {
      gid, meta, filePath, metaPath, finalPath, headers,
      state: 'waiting', completedLength, speed: 0, errorMessage: ''
    }

    this.tasks.set(gid, task)
    this.doneChunks.set(gid, new Set())
    this.chunkWorkers.set(gid, new Map())
    this.speedSnapshot.set(gid, { completed: completedLength, time: Date.now() })

    this.spawnWorkers(task, url)
  }

  pause(gids: string[]): void {
    for (const gid of gids) {
      const task = this.tasks.get(gid)
      if (!task || task.state !== 'downloading') continue
      task.state = 'paused'
      for (const w of (this.chunkWorkers.get(gid) ?? new Map()).values()) {
        w.postMessage({ type: 'stop' })
      }
      this.chunkWorkers.set(gid, new Map())
      StateStore.write(task.metaPath, task.meta)
    }
  }

  remove(gids: string[]): void {
    for (const gid of gids) {
      this.completedTasks.delete(gid)  // clear any completed-but-unacknowledged entry
      const task = this.tasks.get(gid)
      for (const w of (this.chunkWorkers.get(gid) ?? new Map()).values()) {
        w.postMessage({ type: 'stop' })
      }
      this.chunkWorkers.delete(gid)
      this.doneChunks.delete(gid)
      this.speedSnapshot.delete(gid)
      if (task) {
        try { fs.unlinkSync(task.filePath) } catch {}
        StateStore.delete(task.metaPath)
        this.tasks.delete(gid)
      }
    }
  }

  list(): DownloadProgress[] {
    const active = Array.from(this.tasks.values()).map(t => ({
      gid:             t.gid,
      status:          t.state === 'downloading' ? 'active' : t.state,
      totalLength:     String(t.meta.totalSize),
      completedLength: String(t.completedLength),
      downloadSpeed:   String(t.speed),
      errorCode:       t.state === 'error' ? '22' : '0',
      errorMessage:    t.errorMessage
    }))
    // Include recently-completed tasks so the frontend can see status='complete'
    // and mark them done. They stay here until download:remove is called.
    const done = Array.from(this.completedTasks.entries()).map(([gid, totalSize]) => ({
      gid,
      status:          'complete',
      totalLength:     String(totalSize),
      completedLength: String(totalSize),
      downloadSpeed:   '0',
      errorCode:       '0',
      errorMessage:    ''
    }))
    return [...active, ...done]
  }

  destroy(): void {
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null }
    for (const gid of [...this.tasks.keys()]) this.pause([gid])
  }

  // ─── Internal ────────────────────────────────────────────────────

  private spawnWorkers(task: DownloadTask, url: string): void {
    task.state = 'downloading'

    const pending = task.meta.chunks
      .map((c, i) => ({ ...c, i }))
      .filter(c => c.written < c.end - c.start + 1)

    console.log(`[DLMgr] spawnWorkers gid=${task.gid.slice(0,8)}  totalChunks=${task.meta.chunks.length}  pendingChunks=${pending.length}`)
    task.meta.chunks.forEach((c, i) => {
      console.log(`[DLMgr]   chunk[${i}]  start=${c.start}  end=${c.end}  written=${c.written}  size=${c.end - c.start + 1}`)
    })

    if (pending.length === 0) {
      this.finishTask(task)
      return
    }

    const workers = this.chunkWorkers.get(task.gid)!

    for (const chunk of pending) {
      const w = new Worker(WORKER_PATH, {
        workerData: {
          url,
          headers:    task.headers,
          filePath:   task.filePath,
          chunkIndex: chunk.i,
          start:      chunk.start,
          end:        chunk.end,
          written:    chunk.written
        }
      })

      workers.set(chunk.i, w)

      w.on('message', (msg: ChunkWorkerMessage) => this.onWorkerMessage(task, msg))
      w.on('error',   (err: Error)              => this.onWorkerError(task, err))
      w.on('exit',    (code: number)             => {
        console.log(`[DLMgr] worker exit  gid=${task.gid.slice(0,8)}  chunk=${chunk.i}  code=${code}  taskState=${task.state}`)
        workers.delete(chunk.i)
      })
    }
  }

  private onWorkerMessage(task: DownloadTask, msg: ChunkWorkerMessage): void {
    if (msg.type === 'progress') {
      const prev  = task.meta.chunks[msg.chunkIndex].written
      const delta = msg.written - prev
      task.meta.chunks[msg.chunkIndex].written = msg.written
      task.completedLength += delta

      // Speed limiting: tell this worker to sleep if over the limit
      const sleepMs = this.limiter.consume(delta)
      if (sleepMs > 0) {
        this.chunkWorkers.get(task.gid)?.get(msg.chunkIndex)
          ?.postMessage({ type: 'throttle', delayMs: sleepMs })
      }
      return
    }

    if (msg.type === 'done') {
      this.doneChunks.get(task.gid)?.add(msg.chunkIndex)
      const doneSet = this.doneChunks.get(task.gid)
      const allDone = task.meta.chunks.every(
        (c, i) =>
          doneSet?.has(i) ||
          c.written >= c.end - c.start + 1
      )
      console.log(`[DLMgr] worker DONE  gid=${task.gid.slice(0,8)}  chunk=${msg.chunkIndex}  doneSet=[${[...(doneSet??[])].join(',')}]  allDone=${allDone}`)
      task.meta.chunks.forEach((c, i) => {
        console.log(`[DLMgr]   chunk[${i}] written=${c.written}/${c.end - c.start + 1}  complete=${c.written >= c.end - c.start + 1}`)
      })
      if (allDone) this.finishTask(task)
      return
    }

    if (msg.type === 'error') {
      console.log(`[DLMgr] worker ERROR  gid=${task.gid.slice(0,8)}  chunk=${msg.chunkIndex}  msg=${msg.message}`)
      task.state = 'error'
      task.errorMessage = msg.message
      StateStore.write(task.metaPath, task.meta)
      this.emit('error', task.gid, msg.message)
    }
  }

  private onWorkerError(task: DownloadTask, err: Error): void {
    console.log(`[DLMgr] onWorkerError  gid=${task.gid.slice(0,8)}  err=${err.message}`)
    task.state = 'error'
    task.errorMessage = err.message
    StateStore.write(task.metaPath, task.meta)
    this.emit('error', task.gid, err.message)
  }

  private finishTask(task: DownloadTask): void {
    StateStore.write(task.metaPath, task.meta)
    try {
      fs.renameSync(task.filePath, task.finalPath)
      StateStore.delete(task.metaPath)
    } catch (err: any) {
      task.state = 'error'
      task.errorMessage = `Rename failed: ${err.message}`
      this.emit('error', task.gid, task.errorMessage)
      return
    }
    this.completedTasks.set(task.gid, task.meta.totalSize)
    this.tasks.delete(task.gid)
    this.chunkWorkers.delete(task.gid)
    this.doneChunks.delete(task.gid)
    this.speedSnapshot.delete(task.gid)
    console.log(`[DLMgr] finishTask complete  gid=${task.gid.slice(0,8)}  totalSize=${task.meta.totalSize}`)
    this.emit('completed', task.gid)
  }

  private flushProgress(): void {
    const now = Date.now()
    for (const [gid, task] of this.tasks) {
      if (task.state !== 'downloading') continue
      const snap = this.speedSnapshot.get(gid) ?? { completed: 0, time: now }
      const elapsed = (now - snap.time) / 1000
      task.speed = elapsed > 0 ? Math.round((task.completedLength - snap.completed) / elapsed) : 0
      this.speedSnapshot.set(gid, { completed: task.completedLength, time: now })
      StateStore.write(task.metaPath, task.meta)
    }
  }

  private probeRange(url: string, headers: Record<string, string>): Promise<boolean> {
    return new Promise(resolve => {
      const protocol = url.startsWith('https') ? https : http
      const req = protocol.request(
        url,
        { method: 'HEAD', headers: { ...headers, 'Range': 'bytes=0-0' } },
        res => {
          const ok = res.statusCode === 206 || res.headers['accept-ranges'] === 'bytes'
          res.resume()
          resolve(ok)
        }
      )
      req.setTimeout(8000, () => { req.destroy(); resolve(false) })
      req.on('error', () => resolve(false))
      req.end()
    })
  }
}

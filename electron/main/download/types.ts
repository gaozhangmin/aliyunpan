// electron/main/download/types.ts

export interface DownloadChunk {
  start: number   // byte offset (inclusive) from start of file
  end: number     // byte offset (inclusive) end
  written: number // bytes written so far for this chunk
}

export interface DownloadMeta {
  gid: string
  user_id: string
  drive_id: string
  file_id: string
  encType: string
  totalSize: number
  rangeSupported: boolean
  chunks: DownloadChunk[]
}

export interface DownloadTask {
  gid: string
  meta: DownloadMeta
  filePath: string   // absolute path to .td temp file
  metaPath: string   // absolute path to .td.json sidecar
  finalPath: string  // absolute path to final file (no .td suffix)
  headers: Record<string, string>
  state: 'waiting' | 'downloading' | 'paused' | 'error'
  completedLength: number  // sum of all chunks' written values
  speed: number            // bytes/sec (computed every 2 s)
  errorMessage: string
}

// Messages sent from ChunkWorker → main thread
export type ChunkWorkerMessage =
  | { type: 'progress'; chunkIndex: number; written: number }
  | { type: 'done';     chunkIndex: number }
  | { type: 'error';    chunkIndex: number; message: string }

// Commands sent from main thread → ChunkWorker
export type ChunkWorkerCommand =
  | { type: 'throttle'; delayMs: number }
  | { type: 'stop' }

export interface ChunkWorkerData {
  url: string
  headers: Record<string, string>
  filePath: string
  chunkIndex: number
  start: number
  end: number
  written: number  // bytes already written (resume offset within chunk)
}

// Shape returned by download:list IPC (matches IAriaDownProgress in DownDAL)
export interface DownloadProgress {
  gid: string
  status: string
  totalLength: string
  completedLength: string
  downloadSpeed: string
  errorCode: string
  errorMessage: string
}

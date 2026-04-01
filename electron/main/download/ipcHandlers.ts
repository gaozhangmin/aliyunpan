// electron/main/download/ipcHandlers.ts
import { ipcMain } from 'electron'
import { DownloadManager } from './DownloadManager'
import { StateStore } from './StateStore'

let manager: DownloadManager | null = null

export function createDownloadManager(): DownloadManager {
  if (manager) return manager
  manager = new DownloadManager()
  return manager
}

export function getDownloadManager(): DownloadManager {
  if (!manager) throw new Error('DownloadManager not initialized')
  return manager
}

/** Parse aria2-style speed string: "1024K", "5M", "0" → bytes/sec */
function parseSpeedLimit(limit: string): number {
  if (!limit || limit === '0') return 0
  const m = limit.match(/^(\d+)([KkMm]?)$/)
  if (!m) return 0
  const n = parseInt(m[1])
  const unit = m[2].toUpperCase()
  return unit === 'M' ? n * 1024 * 1024 : n * 1024
}

export function registerDownloadHandlers(): void {
  const mgr = createDownloadManager()

  // Prevent Node.js from throwing on unhandled 'error' events from the manager.
  // Worker errors are already recorded in task.state / task.errorMessage and
  // surfaced via the 'download:list' channel; no additional action needed here.
  mgr.on('error', (_gid: string, _message: string) => { /* handled via task state */ })

  // Add a file download (replaces aria2.addUri)
  ipcMain.handle('download:add', async (_event, params: {
    gid: string; user_id: string; drive_id: string; file_id: string; encType: string
    url: string; headers: Record<string, string>
    savePath: string; fileName: string; fileSize: number; split: number
  }) => {
    try {
      await mgr.add(params)
      return 'success'
    } catch (e: any) {
      return String(e.message ?? e)
    }
  })

  // Pause downloads (replaces aria2.forcePause)
  ipcMain.handle('download:pause', (_event, gids: string[]) => {
    mgr.pause(gids)
  })

  // Remove downloads (replaces aria2.forceRemove + removeDownloadResult)
  ipcMain.handle('download:remove', (_event, gids: string[]) => {
    mgr.remove(gids)
  })

  // List all downloads (replaces aria2.tellActive/Waiting/Stopped)
  ipcMain.handle('download:list', () => mgr.list())

  // Set global speed limit (replaces aria2.changeGlobalOption)
  ipcMain.handle('download:setSpeed', (_event, { limit }: { limit: string }) => {
    mgr.setGlobalSpeed(parseSpeedLimit(limit))
  })

  // Scan pending .td.json files in given directories (called at startup for resume)
  ipcMain.handle('download:scanPending', (_event, dirs: string[]) => {
    const pending: Array<{
      gid: string; file_id: string; drive_id: string; user_id: string; encType: string; metaPath: string
    }> = []
    for (const dir of dirs) {
      for (const { metaPath, meta } of StateStore.scanDirectory(dir)) {
        pending.push({
          gid:      meta.gid,
          file_id:  meta.file_id,
          drive_id: meta.drive_id,
          user_id:  meta.user_id,
          encType:  meta.encType,
          metaPath
        })
      }
    }
    return pending
  })
}

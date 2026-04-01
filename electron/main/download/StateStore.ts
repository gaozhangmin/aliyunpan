// electron/main/download/StateStore.ts
import fs from 'fs'
import path from 'path'
import { DownloadMeta } from './types'

export class StateStore {
  static read(metaPath: string): DownloadMeta | null {
    try {
      const content = fs.readFileSync(metaPath, 'utf-8')
      return JSON.parse(content) as DownloadMeta
    } catch {
      return null
    }
  }

  static write(metaPath: string, meta: DownloadMeta): void {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
  }

  static delete(metaPath: string): void {
    try { fs.unlinkSync(metaPath) } catch {}
  }

  static scanDirectory(dir: string): Array<{ metaPath: string; meta: DownloadMeta }> {
    const results: Array<{ metaPath: string; meta: DownloadMeta }> = []
    try {
      if (!fs.existsSync(dir)) return results
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.td.json')) continue
        const metaPath = path.join(dir, file)
        const meta = StateStore.read(metaPath)
        if (meta?.gid && Array.isArray(meta.chunks)) {
          results.push({ metaPath, meta })
        }
      }
    } catch {}
    return results
  }
}

// electron/main/mediaImageCache.ts
import { app, ipcMain, net, protocol } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

// ──────────────────────────────────────────────────────────────────
// 类型定义（内联，避免跨边界导入）
// ──────────────────────────────────────────────────────────────────
interface CachedServerConfig {
  id: string
  type: 'jellyfin' | 'emby' | 'plex'
  baseUrl: string
  accessToken?: string
  userId?: string
  deviceId?: string
}

// ──────────────────────────────────────────────────────────────────
// 内存中的服务器配置映射（由渲染进程通过 IPC 同步）
// ──────────────────────────────────────────────────────────────────
const serverConfigMap = new Map<string, CachedServerConfig>()

// ──────────────────────────────────────────────────────────────────
// 工具函数
// ──────────────────────────────────────────────────────────────────
function getCacheDir(serverId: string): string {
  return path.join(app.getPath('userData'), 'media-image-cache', serverId)
}

function ensureDirSync(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function sha256hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** base64url → 原始 URL（逆向 toMsCacheUrl 的编码） */
function decodeOriginalUrl(encoded: string): string {
  // 还原 base64url → base64，再 atob，再 decodeURIComponent
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const decoded = Buffer.from(padded, 'base64').toString()
  return decodeURIComponent(decoded)
}

const UA = 'BoxPlayer'

/** 构建鉴权请求头 */
function buildAuthHeaders(config: CachedServerConfig): Record<string, string> {
  const APP_NAME = 'XbyBoxPlayer'
  const APP_VERSION = '1.0.0'

  if (config.type === 'plex') {
    return {
      'X-Plex-Token': config.accessToken || '',
      'X-Plex-Product': APP_NAME,
      'X-Plex-Client-Identifier': config.deviceId || '',
      'User-Agent': UA
    }
  }

  const fields = [
    `Token="${config.accessToken || ''}"`,
    `UserId="${config.userId || ''}"`,
    `Client="${APP_NAME}"`,
    `Device="${APP_NAME}"`,
    `DeviceId="${config.deviceId || ''}"`,
    `Version="${APP_VERSION}"`
  ]
  const authValue = `MediaBrowser ${fields.join(', ')}`

  if (config.type === 'emby') {
    return {
      'X-Emby-Authorization': authValue,
      'X-Emby-Token': config.accessToken || '',
      'User-Agent': UA
    }
  }
  return { Authorization: authValue, 'User-Agent': UA }
}

/** 用 Electron net 模块拉取图片（与渲染进程共用 Chromium 网络栈，继承代理/TLS 能力） */
function fetchImage(
  url: string,
  headers: Record<string, string>
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'GET' })

    for (const [key, val] of Object.entries(headers)) {
      req.setHeader(key, val)
    }

    const timer = setTimeout(() => {
      req.abort()
      reject(new Error('Image fetch timeout'))
    }, 15000)

    req.on('response', (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        clearTimeout(timer)
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const contentType = ((res.headers['content-type'] as string) ?? 'image/jpeg')
        .split(';')[0]
        .trim()
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        clearTimeout(timer)
        resolve({ buffer: Buffer.concat(chunks), contentType })
      })
      res.on('error', (err: Error) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    req.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })

    req.end()
  })
}

// ──────────────────────────────────────────────────────────────────
// 协议注册（在 app.whenReady() 后调用）
// ──────────────────────────────────────────────────────────────────
export function registerMediaImageCacheProtocol(): void {
  protocol.registerBufferProtocol('mscache', (request, callback) => {
    void handleRequest(request.url).then(callback).catch(() => {
      callback({ data: Buffer.alloc(0), mimeType: 'image/jpeg' })
    })
  })
}

async function handleRequest(
  requestUrl: string
): Promise<{ data: Buffer; mimeType: string }> {
  // 解析 mscache://serverId/encodedUrl
  let parsed: URL
  try {
    parsed = new URL(requestUrl)
  } catch (e) {
    console.error('[mscache] URL parse failed:', requestUrl, e)
    return { data: Buffer.alloc(0), mimeType: 'image/jpeg' }
  }

  const serverId = parsed.hostname
  const encodedPart = parsed.pathname.replace(/^\//, '')

  if (!serverId || !encodedPart) {
    console.error('[mscache] Missing serverId or encodedPart. serverId:', serverId, 'encodedPart:', encodedPart)
    return { data: Buffer.alloc(0), mimeType: 'image/jpeg' }
  }

  let originalUrl: string
  try {
    originalUrl = decodeOriginalUrl(encodedPart)
  } catch (e) {
    console.error('[mscache] decodeOriginalUrl failed. encodedPart:', encodedPart, e)
    return { data: Buffer.alloc(0), mimeType: 'image/jpeg' }
  }

  const cacheDir = getCacheDir(serverId)
  const fileHash = sha256hex(originalUrl)
  const cachePath = path.join(cacheDir, `${fileHash}.cache`)
  const mimePath = path.join(cacheDir, `${fileHash}.cache.mime`)

  // 命中磁盘缓存
  if (existsSync(cachePath)) {
    try {
      const [data, mimeRaw] = await Promise.all([
        readFile(cachePath),
        existsSync(mimePath) ? readFile(mimePath, 'utf8') : Promise.resolve('image/jpeg')
      ])
      return { data, mimeType: mimeRaw.trim() || 'image/jpeg' }
    } catch {
      // 缓存文件损坏，继续走网络
    }
  }

  // 缓存未命中，拉取网络
  const config = serverConfigMap.get(serverId)
  if (!config) {
    console.error('[mscache] No config for serverId:', serverId, '  Available keys:', [...serverConfigMap.keys()])
    return { data: Buffer.alloc(0), mimeType: 'image/jpeg' }
  }

  let buffer: Buffer
  let contentType: string
  try {
    const isForbidUrl = originalUrl.includes('younoyes') || originalUrl.includes('onatoshi')
    const headers = isForbidUrl
      ? { ...buildAuthHeaders(config), 'User-Agent': 'SenPlayer' }
      : buildAuthHeaders(config)
    ;({ buffer, contentType } = await fetchImage(originalUrl, headers))
  } catch (e) {
    console.error('[mscache] fetchImage failed. url:', originalUrl, e)
    return { data: Buffer.alloc(0), mimeType: 'image/jpeg' }
  }

  // 写盘（失败不影响返回）
  try {
    ensureDirSync(cacheDir)
    await writeFile(cachePath, buffer)
    await writeFile(mimePath, contentType, 'utf8')
  } catch {
    // 写盘失败，忽略
  }

  return { data: buffer, mimeType: contentType }
}

// ──────────────────────────────────────────────────────────────────
// IPC 注册（在 handleEvents 中调用）
// ──────────────────────────────────────────────────────────────────
export function registerMediaImageCacheIpc(): void {
  // 渲染进程同步服务器配置
  ipcMain.on('MsImageCache:syncConfig', (_event, configs: CachedServerConfig[]) => {
    serverConfigMap.clear()
    for (const cfg of configs) {
      serverConfigMap.set(cfg.id, cfg)
    }
  })

  // 获取各服务器缓存统计
  ipcMain.handle('MsImageCache:stats', async () => {
    const rootDir = path.join(app.getPath('userData'), 'media-image-cache')
    if (!existsSync(rootDir)) {
      return { totalBytes: 0, servers: [] }
    }
    const serverDirs = await readdir(rootDir)
    const servers: { id: string; fileCount: number; bytes: number }[] = []
    let totalBytes = 0

    for (const id of serverDirs) {
      const dirPath = path.join(rootDir, id)
      try {
        const dirStat = await stat(dirPath)
        if (!dirStat.isDirectory()) continue
        const files = await readdir(dirPath)
        const cacheFiles = files.filter((f) => f.endsWith('.cache'))
        let bytes = 0
        for (const file of cacheFiles) {
          try {
            const s = await stat(path.join(dirPath, file))
            bytes += s.size
          } catch {
            // 单个文件统计失败，跳过
          }
        }
        servers.push({ id, fileCount: cacheFiles.length, bytes })
        totalBytes += bytes
      } catch {
        // 单个目录统计失败，跳过
      }
    }

    return { totalBytes, servers }
  })

  // 清理缓存
  ipcMain.handle('MsImageCache:clear', async (_event, payload?: { serverId?: string }) => {
    const rootDir = path.join(app.getPath('userData'), 'media-image-cache')
    if (!existsSync(rootDir)) return { cleared: 0 }

    const serverId = payload?.serverId
    let cleared = 0

    if (serverId) {
      // 清理单台服务器
      const targetDir = path.join(rootDir, serverId)
      if (existsSync(targetDir)) {
        const files = await readdir(targetDir)
        for (const file of files) {
          try {
            await rm(path.join(targetDir, file))
            cleared++
          } catch {
            // 单文件删除失败，继续
          }
        }
      }
    } else {
      // 清理全部
      const serverDirs = await readdir(rootDir)
      for (const id of serverDirs) {
        const dirPath = path.join(rootDir, id)
        try {
          const dirStat = await stat(dirPath)
          if (!dirStat.isDirectory()) continue
          const files = await readdir(dirPath)
          for (const file of files) {
            try {
              await rm(path.join(dirPath, file))
              cleared++
            } catch {
              // 单文件删除失败，继续
            }
          }
        } catch {
          // 单目录失败，继续
        }
      }
    }

    return { cleared }
  })
}

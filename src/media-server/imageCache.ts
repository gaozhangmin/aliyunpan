/**
 * 将原始图片 URL 转换为 mscache:// 协议 URL。
 * 如果 serverId 或 originalUrl 为空则原样返回原始 URL。
 */
export function toMsCacheUrl(serverId: string | undefined, originalUrl: string): string {
  if (!serverId || !originalUrl) return originalUrl
  // btoa 只接受 latin1，先用 encodeURIComponent 转义再 btoa
  const encoded = btoa(encodeURIComponent(originalUrl))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `mscache://${serverId}/${encoded}`
}

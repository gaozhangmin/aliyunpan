import type { IncomingHttpHeaders } from 'http'

const DROPPED_UPSTREAM_HEADERS = new Set([
  'host',
  'connection',
  'proxy-connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'referer',
  'authorization',
  'if-none-match',
  'if-modified-since'
])

export function buildUpstreamProxyHeaders(
  incomingHeaders: IncomingHttpHeaders,
  proxyHeaders?: string
): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {}

  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (value == null) continue
    const normalizedKey = key.toLowerCase()
    if (DROPPED_UPSTREAM_HEADERS.has(normalizedKey)) continue
    headers[normalizedKey] = value
  }

  headers['accept-encoding'] = 'identity'

  if (proxyHeaders) {
    try {
      const extraHeaders = JSON.parse(String(proxyHeaders)) as Record<string, string>
      for (const [key, value] of Object.entries(extraHeaders || {})) {
        if (!value) continue
        headers[key.toLowerCase()] = value
      }
    } catch (error) {
      console.warn('proxy_headers parse error', error)
    }
  }

  return headers
}

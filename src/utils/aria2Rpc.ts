export const getAriaAddUriGid = (result: unknown): string => {
  if (Array.isArray(result)) {
    for (const item of result) {
      const gid = getAriaAddUriGid(item)
      if (gid) return gid
    }
    return ''
  }
  if (typeof result === 'string') return result.trim()
  return ''
}

export const isAriaDuplicateGidError = (error: unknown): boolean => {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : typeof error === 'string'
      ? error
      : ''
  return /\bgid\b/i.test(message) && /already exists/i.test(message)
}

export const shouldRemoveAriaStoppedResult = (status: string): boolean => {
  return status === 'error' || status === 'removed'
}

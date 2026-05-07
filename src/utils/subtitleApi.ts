export interface SubtitleSearchResult {
  id: string
  name: string
  language: string
  downloadCount: number
  fileId: number
}

export interface SubtitleDownloadResult {
  fileName: string
  link: string
}

type FetchLike = typeof fetch

const SEARCH_API_KEY = ''
const DOWNLOAD_API_KEY = ''
const OPEN_SUBTITLES_API = 'https://api.opensubtitles.com/api/v1'

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export function buildSubtitleSearchUrl(query: string, language: string) {
  const url = new URL(`${OPEN_SUBTITLES_API}/subtitles`)
  const trimmedQuery = query.trim()
  if (/^\d+$/.test(trimmedQuery)) {
    url.searchParams.set('tmdb_id', trimmedQuery)
  } else {
    url.searchParams.set('query', trimmedQuery)
  }
  url.searchParams.set('languages', language)
  return url.toString()
}

export async function searchSubtitles(query: string, language: string, fetcher: FetchLike = fetch): Promise<SubtitleSearchResult[]> {
  if (!query.trim()) return []
  const response = await fetcher(buildSubtitleSearchUrl(query, language), {
    headers: {
      'Api-Key': SEARCH_API_KEY
    }
  })
  const data = await readJson<any>(response as Response)
  return (data.data || [])
    .map((item: any): SubtitleSearchResult | undefined => {
      const attributes = item?.attributes || {}
      const firstFile = Array.isArray(attributes.files) ? attributes.files[0] : undefined
      const fileId = Number(firstFile?.file_id)
      const name = String(attributes.release || firstFile?.file_name || '').trim()
      if (!fileId || !name) return undefined
      return {
        id: String(item.id || fileId),
        name,
        language: String(attributes.language || language),
        downloadCount: Number(attributes.new_download_count || 0),
        fileId
      }
    })
    .filter(Boolean)
    .sort((a: SubtitleSearchResult, b: SubtitleSearchResult) => b.downloadCount - a.downloadCount) as SubtitleSearchResult[]
}

export async function getSubtitleDownload(fileId: number, fetcher: FetchLike = fetch): Promise<SubtitleDownloadResult> {
  const response = await fetcher(`${OPEN_SUBTITLES_API}/download`, {
    method: 'POST',
    headers: {
      'Api-Key': DOWNLOAD_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_id: fileId
    })
  })
  const data = await readJson<any>(response as Response)
  if (!data.link || !data.file_name) throw new Error('Invalid subtitle download response')
  return {
    fileName: String(data.file_name),
    link: String(data.link)
  }
}

export function getSubtitleExtension(fileName: string) {
  const ext = fileName.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || 'srt'
  if (ext === 'ass' || ext === 'ssa') return 'ass'
  if (ext === 'vtt') return 'vtt'
  return 'srt'
}

export function formatSubtitleDownloadCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

import type {
  TmdbSearchResult,
  MediaLibraryItem,
  MovieItem,
  MediaLibraryTvSeriesItem,
  MovieItemResponse,
  TvSeriesItemResponse
} from '../types/media'

const TMDB_BASE_URL = 'https://tmdb-673444103572.asia-east2.run.app'

export class TmdbService {
  private static instance: TmdbService
  
  static getInstance(): TmdbService {
    if (!TmdbService.instance) {
      TmdbService.instance = new TmdbService()
    }
    return TmdbService.instance
  }

  async searchMovie(
    queryName: string,
    year?: string,
    tmdbId?: string,
    fileHash?: string,
    fileName?: string
  ): Promise<MovieItem | null> {
    try {
      const params = new URLSearchParams({
        language: 'zh-CN'
      })

      if (tmdbId) {
        params.append('tmdbId', tmdbId)
      } else {
        params.append('title', queryName)
      }

      if (year) {
        params.append('year', year)
      }
      if (fileHash) {
        params.append('md5', fileHash)
      }
      if (fileName) {
        params.append('fileName', fileName)
      }

      const response = await fetch(`${TMDB_BASE_URL}/movie?${params}`)
      if (!response.ok) throw new Error('Failed to search movies')

      const data: MovieItemResponse = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error searching movie:', error)
      return null
    }
  }

  async searchTV(
    queryName: string,
    season: number,
    year?: string,
    tmdbId?: string,
    fileHash?: string,
    fileName?: string
  ): Promise<MediaLibraryTvSeriesItem | null> {
    try {
      const params = new URLSearchParams({
        language: 'zh-CN',
        season: season.toString()
      })

      if (tmdbId) {
        params.append('tmdbId', tmdbId)
      } else {
        params.append('title', queryName)
      }

      if (year) {
        params.append('year', year)
      }
      if (fileHash) {
        params.append('md5', fileHash)
      }
      if (fileName) {
        params.append('fileName', fileName)
      }

      const response = await fetch(`${TMDB_BASE_URL}/tv?${params}`)
      if (!response.ok) throw new Error('Failed to search TV shows')

      const data: TvSeriesItemResponse = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error searching TV show:', error)
      return null
    }
  }


  cleanFileName(fileName: string): string {
    // 移除文件扩展名
    let cleaned = fileName.replace(/\.[^/.]+$/, '')

    // 替换括号为空格
    cleaned = cleaned.replace(/[\[\]]/g, ' ')

    // 移除不需要的模式1 (先处理这些模式)
    const unwantedPatterns1 = [
      /【\w+】/g,
      /\b[Nn]o\.?\s*\d+\b/g,
      /\b[Nn]o\s+\d+\b/g,
      /\b[Nn]o\.?\s*\d+\s*/g,
      /\s*\[\d+\]\s*/g
    ]

    for (const pattern of unwantedPatterns1) {
      cleaned = cleaned.replace(pattern, '')
    }

    // 主要的不需要的模式 - 找到第一个匹配并截取其之前的内容
    const unwantedPatterns = [
      /第(\w+)季[^\w]*第(\w+)集/,
      /第(\w+)季[^\w]*(\w+)集/,
      /第(\w+)季/,
      /(\d{1,3})[\s_-]*第(\w+)集/,
      /第(\w+)集/,
      /[Ss](\d+)[Ee](\d+)/,
      /[Ss](\d+)[^\w_](\d+)/,
      /[Ss](\d+)[^\w_]+[Ee](\d+)/,
      /[Ee]p(?:isode)?(\d+)/,
      /Season(\d+)[Ee](\d+)/,
      /Season(\d+)[^\w_](\d+)/,
      /E(\d+)/,
      /Season(\d+)[^\w_]*Episode(\d+)\b/,
      /(?<!\p{Script=Han})(19[0-9]{2}|20[0-9]{2})(?!\p{Script=Han})/u,
      /1080p|720p|4K|4k|WEB-DL|BD/i,
      /Mandarin|AAC|\bAVC/i,
      /\b(Narx)\b/i,
      /\s+\d{2,}/
    ]

    // 遍历所有不需要的部分，匹配并在第一个匹配处截断
    for (const pattern of unwantedPatterns) {
      const match = cleaned.match(pattern)
      if (match && match.index !== undefined) {
        cleaned = cleaned.substring(0, match.index)
        break // 找到第一个匹配就停止
      }
    }

    // 移除不必要的字符，例如点、下划线和连字符
    cleaned = cleaned.replace(/[.\\_\-=|/\\;:,'!?~"%#$&*<>｜]/g, ' ')

    // 去除多余的空格
    const finalResult = cleaned.replace(/\s+/g, ' ').trim()

    // 按空格分割
    const parts = finalResult.split(' ')

    // 如果第一个部分只包含中文，直接返回
    if (parts.length > 0 && this.isAllChinese(parts[0])) {
      return parts[0]
    }

    // 如果第一个部分只包含中文和数字，则只返回第一部分
    if (parts.length > 0 && this.isChineseAndNumbers(parts[0])) {
      if (parts.length > 1 && this.isNumbers(parts[1])) {
        return parts[0] + parts[1]
      }
      if (this.isAllNumbers(parts[0])) {
        return finalResult
      } else {
        return parts[0]
      }
    }

    return finalResult.toLowerCase()
  }

  private isAllChinese(str: string): boolean {
    return /^[\u4e00-\u9fff]+$/.test(str)
  }

  private isChineseAndNumbers(str: string): boolean {
    return /^[\u4e00-\u9fff0-9]+$/.test(str)
  }

  private isNumbers(str: string): boolean {
    return /^\d+$/.test(str)
  }

  private isAllNumbers(str: string): boolean {
    return /^\d+$/.test(str)
  }

  parseYear(fileName: string): string | undefined {
    const yearMatch = fileName.match(/\b(19|20)\d{2}\b/)
    return yearMatch ? yearMatch[0] : undefined
  }

  parseSeasonEpisode(fileName: string): { season: number; episode: number } | null {
    // 匹配 S01E01 格式
    const match1 = fileName.match(/[Ss](\d+)[Ee](\d+)/)
    if (match1) {
      return { season: parseInt(match1[1]), episode: parseInt(match1[2]) }
    }
    
    // 匹配 第1季第1集 格式
    const match2 = fileName.match(/第(\d+)季第(\d+)集/)
    if (match2) {
      return { season: parseInt(match2[1]), episode: parseInt(match2[2]) }
    }
    
    // 匹配 E01 格式 (默认第1季)
    const match3 = fileName.match(/[Ee](\d+)/)
    if (match3) {
      return { season: 1, episode: parseInt(match3[1]) }
    }

    // 匹配 第1集 格式 (默认第1季)
    const match4 = fileName.match(/第(\d+)集/)
    if (match4) {
      return { season: 1, episode: parseInt(match4[1]) }
    }
    
    return null
  }

  async matchMedia(fileName: string, filePath: string): Promise<Partial<MediaLibraryItem> | null> {
    const cleanedName = this.cleanFileName(fileName)
    const year = this.parseYear(fileName)
    const seasonEpisode = this.parseSeasonEpisode(fileName)

    if (seasonEpisode) {
      // 可能是电视剧
      const tvResult = await this.searchTV(cleanedName, seasonEpisode.season, year)
      if (tvResult) {
        // 从current_season中找到匹配的集数
        let matchedEpisode = null
        if (tvResult.current_season?.episodes) {
          matchedEpisode = tvResult.current_season.episodes.find(ep => ep.episode_number === seasonEpisode.episode)
        }

        // 构造返回的媒体信息，包含完整的剧集结构
        const mediaItem: Partial<MediaLibraryItem> = {
          type: 'tv',
          name: tvResult.tv.name || tvResult.tv.original_name,
          overview: tvResult.tv.overview,
          posterUrl: tvResult.tv.poster_path ? `https://image.tmdb.org/t/p/w500${tvResult.tv.poster_path}` : undefined,
          backdropUrl: tvResult.tv.backdrop_path ? `https://image.tmdb.org/t/p/original${tvResult.tv.backdrop_path}` : undefined,
          year: tvResult.tv.first_air_date?.substring(0, 4),
          rating: tvResult.tv.vote_average,
          genres: tvResult.tv.genres?.map(g => g.name) || [],
          credits: tvResult.tv.credits || tvResult.current_season?.credits,
          productionCountries: tvResult.tv.production_countries?.map(c => c.name) || [],
          tmdbId: tvResult.tv.id,
          imdbId: tvResult.tv.imdbId,
          tvdbId: tvResult.tv.tvdbId,
          // 包含季信息
          seasons: tvResult.current_season ? [{
            id: tvResult.current_season.id,
            seasonNumber: tvResult.current_season.season_number,
            name: tvResult.current_season.name,
            overview: tvResult.current_season.overview,
            posterPath: tvResult.current_season.poster_path,
            episodeCount: tvResult.current_season.episode_count || tvResult.current_season.episodes?.length || 0,
            airDate: tvResult.current_season.air_date,
            credits: tvResult.current_season.credits
          }] : undefined
        }

        return mediaItem
      }
    } else {
      // 可能是电影
      const movieResult = await this.searchMovie(cleanedName, year)
      if (movieResult) {
        return {
          type: 'movie',
          name: movieResult.title || movieResult.original_title,
          overview: movieResult.overview,
          posterUrl: movieResult.poster_path ? `https://image.tmdb.org/t/p/w500${movieResult.poster_path}` : undefined,
          backdropUrl: movieResult.backdrop_path ? `https://image.tmdb.org/t/p/original${movieResult.backdrop_path}` : undefined,
          year: movieResult.release_date?.substring(0, 4),
          rating: movieResult.vote_average,
          genres: movieResult.genres?.map(g => g.name) || [],
          credits: movieResult.credits,
          productionCountries: movieResult.production_countries?.map(c => c.name) || [],
          tmdbId: movieResult.id,
          imdbId: movieResult.imdb_id,
          driveFiles: [] // 这个会在后续处理中填充实际的文件信息
        }
      }
    }

    return null
  }
}

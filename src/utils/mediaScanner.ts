import { useMediaLibraryStore } from '../store/medialibrary'
import { TmdbService } from './tmdb'
import type { MediaLibraryItem, DriveFileItem, MediaLibraryFolder } from '../types/media'
import { IAliGetFileModel } from '../aliapi/alimodels'
import AliDirFileList from '../aliapi/dirfilelist'
import { usePanTreeStore } from '../store'
import message from './message'
import { apiCloud123FileList, mapCloud123FileToAliModel } from '../cloud123/dirfilelist'
import { apiDrive115FileList, mapDrive115FileToAliModel } from '../cloud115/dirfilelist'
import { apiBaiduFileList, mapBaiduFileToAliModel } from '../cloudbaidu/dirfilelist'
import { isBaiduUser, isCloud123User, isDrive115User } from '../aliapi/utils'
import { getWebDavConnection, getWebDavConnectionId, isWebDavDrive, listWebDavDirectory, type WebDavConnectionConfig } from './webdavClient'

export class MediaScanner {
  private static instance: MediaScanner
  private tmdbService = TmdbService.getInstance()
  private mediaStore = useMediaLibraryStore()
  private panTreeStore = usePanTreeStore()
  private isScanning = false
  private shouldStop = false

  // 支持的视频文件扩展名
  private readonly VIDEO_EXTENSIONS = new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
    '.mpg', '.mpeg', '.3gp', '.rmvb', '.asf', '.divx', '.xvid', '.ts',
    '.m2ts', '.mts', '.vob', '.ogv', '.dv'
  ])

  static getInstance(): MediaScanner {
    if (!MediaScanner.instance) {
      MediaScanner.instance = new MediaScanner()
    }
    return MediaScanner.instance
  }

  // 统一扫描入口，按当前网盘类型分流
  async scanFolder(
    folder: IAliGetFileModel,
    driveServerId: string
  ): Promise<void> {
    if (this.isScanning) {
      message.warning('正在扫描中，请稍后...')
      return
    }

    this.isScanning = true
    this.shouldStop = false
    this.mediaStore.setScanning(true)
    this.mediaStore.setScanProgress(0, 0)

    try {
      console.log('开始扫描网盘文件夹:', folder.name)

      // 先收集所有视频文件
      const videoFiles: DriveFileItem[] = []
      await this.collectVideoFiles(folder, driveServerId, videoFiles, 0, folder.name)

      if (videoFiles.length === 0) {
        message.info('未在该文件夹中找到视频文件')
        return
      }

      this.mediaStore.setScanProgress(0, videoFiles.length)
      console.log(`找到 ${videoFiles.length} 个视频文件，开始处理...`)

      // 批量处理视频文件
      const batchSize = 5 // 每次处理5个文件
      const folderKey = driveServerId === 'webdav' ? `webdav_${folder.drive_id}_${folder.file_id}` : `${folder.file_id}`
      for (let i = 0; i < videoFiles.length && !this.shouldStop; i += batchSize) {
        const batch = videoFiles.slice(i, i + batchSize)
        const promises = batch.map(file => this.processVideoFile(file, folder.name, folderKey))

        try {
          await Promise.allSettled(promises)
        } catch (error) {
          console.error('批量处理视频文件时出错:', error)
        }

        this.mediaStore.setScanProgress(Math.min(i + batchSize, videoFiles.length), videoFiles.length)

        // 给UI一些时间更新
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!this.shouldStop) {
        // 添加文件夹到媒体库
        const isWebDavFolder = driveServerId === 'webdav'
        const mediaFolder: MediaLibraryFolder = {
          id: folderKey,
          fileId: folder.file_id, // 真正的云盘文件ID
          name: folder.name,
          path: folder.path || '', // 保存文件夹路径信息（对百度网盘很重要）
          userId: isWebDavFolder ? getWebDavConnectionId(folder.drive_id) : this.panTreeStore.user_id,
          driveId: folder.drive_id,
          driveServerId,
          scanDate: new Date(),
          itemCount: videoFiles.length
        }

        this.mediaStore.addFolder(mediaFolder)

        message.success(`扫描完成！共处理 ${videoFiles.length} 个视频文件`)
      } else {
        message.info('扫描已停止')
      }

    } catch (error) {
      console.error('扫描文件夹时出错:', error)
      message.error('扫描失败: ' + (error as Error).message)
    } finally {
      this.isScanning = false
      this.mediaStore.setScanning(false)
    }
  }

  async scanAliyunFolder(folder: IAliGetFileModel, driveServerId: string): Promise<void> {
    return this.scanFolder(folder, driveServerId)
  }

  async scanWebDavConnection(connection: WebDavConnectionConfig): Promise<void> {
    const rootFolder: IAliGetFileModel = {
      __v_skip: true,
      drive_id: `webdav:${connection.id}`,
      file_id: '/',
      parent_file_id: '',
      name: connection.name,
      namesearch: connection.name.toLowerCase(),
      path: '/',
      ext: '',
      mime_type: '',
      mime_extension: '',
      category: 'folder',
      icon: '',
      size: 0,
      sizeStr: '',
      time: Date.now(),
      timeStr: '',
      starred: false,
      isDir: true,
      thumbnail: '',
      description: ''
    }
    return this.scanFolder(rootFolder, 'webdav')
  }

  async scanLocalFolder(folderPath: string): Promise<void> {
    if (this.isScanning) {
      message.warning('正在扫描中，请稍后...')
      return
    }

    const fs = window.require?.('fs')
    const path = window.require?.('path')
    if (!fs || !path) {
      message.error('当前环境不支持本地文件扫描')
      return
    }

    this.isScanning = true
    this.shouldStop = false
    this.mediaStore.setScanning(true)
    this.mediaStore.setScanProgress(0, 0)

    try {
      const folderName = path.basename(folderPath)
      const videoFiles: DriveFileItem[] = []
      await this.collectLocalVideoFiles(folderPath, videoFiles, fs, path)

      if (videoFiles.length === 0) {
        message.info('未在该文件夹中找到视频文件')
        return
      }

      this.mediaStore.setScanProgress(0, videoFiles.length)

      const batchSize = 5
      for (let i = 0; i < videoFiles.length && !this.shouldStop; i += batchSize) {
        const batch = videoFiles.slice(i, i + batchSize)
        const promises = batch.map(file => this.processVideoFile(file, folderName, folderPath))

        try {
          await Promise.allSettled(promises)
        } catch (error) {
          console.error('批量处理视频文件时出错:', error)
        }

        this.mediaStore.setScanProgress(Math.min(i + batchSize, videoFiles.length), videoFiles.length)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!this.shouldStop) {
        const mediaFolder: MediaLibraryFolder = {
          id: `local_${folderPath}`,
          fileId: folderPath,
          name: folderName,
          path: folderPath,
          userId: 'local',
          driveId: 'local',
          driveServerId: 'local',
          scanDate: new Date(),
          itemCount: videoFiles.length
        }

        this.mediaStore.addFolder(mediaFolder)
        message.success(`扫描完成！共处理 ${videoFiles.length} 个视频文件`)
      } else {
        message.info('扫描已停止')
      }
    } catch (error) {
      console.error('扫描本地文件夹时出错:', error)
      message.error('扫描失败: ' + (error as Error).message)
    } finally {
      this.isScanning = false
      this.mediaStore.setScanning(false)
    }
  }

  // 递归收集所有视频文件 - 参考Swift版本的广度优先遍历
  private async collectVideoFiles(
    folder: IAliGetFileModel,
    driveServerId: string,
    videoFiles: DriveFileItem[],
    depth = 0,
    currentPath = ''
  ): Promise<void> {
    if (this.shouldStop || depth > 10) return // 防止过深递归

    try {
      console.log(`正在扫描文件夹: ${folder.name} (深度: ${depth})`)

      const items = await this.getFolderItems(folder)
      if (!items || items.length === 0) {
        console.log(`文件夹 ${folder.name} 无内容或获取失败`)
        return
      }

      console.log(`文件夹 ${folder.name} 包含 ${items.length} 个项目`)

      for (const item of items) {
        if (this.shouldStop) break

        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name
        if (item.isDir) {
          // 递归处理子文件夹
          await this.collectVideoFiles(item, driveServerId, videoFiles, depth + 1, itemPath)
        } else {
          if (this.isVideoFile(item.name)) {
            console.log(`✓ 找到视频文件: ${item.name} ${item.thumbnail ? '(有缩略图)' : '(无缩略图)'}`)
            // 转换为DriveFileItem格式
            const driveFile: DriveFileItem = {
              id: item.file_id,
              name: item.name,
              path: itemPath,
              userId: isWebDavDrive(item.drive_id || '') ? getWebDavConnectionId(item.drive_id) : this.panTreeStore.user_id,
              driveId: item.drive_id,
              driveServerId: driveServerId,
              fileSize: item.size || 0,
              contentHash: item.description || '', // 使用 description 替代 sha1
              thumbnailLink: item.thumbnail || undefined,
              videoDuration: item.media_duration,
              height: item.media_height
            }
            videoFiles.push(driveFile)
          }
        }
      }

    } catch (error) {
      console.error(`获取文件夹内容失败: ${folder.name}`, error)
    }
  }

  private async getFolderItems(folder: IAliGetFileModel): Promise<IAliGetFileModel[]> {
    const userId = this.panTreeStore.user_id
    const driveId = folder.drive_id || this.panTreeStore.drive_id

    if (isWebDavDrive(driveId)) {
      const connectionId = getWebDavConnectionId(driveId)
      const connection = getWebDavConnection(connectionId)
      if (!connection) {
        console.warn('WebDAV 连接不存在:', connectionId)
        return []
      }
      return await listWebDavDirectory(connection, folder.path || folder.file_id || '/')
    }

    if (isCloud123User(userId) || driveId === 'cloud123') {
      const list = await apiCloud123FileList(userId, folder.file_id, 100)
      return list.map((item) => {
        const mapped = mapCloud123FileToAliModel(item)
        mapped.drive_id = driveId
        return mapped
      })
    }

    if (isDrive115User(userId) || driveId === 'drive115') {
      const list = await apiDrive115FileList(userId, folder.file_id, 200, 0, true)
      return list.map((item) => mapDrive115FileToAliModel(item, driveId))
    }

    if (isBaiduUser(userId) || driveId === 'baidu') {
      const parentPath = folder.path || '/'
      const list = await apiBaiduFileList(userId, parentPath, 'name', 0, 1000)
      return list.map((item) => mapBaiduFileToAliModel(item, driveId, folder.file_id || ''))
    }

    const resp = await AliDirFileList.ApiDirFileList(
      userId,
      driveId,
      folder.file_id,
      folder.name,
      'name asc',
      '',
      undefined,
      false
    )

    return resp?.items || []
  }

  private async collectLocalVideoFiles(
    folderPath: string,
    videoFiles: DriveFileItem[],
    fs: any,
    path: any,
    depth = 0
  ): Promise<void> {
    if (this.shouldStop || depth > 10) return

    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
      for (const entry of entries) {
        if (this.shouldStop) return
        const fullPath = path.join(folderPath, entry.name)
        if (entry.isDirectory()) {
          await this.collectLocalVideoFiles(fullPath, videoFiles, fs, path, depth + 1)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (this.VIDEO_EXTENSIONS.has(ext)) {
            const stat = await fs.promises.stat(fullPath)
            videoFiles.push({
              id: fullPath,
              name: entry.name,
              path: fullPath,
              driveId: 'local',
              driveServerId: 'local',
              fileSize: stat.size || 0,
              contentHash: '',
              thumbnailLink: undefined,
              videoDuration: undefined,
              height: undefined
            })
          }
        }
      }
    } catch (error) {
      console.error('扫描本地文件夹失败:', error)
    }
  }

  // 检查是否为视频文件
  private isVideoFile(filename: string): boolean {
    const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '')
    return this.VIDEO_EXTENSIONS.has(ext)
  }

  private parseTmdbId(fileName: string): string | null {
    const match = fileName.match(/tmdb(?:id)?[-=](\d+)/i)
    return match ? match[1] : null
  }

  // 尝试匹配现有电视剧 - 参考Swift版本的addTvSeriesItemByMatchName
  private tryMatchExistingTvSeries(
    fileItem: DriveFileItem,
    folderName: string,
    cleanedFileName: string,
    seasonEpisode: { season: number, episode: number },
    folderId?: string
  ): MediaLibraryItem | null {
    const existingTvItems = this.mediaStore.tvShows

    for (const existingItem of existingTvItems) {
      // 检查名称匹配逻辑（与Swift版本保持一致）
      const tvName = existingItem.name.toLowerCase()
      const cleanedFileNameLower = cleanedFileName.toLowerCase()

      if (cleanedFileNameLower.includes(tvName) ||
          tvName.includes(cleanedFileNameLower)) {

        // 找到匹配的电视剧，需要合并集数信息
        const updatedItem = this.mergeEpisodeIntoTvSeries(
          existingItem,
          fileItem,
          seasonEpisode,
          folderName,
          folderId
        )

        if (updatedItem) {
          // 更新媒体库中的项目
          this.mediaStore.addOrMergeTvSeries(updatedItem)
          this.mediaStore.addToRecentlyAdded(updatedItem)
          return updatedItem
        }
      }
    }

    return null
  }

  // 将新集数合并到现有电视剧中 - 与Swift版本的addTvSeriesItemByMatchName保持一致
  private mergeEpisodeIntoTvSeries(
    existingTvItem: MediaLibraryItem,
    newFileItem: DriveFileItem,
    seasonEpisode: { season: number, episode: number },
    folderName: string,
    folderId?: string
  ): MediaLibraryItem | null {
    try {
      // 深拷贝现有项目以避免直接修改
      const updatedItem: MediaLibraryItem = JSON.parse(JSON.stringify(existingTvItem))

      // 获取现有的seasons，如果不存在则返回null（与Swift版本一致）
      const mergedSeasons = updatedItem.seasons || []

      // 查找对应的季
      const existingSeasonIndex = mergedSeasons.findIndex(s => s.seasonNumber === seasonEpisode.season)
      if (existingSeasonIndex >= 0) {
        const existingSeason = mergedSeasons[existingSeasonIndex]
        const mergedEpisodes = existingSeason.episodes || []

        // 查找对应的集
        const existingEpisodeIndex = mergedEpisodes.findIndex(e => e.episodeNumber === seasonEpisode.episode)
        if (existingEpisodeIndex >= 0) {
          // 只有当季和集都已存在时才进行合并（与Swift版本一致）
          const existingEpisode = mergedEpisodes[existingEpisodeIndex]

          if (existingEpisode.driveFiles) {
            // 添加新文件到现有集中，避免重复
            const existingCloudItems = [...existingEpisode.driveFiles]
            existingCloudItems.push(newFileItem)

            // 去重处理（使用Set去重）
            const uniqueItems = Array.from(
              new Map(existingCloudItems.map(item => [item.id, item])).values()
            )
            existingEpisode.driveFiles = uniqueItems
          } else {
            existingEpisode.driveFiles = [newFileItem]
          }

          // 更新季中的集数组
          mergedEpisodes[existingEpisodeIndex] = existingEpisode
          existingSeason.episodes = mergedEpisodes
          mergedSeasons[existingSeasonIndex] = existingSeason

          // 更新项目的seasons
          updatedItem.seasons = mergedSeasons

          // 更新总的driveFiles列表
          // if (!updatedItem.driveFiles) {
          //   updatedItem.driveFiles = []
          // }
          // const mainFileExists = updatedItem.driveFiles.some(f => f.id === newFileItem.id)
          // if (!mainFileExists) {
          //   updatedItem.driveFiles.push(newFileItem)
          // }

          // 更新父ID和文件夹ID
          updatedItem.parentId = folderName
          updatedItem.folderId = folderId || updatedItem.folderId

          return updatedItem
        }
      }

      // 如果没有找到对应的季或集，返回null（与Swift版本一致，不创建新的季集）
      return null
    } catch (error) {
      console.error('合并集数信息失败:', error)
      return null
    }
  }

  // 处理单个视频文件 - 参考Swift版本的元数据匹配逻辑
  private async processVideoFile(file: DriveFileItem, folderName: string, folderId?: string): Promise<void> {
    try {
      const fileName = file.name.replace(/\.[^/.]+$/, "") // 去除文件扩展名
      const seasonEpisode = this.tmdbService.parseSeasonEpisode(fileName)
      const cleanedFileName = this.tmdbService.cleanFileName(fileName)
      const cleanedFolderName = this.tmdbService.cleanFileName(folderName)
      const lookupName = cleanedFileName.replace(/\s/g, "").length > 0
        ? cleanedFileName
        : cleanedFolderName

      if (lookupName.replace(/\s/g, "").length === 0) {
        const unmatchedItem: MediaLibraryItem = {
          id: `${file.id}`,
          parentId: folderName,
          folderId: folderId || `${file.driveId}`,
          folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
          type: 'unmatched',
          name: fileName || file.name,
          posterUrl: file.thumbnailLink || undefined,
          genres: [],
          driveFiles: [file],
          addedAt: new Date()
        }

        this.mediaStore.addMediaItem(unmatchedItem)
        console.warn(`⚠️ 无法提取有效片名，已归类为未匹配: ${file.name} (folder=${folderName})`)
        return
      }

      // 检查是否为电视剧文件（必须能解析出季集信息）
      if (seasonEpisode) {
        // 电视剧处理逻辑 - 完全移植 Swift 的 processTVFile

        // 1. 首先尝试与现有电视剧匹配（addTvSeriesItemByMatchName逻辑）
        const existingTvItem = this.tryMatchExistingTvSeries(file, folderName, lookupName, seasonEpisode, folderId)
        if (existingTvItem) {
          console.log(`📺 已匹配现有剧集: ${existingTvItem.name} S${seasonEpisode.season}E${seasonEpisode.episode}`)
          return
        }

        // 2. 尝试通过TMDB API获取电视剧信息（对齐 Swift 的 parseAndFetchTVMetadata）
        const tmdbId = this.parseTmdbId(fileName)
        const year = this.tmdbService.parseYear(fileName)
        const shouldUseYear = Boolean(year && !lookupName.includes(year))
        const fileHash = file.fileHash || file.contentHash

        const tvResult = tmdbId
          ? await this.tmdbService.searchTV(
              lookupName,
              seasonEpisode.season,
              shouldUseYear ? year : undefined,
              tmdbId,
              fileHash
            )
          : await this.tmdbService.searchTV(
              lookupName,
              seasonEpisode.season,
              shouldUseYear ? year : undefined,
              undefined,
              fileHash,
              fileName
            )

        const matchedEpisode = tvResult?.current_season?.episodes?.find(
          ep => ep.episode_number === seasonEpisode.episode
        )

        if (tvResult && tvResult.current_season && matchedEpisode) {
          const episodeStillPath = matchedEpisode.still_path
            ? `https://image.tmdb.org/t/p/w500${matchedEpisode.still_path}`
            : undefined

          const currentEpisode = {
            id: matchedEpisode.id,
            episodeNumber: matchedEpisode.episode_number,
            seasonNumber: matchedEpisode.season_number,
            name: matchedEpisode.name,
            overview: matchedEpisode.overview,
            stillPath: episodeStillPath,
            airDate: matchedEpisode.air_date,
            runtime: matchedEpisode.runtime,
            crew: matchedEpisode.crew,
            driveFiles: [file]
          }

          const currentSeason = {
            id: tvResult.current_season.id,
            seasonNumber: tvResult.current_season.season_number,
            name: tvResult.current_season.name,
            overview: tvResult.current_season.overview,
            posterPath: tvResult.current_season.poster_path,
            episodeCount: tvResult.current_season.episode_count || tvResult.current_season.episodes?.length || 0,
            airDate: tvResult.current_season.air_date,
            credits: tvResult.current_season.credits,
            episodes: [currentEpisode]
          }

          const mediaItem: MediaLibraryItem = {
            id: `${tvResult.tv.id}`,
            parentId: folderName,
            folderId: folderId,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: 'tv',
            name: tvResult.tv.name || tvResult.tv.original_name || lookupName,
            overview: tvResult.tv.overview,
            posterUrl: tvResult.tv.poster_path ? `https://image.tmdb.org/t/p/w500${tvResult.tv.poster_path}` : undefined,
            backdropUrl: tvResult.tv.backdrop_path ? `https://image.tmdb.org/t/p/original${tvResult.tv.backdrop_path}` : undefined,
            year: tvResult.tv.first_air_date?.substring(0, 4),
            rating: tvResult.tv.vote_average,
            genres: tvResult.tv.genres?.map(g => g.name) || [],
            credits: tvResult.current_season?.credits,
            productionCountries: tvResult.tv.production_countries?.map(c => c.name) || [],
            tmdbId: tvResult.tv.id,
            imdbId: tvResult.tv.imdbId,
            tvdbId: tvResult.tv.tvdbId,
            seasons: [currentSeason],
            driveFiles: [],
            addedAt: new Date()
          }

          this.mediaStore.addOrMergeTvSeries(mediaItem)
          this.mediaStore.addToRecentlyAdded(mediaItem)

          console.log(`✅ 已处理电视剧: ${file.name} -> ${mediaItem.name} S${seasonEpisode.season}E${seasonEpisode.episode} (tv) - TMDB封面`)
        } else {
          const unmatchedItem: MediaLibraryItem = {
            id: `${file.id}`,
            parentId: folderName,
            folderId: folderId,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: 'unmatched',
            name: fileName || file.name,
            posterUrl: file.thumbnailLink || undefined,
            genres: [],
            driveFiles: [file],
            addedAt: new Date()
          }

          this.mediaStore.addMediaItem(unmatchedItem)
          console.log(`⚠️ 未匹配电视剧: ${file.name} - 使用文件缩略图`)
        }
      } else {
        // 电影处理逻辑（无季集信息的视频文件）
        const mediaInfo = await this.tmdbService.matchMedia(lookupName, file.path)

        if (mediaInfo && (mediaInfo.type === 'movie' || !mediaInfo.type)) {
          // 电影：每个文件一个条目
          const mediaItem: MediaLibraryItem = {
            id: `${file.id}`,
            parentId: folderName,
            folderId: folderId,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: 'movie',
            name: mediaInfo.name!,
            overview: mediaInfo.overview,
            posterUrl: mediaInfo.posterUrl,
            backdropUrl: mediaInfo.backdropUrl,
            year: mediaInfo.year,
            rating: mediaInfo.rating,
            genres: mediaInfo.genres || [],
            credits: mediaInfo.credits,
            productionCountries: mediaInfo.productionCountries,
            tmdbId: mediaInfo.tmdbId,
            imdbId: mediaInfo.imdbId,
            tvdbId: mediaInfo.tvdbId,
            driveFiles: [file],
            addedAt: new Date()
          }

          this.mediaStore.addMediaItem(mediaItem)
          this.mediaStore.addToRecentlyAdded(mediaItem)

          console.log(`✅ 已处理电影: ${file.name} -> ${mediaInfo.name} (${mediaInfo.type}) - TMDB封面`)
        } else {
          // 未匹配的项目 - 使用文件的缩略图作为封面
          const unmatchedItem: MediaLibraryItem = {
            id: `${file.id}`,
            parentId: folderName,
            folderId: folderId || `${file.driveId}`,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: 'unmatched',
            name: fileName || file.name,
            posterUrl: file.thumbnailLink || undefined,
            genres: [],
            driveFiles: [file],
            addedAt: new Date()
          }

          this.mediaStore.addMediaItem(unmatchedItem)
          console.log(`⚠️ 未匹配: ${file.name} - 使用文件缩略图`)
        }
      }
    } catch (error) {
      console.error(`处理视频文件失败: ${file.name}`, error)
    }
  }

  // 停止扫描
  stopScan(): void {
    this.shouldStop = true
    this.mediaStore.setScanning(false)
    console.log('扫描已停止')
  }

  // 检查是否正在扫描
  get isCurrentlyScanning(): boolean {
    return this.isScanning
  }
}

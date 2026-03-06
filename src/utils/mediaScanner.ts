import { useMediaLibraryStore } from '../store/medialibrary'
import { TmdbService } from './tmdb'
import type { MediaLibraryItem, DriveFileItem, MediaLibraryFolder } from '../types/media'
import { IAliGetFileModel } from '../aliapi/alimodels'
import AliDirFileList from '../aliapi/dirfilelist'
import { usePanTreeStore } from '../store'
import message from './message'

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

  async scanFolder(
    folderPath: string,
    driveId: string,
    driveServerId: string,
    folderName: string
  ): Promise<void> {
    this.mediaStore.setScanning(true)
    this.mediaStore.setScanProgress(0, 0)

    try {
      // 这里需要集成实际的文件系统API
      // 暂时模拟扫描过程
      const videoFiles = await this.getVideoFiles(folderPath, driveId, driveServerId)
      
      this.mediaStore.setScanProgress(0, videoFiles.length)

      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i]
        await this.processVideoFile(file, folderName, `${driveServerId}_${folderPath}`)
        this.mediaStore.setScanProgress(i + 1, videoFiles.length)
      }

      // 添加文件夹到媒体库
      const folder: MediaLibraryFolder = {
        id: `${driveServerId}_${folderPath}`,
        fileId: folderPath, // 假设 folderPath 就是 fileId，但这里可能需要调整
        name: folderName,
        path: folderPath,
        driveId,
        driveServerId,
        scanDate: new Date(),
        itemCount: videoFiles.length
      }
      this.mediaStore.addFolder(folder)

    } catch (error) {
      console.error('Error scanning folder:', error)
    } finally {
      this.mediaStore.setScanning(false)
    }
  }

  private async getVideoFiles(
    folderPath: string,
    driveId: string,
    driveServerId: string
  ): Promise<DriveFileItem[]> {
    // 这里需要集成实际的云盘API来获取文件列表
    // 暂时返回模拟数据
    return [
      {
        id: '1',
        name: 'The Shawshank Redemption 1994.mp4',
        path: `${folderPath}/The Shawshank Redemption 1994.mp4`,
        driveId,
        driveServerId,
        fileSize: 1024000000,
        contentHash: 'abc123',
        thumbnailLink: undefined,
        videoDuration: '7200',
        height: 1080
      },
      {
        id: '2',
        name: 'Breaking Bad S01E01.mp4',
        path: `${folderPath}/Breaking Bad S01E01.mp4`,
        driveId,
        driveServerId,
        fileSize: 512000000,
        contentHash: 'def456',
        thumbnailLink: undefined,
        videoDuration: '3600',
        height: 720
      }
    ]
  }

  // 集成实际的云盘API - 参考Swift MediaScanner的扫描逻辑
  async scanAliyunFolder(
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
      console.log('开始扫描阿里云盘文件夹:', folder.name)

      // 先收集所有视频文件
      const videoFiles: DriveFileItem[] = []
      await this.collectVideoFiles(folder, driveServerId, videoFiles)

      if (videoFiles.length === 0) {
        message.info('未在该文件夹中找到视频文件')
        return
      }

      this.mediaStore.setScanProgress(0, videoFiles.length)
      console.log(`找到 ${videoFiles.length} 个视频文件，开始处理...`)

      // 批量处理视频文件
      const batchSize = 5 // 每次处理5个文件
      for (let i = 0; i < videoFiles.length && !this.shouldStop; i += batchSize) {
        const batch = videoFiles.slice(i, i + batchSize)
        const folderId = `${driveServerId}_${folder.file_id}`
        const promises = batch.map(file => this.processVideoFile(file, folder.name, folderId))

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
        const mediaFolder: MediaLibraryFolder = {
          id: `${driveServerId}_${folder.file_id}`,
          fileId: folder.file_id, // 真正的阿里云盘文件ID
          name: folder.name,
          path: '', // IAliGetFileModel 没有 path 属性，使用空字符串
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

  // 递归收集所有视频文件 - 参考Swift版本的广度优先遍历
  private async collectVideoFiles(
    folder: IAliGetFileModel,
    driveServerId: string,
    videoFiles: DriveFileItem[],
    depth = 0
  ): Promise<void> {
    if (this.shouldStop || depth > 10) return // 防止过深递归

    try {
      console.log(`正在扫描文件夹: ${folder.name} (深度: ${depth})`)

      // 使用正确的API方法获取文件夹内容
      const resp = await AliDirFileList.ApiDirFileList(
        this.panTreeStore.user_id,
        folder.drive_id,
        folder.file_id,
        folder.name,
        'name asc',
        '', // type - 空字符串表示所有类型
        undefined, // albumID
        false // refresh
      )

      if (!resp || !resp.items) {
        console.log(`文件夹 ${folder.name} 无内容或获取失败`)
        return
      }

      console.log(`文件夹 ${folder.name} 包含 ${resp.items.length} 个项目`)

      for (const item of resp.items) {
        if (this.shouldStop) break

        if (item.isDir) {
          // 递归处理子文件夹
          await this.collectVideoFiles(item, driveServerId, videoFiles, depth + 1)
        } else {
          if (this.isVideoFile(item.name)) {
            console.log(`✓ 找到视频文件: ${item.name} ${item.thumbnail ? '(有缩略图)' : '(无缩略图)'}`)
            // 转换为DriveFileItem格式
            const driveFile: DriveFileItem = {
              id: item.file_id,
              name: item.name,
              path: `/${item.name}`, // 构造路径，因为 IAliGetFileModel 没有 path 属性
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

      // 处理分页 - AliDirFileList.ApiDirFileList 会自动处理所有分页
      // 所以我们不需要手动处理 next_marker

    } catch (error) {
      console.error(`获取文件夹内容失败: ${folder.name}`, error)
    }
  }

  // 检查是否为视频文件
  private isVideoFile(filename: string): boolean {
    const ext = '.' + (filename.split('.').pop()?.toLowerCase() || '')
    return this.VIDEO_EXTENSIONS.has(ext)
  }

  // 处理单个视频文件 - 参考Swift版本的元数据匹配逻辑
  private async processVideoFile(file: DriveFileItem, folderName: string, folderId?: string): Promise<void> {
    try {
      // 使用TMDB服务匹配媒体信息
      const mediaInfo = await this.tmdbService.matchMedia(file.name, file.path)

      if (mediaInfo && mediaInfo.type) {
        // 成功匹配到媒体信息
        let mediaItem: MediaLibraryItem

        if (mediaInfo.type === 'tv') {
          // 电视剧：为每个电视剧系列创建一个主ID，不基于单个文件
          const seasonEpisode = this.tmdbService.parseSeasonEpisode(file.name)
          const tvSeriesId = `tv_${file.driveServerId}_${mediaInfo.tmdbId}`

          // 为当前文件创建episode条目
          const currentEpisode = mediaInfo.episodes && mediaInfo.episodes.length > 0 ? {
            ...mediaInfo.episodes[0],
            driveFiles: [file] // 将当前文件关联到这一集
          } : {
            id: parseInt(`${mediaInfo.tmdbId}${seasonEpisode?.season || 1}${seasonEpisode?.episode || 1}`),
            name: `Episode ${seasonEpisode?.episode || 1}`,
            overview: undefined,
            runtime: undefined,
            season_number: seasonEpisode?.season || 1,
            episode_number: seasonEpisode?.episode || 1,
            still_path: undefined,
            air_date: undefined,
            driveFiles: [file]
          }

          mediaItem = {
            id: tvSeriesId, // 使用剧集ID而不是文件ID
            parentId: folderName,
            folderId: folderId || `${file.driveServerId}_${file.driveId}`,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: mediaInfo.type,
            name: mediaInfo.name!,
            overview: mediaInfo.overview,
            posterUrl: mediaInfo.posterUrl,
            backdropUrl: mediaInfo.backdropUrl,
            year: mediaInfo.year,
            rating: mediaInfo.rating,
            genres: mediaInfo.genres || [],
            tmdbId: mediaInfo.tmdbId,
            imdbId: mediaInfo.imdbId,
            tvdbId: mediaInfo.tvdbId,
            seasons: mediaInfo.seasons || [],
            episodes: [currentEpisode], // 只包含当前集
            driveFiles: [file], // 主条目也保存文件引用
            addedAt: new Date()
          }

          console.log(`📺 TV Episode: ${mediaInfo.name} S${seasonEpisode?.season || '?'}E${seasonEpisode?.episode || '?'}`)
        } else {
          // 电影：每个文件一个条目
          mediaItem = {
            id: `${file.driveServerId}_${file.id}`,
            parentId: folderName,
            folderId: folderId || `${file.driveServerId}_${file.driveId}`,
            folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
            type: mediaInfo.type,
            name: mediaInfo.name!,
            overview: mediaInfo.overview,
            posterUrl: mediaInfo.posterUrl,
            backdropUrl: mediaInfo.backdropUrl,
            year: mediaInfo.year,
            rating: mediaInfo.rating,
            genres: mediaInfo.genres || [],
            tmdbId: mediaInfo.tmdbId,
            imdbId: mediaInfo.imdbId,
            tvdbId: mediaInfo.tvdbId,
            driveFiles: [file],
            addedAt: new Date()
          }
        }

        // 使用合并方法添加媒体项
        this.mediaStore.addOrMergeTvSeries(mediaItem)
        this.mediaStore.addToRecentlyAdded(mediaItem)

        console.log(`✅ 已处理: ${file.name} -> ${mediaInfo.name} (${mediaInfo.type}) - TMDB封面`)
      } else {
        // 未匹配的项目 - 使用文件的缩略图作为封面
        const unmatchedItem: MediaLibraryItem = {
          id: `${file.driveServerId}_${file.id}`,
          parentId: folderName,
          folderId: folderId || `${file.driveServerId}_${file.driveId}`,
          folderPath: file.path.substring(0, file.path.lastIndexOf('/')) || '',
          type: 'unmatched',
          name: this.tmdbService.cleanFileName(file.name),
          posterUrl: file.thumbnailLink || undefined,
          genres: [],
          driveFiles: [file],
          addedAt: new Date()
        }

        this.mediaStore.addMediaItem(unmatchedItem) // 未匹配的直接添加
        console.log(`⚠️ 未匹配: ${file.name} - 使用文件缩略图`)
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
import { IAliGetFileModel } from '../aliapi/alimodels'
import AliArchive from '../aliapi/archive'
import AliFile from '../aliapi/file'
import AliFileCmd from '../aliapi/filecmd'
import ServerHttp from '../aliapi/server'
import { ITokenInfo, useFootStore, usePanFileStore, useSettingStore, useUserStore } from '../store'
import { IPageCode, IPageDocx, IPageEpub, IPageImage, IPageOffice, IPagePdf, IPageSheet, IPageVideo, IPageVideoPlaylistEntry } from '../store/appstore'
import UserDAL from '../user/userdal'
import { clickWait } from './debounce'
import DebugLog from './debuglog'
import message from './message'
import { modalArchive, modalArchivePassword, modalSelectPanDir, modalSelectVideoQuality } from './modal'
import PlayerUtils from './playerhelper'
import { getEncType, getProxyUrl, getRawUrl } from './proxyhelper'
import { isAliyunUser, isBaiduUser, isBoxUser, isCloud123User, isDrive115User, isDropboxUser, isOneDriveUser, isPikPakUser } from '../aliapi/utils'

async function resolveTokenForFile(file: IAliGetFileModel): Promise<ITokenInfo | undefined> {
  const explicitUserId = (file as any).user_id as string | undefined
  if (explicitUserId) {
    const token = await UserDAL.GetUserTokenFromDB(explicitUserId)
    if (token?.access_token) return token
  }
  const currentUserId = useUserStore().user_id
  const currentToken = await UserDAL.GetUserTokenFromDB(currentUserId)
  const driveId = file.drive_id || ''
  const matchesCurrent = currentToken && (
    (driveId === 'cloud123' && isCloud123User(currentToken))
    || (driveId === 'drive115' && isDrive115User(currentToken))
    || (driveId === 'baidu' && isBaiduUser(currentToken))
    || (driveId === 'pikpak' && isPikPakUser(currentToken))
    || (driveId === 'dropbox' && isDropboxUser(currentToken))
    || (driveId === 'onedrive' && isOneDriveUser(currentToken))
    || (driveId === 'box' && isBoxUser(currentToken))
    || (!['cloud123', 'drive115', 'baidu', 'pikpak', 'dropbox', 'onedrive', 'box'].includes(driveId) && isAliyunUser(currentToken))
  )
  if (matchesCurrent && currentToken?.access_token) return currentToken

  const userList = await UserDAL.GetUserListFromDB()
  const matched = userList.find((token) => (
    (driveId === 'cloud123' && isCloud123User(token))
    || (driveId === 'drive115' && isDrive115User(token))
    || (driveId === 'baidu' && isBaiduUser(token))
    || (driveId === 'pikpak' && isPikPakUser(token))
    || (driveId === 'dropbox' && isDropboxUser(token))
    || (driveId === 'onedrive' && isOneDriveUser(token))
    || (driveId === 'box' && isBoxUser(token))
    || (!['cloud123', 'drive115', 'baidu', 'pikpak', 'dropbox', 'onedrive', 'box'].includes(driveId) && isAliyunUser(token))
  ))
  if (!matched?.user_id) return currentToken || undefined
  return await UserDAL.GetUserTokenFromDB(matched.user_id) || undefined
}

const TEXT_PREVIEW_EXTS = new Set(['txt', 'text', 'log', 'csv', 'tsv', 'nfo', 'srt', 'vtt', 'ass', 'ssa'])
const PDF_PREVIEW_DRIVES = new Set(['cloud123', 'drive115', 'baidu', 'pikpak', 'dropbox', 'onedrive', 'box'])
const EPUB_PREVIEW_DRIVES = PDF_PREVIEW_DRIVES
const DOCX_PREVIEW_DRIVES = PDF_PREVIEW_DRIVES
const OFFICE_TO_PDF_DRIVES = PDF_PREVIEW_DRIVES
const SHEET_PREVIEW_DRIVES = PDF_PREVIEW_DRIVES
const SHEET_PREVIEW_EXTS = new Set(['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'tsv'])
const OFFICE_TO_PDF_EXTS = new Set(['doc', 'docm', 'dot', 'dotm', 'dotx', 'rtf', 'odt', 'ott', 'wps', 'wpt', 'xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'ods', 'ots', 'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'pot', 'potx', 'odp', 'dps', 'dpt'])

function TextPreviewExt(fileExt: string): string {
  return TEXT_PREVIEW_EXTS.has((fileExt || '').toLowerCase().replace('.', '').trim()) ? 'plain' : ''
}

export async function menuOpenFile(
  file: IAliGetFileModel,
  password: string = '',
  options?: {
    customPlaylistLabel?: string
    customPlaylist?: IPageVideoPlaylistEntry[]
  }
): Promise<void> {
  if (clickWait('menuOpenFile', 500)) return
  const file_id = file.file_id
  let parent_file_id = file.parent_file_id
  if (parent_file_id.includes('root')) parent_file_id = 'root'
  const drive_id = file.drive_id
  if (file.ext == 'zip' || file.ext == 'rar' || file.ext == '7z') {
    if (file.description && file.description.includes('xbyEncrypt')) {
      message.error('不支持在线预览该格式的加密文件')
      return
    }
    Archive(file.drive_id, file.file_id, file.name, file.parent_file_id, file.icon == 'iconweifa')
    return
  }
  if ((file.ext || '').toLowerCase() === 'epub' && EPUB_PREVIEW_DRIVES.has(file.drive_id || '')) {
    await Epub(file, password)
    return
  }
  if (file.ext == 'djvu' || file.ext == 'azw3' || file.ext == 'mobi' || file.ext == 'cbr' || file.ext == 'cbz' || file.ext == 'cbt' || file.ext == 'fb2') {
  }

  if (file.category.startsWith('doc')) {
    const textExt = TextPreviewExt(file.ext)
    if (textExt) {
      await Code(file, textExt, password)
      return
    }
    if ((file.ext || '').toLowerCase() === 'pdf' && PDF_PREVIEW_DRIVES.has(file.drive_id || '')) {
      await Pdf(file, password)
      return
    }
    if ((file.ext || '').toLowerCase() === 'docx' && DOCX_PREVIEW_DRIVES.has(file.drive_id || '')) {
      await Docx(file, password)
      return
    }
    if (SHEET_PREVIEW_EXTS.has((file.ext || '').toLowerCase()) && SHEET_PREVIEW_DRIVES.has(file.drive_id || '')) {
      await Sheet(file, password)
      return
    }
    if (OFFICE_TO_PDF_EXTS.has((file.ext || '').toLowerCase()) && OFFICE_TO_PDF_DRIVES.has(file.drive_id || '')) {
      await OfficePdf(file, password)
      return
    }
    if (file.description && file.description.includes('xbyEncrypt')) {
      const codeExt = PrismExt(file.ext) || TextPreviewExt(file.ext)
      if (file.size < 512 * 1024 || (file.size < 5 * 1024 * 1024 && codeExt)) {
        await Code(file, codeExt, password)
        return
      } else {
        message.error('不支持在线预览该格式的加密文件')
        return
      }
    }
    await Office(file)
    return
  }

  if (file.category == 'image' || file.category == 'image2') {
    await Image(file, password)
    return
  }
  if (file.category == 'image3') {
    message.info('此格式暂不支持预览')
    return
  }
  if (file.category.startsWith('video')) {
    const token = await resolveTokenForFile(file)
    if (!token || !token.access_token) {
      message.error('在线预览失败 账号失效，操作取消')
      return
    }
    // 选择字幕
    let subTitleFile: any
    const { uiVideoPlayer, uiVideoSubtitleMode } = useSettingStore()
    const listDataRaw: IAliGetFileModel[] = usePanFileStore().ListDataRaw || []
    const subTitlesList: IAliGetFileModel[] = listDataRaw.filter((file) => /srt|vtt|ass/.test(file.ext))
    if (uiVideoPlayer === 'other') {
      if (uiVideoSubtitleMode === 'auto') {
        subTitleFile = PlayerUtils.filterSubtitleFile(file.name, subTitlesList)
      } else if (uiVideoSubtitleMode === 'select') {
        modalSelectPanDir(
          'select',
          parent_file_id,
          async (_user_id: string, _drive_id: string, selectFile: any) => {
            await Video(token, file, selectFile, password, options)
          },
          '',
          /srt|vtt|ass/
        )
        return
      }
    }
    await Video(token, file, subTitleFile, password, options)
    return
  }
  if (file.category.startsWith('audio')) {
    await Audio(file, password)
    return
  }
  const codeExt = PrismExt(file.ext) || TextPreviewExt(file.ext)
  if (file.size < 512 * 1024 || (file.size < 5 * 1024 * 1024 && codeExt)) {
    await Code(file, codeExt, password)
    return
  }
  message.info('此格式暂不支持预览')
}

async function Archive(drive_id: string, file_id: string, file_name: string, parent_file_id: string, weifa: boolean): Promise<void> {
  if (weifa) {
    message.error('违规文件，操作取消')
    return
  }
  const user_id = useUserStore().user_id
  const token = await UserDAL.GetUserTokenFromDB(user_id)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const info = await AliFile.ApiFileInfo(user_id, drive_id, file_id)
  if (info && typeof info == 'string') {
    message.error('在线预览失败 获取文件信息出错：' + info)
    return
  }
  let password = ''
  let resp = await AliArchive.ApiArchiveList(user_id, drive_id, file_id, info.domain_id, info.file_extension || '', password)

  if (!resp) {
    message.error('在线预览失败 获取解压信息出错，操作取消')
    return
  }

  if (resp.state == '密码错误' && useSettingStore().yinsiZipPassword) {
    password = await ServerHttp.PostToServer({
      cmd: 'GetZipPwd',
      sha1: info.content_hash,
      size: info.size
    }).then((serdata) => {
      if (serdata.password) return serdata.password
      return ''
    })
    if (password) resp = await AliArchive.ApiArchiveList(user_id, drive_id, file_id, info.domain_id, info.file_extension || '', password)
  }

  if (!resp) {
    message.error('在线预览失败 获取解压信息出错，操作取消')
    return
  }

  if (resp.state == '密码错误') {
    modalArchivePassword(user_id, drive_id, file_id, file_name, parent_file_id, info.domain_id, info.file_extension || '')
  } else if (resp.state == 'Succeed' || resp.state == 'Running') {
    modalArchive(user_id, drive_id, file_id, file_name, parent_file_id, password)
  } else {
    message.error('在线解压失败 ' + resp.state + '，操作取消')
    DebugLog.mSaveDanger('在线解压失败 ' + resp.state, drive_id + ' ' + file_id)
  }
}

async function Video(
  token: ITokenInfo,
  file: IAliGetFileModel,
  subTitleFile: any,
  password: string = '',
  options?: {
    customPlaylistLabel?: string
    customPlaylist?: IPageVideoPlaylistEntry[]
  }
): Promise<void> {
  if (file.icon == 'iconweifa') {
    message.error('在线预览失败 无法预览违规文件')
    return
  }
  let desc = file.description
  const {
    uiAutoColorVideo,
    uiVideoQuality,
    uiVideoQualityTips,
    uiVideoEnablePlayerList,
    uiVideoPlayer,
    uiVideoPlayerPath
  } = useSettingStore()
  if (uiAutoColorVideo && !isPikPakUser(token) && !isDropboxUser(token) && !isOneDriveUser(token) && !isBoxUser(token) && file.drive_id !== 'pikpak' && file.drive_id !== 'dropbox' && file.drive_id !== 'onedrive' && file.drive_id !== 'box' && (!desc || !desc.includes('ce74c3c'))) {
    AliFileCmd.ApiFileColorBatch(token.user_id, file.drive_id, file.description, 'ce74c3c', [file.file_id])
  }
  if (uiVideoPlayer == 'web') {
    let play_cursor = 0
    let playCursorInfo = await PlayerUtils.getPlayCursor(token.user_id, file.drive_id, file.file_id)
    if (playCursorInfo) {
      play_cursor = playCursorInfo.play_cursor
    } else {
      play_cursor = file.media_play_cursor ? parseInt(file.media_play_cursor) : 0
    }
    // 获取文件夹信息
    const info = await AliFile.ApiFileInfo(token.user_id, file.drive_id, file.parent_file_id)
    let parent_file_name = ''
    if (info && typeof info !== 'string') {
      parent_file_name = info.name
    }
    const pageVideo: IPageVideo = {
      user_id: token.user_id,
      file_name: file.name,
      html: file.name,
      drive_id: file.drive_id,
      file_id: file.file_id,
      parent_file_id: file.parent_file_id,
      parent_file_name: parent_file_name,
      expire_time: 0,
      password: password,
      encType: getEncType(playCursorInfo?.info || ''),
      play_cursor: play_cursor,
      custom_playlist_label: options?.customPlaylistLabel || '',
      custom_playlist: options?.customPlaylist || []
    }
    window.WebOpenWindow({ page: 'PageVideo', data: pageVideo, theme: 'dark' })
    return
  }
  message.loading('加载中...', 2)
  const isWindows = window.platform === 'win32'
  const isMacOrLinux = ['darwin', 'linux'].includes(window.platform)
  if (!isWindows && !isMacOrLinux) {
    message.error('不支持的系统，操作取消')
    return
  }
  let rawData: any = undefined
  let encType = getEncType(file)
  if (uiVideoQualityTips || !uiVideoEnablePlayerList) {
    rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, encType, password, file.icon == 'iconweifa', 'video')
    if (typeof rawData == 'string') {
      message.error('视频地址解析失败，操作取消')
      return
    }
    if (rawData.url.indexOf('x-oss-additional-headers=referer') > 0) {
      message.error('用户token已过期，请点击头像里退出按钮后重新登录账号')
      return
    }
  }
  let otherArgs: any = {
    file, subTitleFile,
    playList: [],
    fileList: [],
    playFileListPath: '',
    rawData, password,
    quality: uiVideoQuality
  }
  // 清晰度选择
  if (uiVideoQualityTips && !encType) {
    if (rawData) {
      modalSelectVideoQuality(file, rawData, async (quality: any) => {
        otherArgs.quality = quality
        await PlayerUtils.startPlayer(token, uiVideoPlayerPath, otherArgs)
      })
    } else {
      message.error('视频地址解析失败，操作取消')
    }
  } else {
    await PlayerUtils.startPlayer(token, uiVideoPlayerPath, otherArgs)
  }
}

async function Image(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const fileList = usePanFileStore().ListDataRaw
  const imageList = fileList.filter((v) => v.category == 'image' || v.category == 'image2')
  if (imageList.length == 0) {
    message.error('获取文件预览链接失败，操作取消')
    return
  }

  const pageImage: IPageImage = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    mode: useSettingStore().uiImageMode,
    password: password,
    imageList: imageList
  }
  window.WebOpenWindow({ page: 'PageImage', data: pageImage, theme: 'dark' })
}

async function Pdf(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, file.icon == 'iconweifa', 'other', 'Origin')
  if (typeof rawData === 'string' || !rawData.url) {
    message.error(typeof rawData === 'string' ? rawData : '获取 PDF 预览链接失败，操作取消')
    return
  }
  const pagePdf: IPagePdf = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    preview_url: getProxyUrl({
      user_id: token.user_id,
      drive_id: file.drive_id,
      file_id: file.file_id,
      file_size: rawData.size || file.size,
      proxy_url: rawData.url,
      content_disposition: 'inline',
      file_name: file.name
    })
  }
  window.WebOpenWindow({ page: 'PagePdf', data: pagePdf, theme: 'dark' })
}

async function Epub(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, file.icon == 'iconweifa', 'other', 'Origin')
  if (typeof rawData === 'string' || !rawData.url) {
    message.error(typeof rawData === 'string' ? rawData : '获取 EPUB 预览链接失败，操作取消')
    return
  }
  const pageEpub: IPageEpub = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    preview_url: getProxyUrl({
      user_id: token.user_id,
      drive_id: file.drive_id,
      file_id: file.file_id,
      file_size: rawData.size || file.size,
      proxy_url: rawData.url,
      content_disposition: 'inline',
      file_name: file.name
    })
  }
  window.WebOpenWindow({ page: 'PageEpub', data: pageEpub, theme: 'dark' })
}

async function Docx(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, file.icon == 'iconweifa', 'other', 'Origin')
  if (typeof rawData === 'string' || !rawData.url) {
    message.error(typeof rawData === 'string' ? rawData : '获取 Word 预览链接失败，操作取消')
    return
  }
  const pageDocx: IPageDocx = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    preview_url: getProxyUrl({
      user_id: token.user_id,
      drive_id: file.drive_id,
      file_id: file.file_id,
      file_size: rawData.size || file.size,
      proxy_url: rawData.url,
      content_disposition: 'inline',
      file_name: file.name
    })
  }
  window.WebOpenWindow({ page: 'PageDocx', data: pageDocx, theme: 'dark' })
}

async function OfficePdf(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('正在转换文档...', 2)
  const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, file.icon == 'iconweifa', 'other', 'Origin')
  if (typeof rawData === 'string' || !rawData.url) {
    message.error(typeof rawData === 'string' ? rawData : '获取文档预览链接失败，操作取消')
    return
  }
  const sourceUrl = getProxyUrl({
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_size: rawData.size || file.size,
    proxy_url: rawData.url,
    content_disposition: 'inline',
    file_name: file.name
  })
  const converted = await window.TvBoxInvoke('OfficePreview:convertToPdf', {
    sourceUrl,
    fileName: file.name
  }) as { ok: boolean; pdfUrl?: string; error?: string }
  if (!converted?.ok || !converted.pdfUrl) {
    message.error(converted?.error || '文档转换 PDF 失败，操作取消')
    return
  }
  const pagePdf: IPagePdf = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name + '.pdf',
    preview_url: converted.pdfUrl
  }
  window.WebOpenWindow({ page: 'PagePdf', data: pagePdf, theme: 'dark' })
}

async function Sheet(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, file.icon == 'iconweifa', 'other', 'Origin')
  if (typeof rawData === 'string' || !rawData.url) {
    message.error(typeof rawData === 'string' ? rawData : '获取表格预览链接失败，操作取消')
    return
  }
  const pageSheet: IPageSheet = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    preview_url: getProxyUrl({
      user_id: token.user_id,
      drive_id: file.drive_id,
      file_id: file.file_id,
      file_size: rawData.size || file.size,
      proxy_url: rawData.url,
      content_disposition: 'inline',
      file_name: file.name
    })
  }
  window.WebOpenWindow({ page: 'PageSheet', data: pageSheet, theme: 'dark' })
}

async function Office(file: IAliGetFileModel): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  let data = await AliFile.ApiOfficePreViewUrl(token.user_id, file.drive_id, file.file_id)
  if (!data?.preview_url && !isAliyunUser(token)) {
    const rawData = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), '', file.icon == 'iconweifa', 'other', 'Origin')
    if (typeof rawData !== 'string' && rawData.url) {
      data = {
        drive_id: file.drive_id,
        file_id: file.file_id,
        preview_url: rawData.url,
        access_token: ''
      }
    }
  }
  if (!data?.preview_url) {
    message.error('获取文件预览链接失败，操作取消')
    return
  }
  const pageOffice: IPageOffice = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    preview_url: data.preview_url,
    access_token: data.access_token
  }
  window.WebOpenWindow({ page: 'PageOffice', data: pageOffice })
}

async function Audio(file: IAliGetFileModel, password: string = ''): Promise<void> {
  const weifa = file.icon == 'iconweifa'
  if (weifa) {
    message.error('在线预览失败 无法预览违规文件')
    return
  }

  message.loading('加载中...', 2)
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  const data = await getRawUrl(token.user_id, file.drive_id, file.file_id, getEncType(file), password, weifa, 'audio')
  if (typeof data != 'string') {
    useFootStore().mSaveAudioUrl(data.url)
  } else {
    message.error(data)
  }
}

async function Code(file: IAliGetFileModel, codeExt: string, password: string = ''): Promise<void> {
  const token = await resolveTokenForFile(file)
  if (!token || !token.access_token) {
    message.error('在线预览失败 账号失效，操作取消')
    return
  }
  message.loading('加载中...', 2)
  const pageCode: IPageCode = {
    user_id: token.user_id,
    drive_id: file.drive_id,
    file_id: file.file_id,
    file_name: file.name,
    code_ext: codeExt,
    file_size: file.size,
    encType: getEncType(file),
    password: password
  }
  window.WebOpenWindow({ page: 'PageCode', data: pageCode, theme: 'dark' })
}

export function PrismExt(fileExt: string): string {
  const ext = '.' + fileExt.toLowerCase() + '.'
  const fext = fileExt.toLowerCase()
  let iscode = false
  let codeext = ''
  iscode = iscode || ';.markup.html.xml.svg.mathml.ssml.atom.rss.css.clike.javascript.js.abap.'.indexOf(ext) > 0
  iscode = iscode || ';.actionscript.ada.agda.al.antlr4.g4.apacheconf.apex.apl.applescript.abnf.'.indexOf(ext) > 0
  iscode = iscode || ';.aql.arduino.arff.asciidoc.adoc.aspnet.asm6502.autohotkey.autoit.bash.shell.'.indexOf(ext) > 0
  iscode = iscode || ';.basic.batch.bbcode.shortcode.birb.bison.bnfrbnf.brainfuck.brightscript.'.indexOf(ext) > 0
  iscode = iscode || ';.bro.bsl.oscript.c.csharp.cs.dotnet.cpp.cfscript.cfc.chaiscript.cil.clojure.cmake.'.indexOf(ext) > 0
  iscode = iscode || ';.cobol.coffeescript.coffee.concurnas.conc.csp.coq.crystal.css-extras.csv.cypher.n4jsd.'.indexOf(ext) > 0
  iscode = iscode || ';.d.dart.dataweave.dax.dhall.diff.django.jinja2.dns-zone-file.dns-zone..purs.purescript.'.indexOf(ext) > 0
  iscode = iscode || ';.docker.dockerfile.dot.gv.ebnf.editorconfig.eiffel.ejs.eta.elixir.elm.etlua.erb.erlang.'.indexOf(ext) > 0
  iscode = iscode || ';.fsharp.factor.false.firestore-security-rules.flow.fortran.ftl.gml.gamemakerlanguage.'.indexOf(ext) > 0
  iscode = iscode || ';.gcode.gdscript.gedcom.gherkin.git.glsl.go.graphql.groovy.haml.handlebars.hbs.'.indexOf(ext) > 0
  iscode = iscode || ';.haskell.hs.haxe.hcl.hlsl.hoon.http.hpkp.hsts.ichigojam.icon.icu-message-format.'.indexOf(ext) > 0
  iscode = iscode || ';.idris.idr.ignore.gitignore.hgignore.npmignore.inform7.ini.io.j.java.javadoc.javadoclike.'.indexOf(ext) > 0
  iscode = iscode || ';.javastacktrace.jexl.jolie.jq.jsdoc.js-extras.json.webmanifest.json5.jsonp.jsstacktrace.px.'.indexOf(ext) > 0
  iscode = iscode || ';.js-templates.julia.keyman.kotlin.kt.kts.kumir.kum.latex.tex.context.latte.less.lilypond.ly.'.indexOf(ext) > 0
  iscode = iscode || ';.liquid.lisp.emacs.elisp.emacs-lisp.livescript.llvm.log.lolcode.lua.makefile.markdown.md.'.indexOf(ext) > 0
  iscode = iscode || ';.markup-templating.matlab.mel.mizar.mongodb.monkey.moonscript.moon.n1ql.n4js.'.indexOf(ext) > 0
  iscode = iscode || ';.nand2tetris-hdl.naniscript.nani.nasm.neon.nevod.nginx.nim.nix.nsis.objectivec.objc.'.indexOf(ext) > 0
  iscode = iscode || ';.ocaml.opencl.openqasm.qasm.oz.parigp.parser.pascal.objectpascal.pascaligo.psl.pcaxis.'.indexOf(ext) > 0
  iscode = iscode || ';.peoplecode.pcode.perl.php.phpdoc.php-extras.plsql.powerquery.pq.mscript.powershell.'.indexOf(ext) > 0
  iscode = iscode || ';.processing.prolog.promql.properties.protobuf.pug.puppet.pure.purebasic.pbfasm.twig.'.indexOf(ext) > 0
  iscode = iscode || ';.python.py.qsharp.qs.q.qml.qore.r.racket.rkt.jsx.tsx.reason.regex.rego.renpy.rpy.rest.rip.'.indexOf(ext) > 0
  iscode = iscode || ';.robotframework.robot.ruby.rb.rust.sas.sass.scss.scala.scheme.shell-session.sh-session.sql.'.indexOf(ext) > 0
  iscode = iscode || ';.smali.smalltalk.smarty.sml.smlnj.solidity.sol.solution-file.sln.soy.sparql.rq.splunk-spl.sqf.'.indexOf(ext) > 0
  iscode = iscode || ';.squirrel.stan.iecst.stylus.swift.t4-templating.t4-cs.t4.t4-vb.tap.tcl.tt2.textile.toml.turtle.trig.'.indexOf(ext) > 0
  iscode = iscode || ';.typescript.ts.typoscript.tsconfig.unrealscript.uscript.uc.uri.url.v.vala.vbnet.velocity.verilog.'.indexOf(ext) > 0
  iscode = iscode || ';.vim.visual-basic.vb.vba.warpscript.wasm.wiki.wolfram.mathematica.nb.wl.xeora.xeoracube.'.indexOf(ext) > 0
  iscode = iscode || ';.xml-doc.xojo.xquery.yaml.yml.yang.zig.excel-formula.xlsx.xls.shellsession.roboconf.vhdl.'.indexOf(ext) > 0

  if (iscode) {
    codeext = fext
  } else {
    switch (fext) {
      case 'prettierrc':
        codeext = 'json'
        break
      case 'vue':
        codeext = 'javascript'
        break
      case 'h':
        codeext = 'c'
        break
      case 'as':
        codeext = 'actionscript'
        break
      case 'sh':
        codeext = 'bash'
        break
      case 'zsh':
        codeext = 'bash'
        break
      case 'bf':
        codeext = 'brainfuck'
        break
      case 'hpp':
        codeext = 'cpp'
        break
      case 'cc':
        codeext = 'cpp'
        break
      case 'hh':
        codeext = 'cpp'
        break
      case 'c++':
        codeext = 'cpp'
        break
      case 'h++':
        codeext = 'cpp'
        break
      case 'cxx':
        codeext = 'cpp'
        break
      case 'hxx':
        codeext = 'cpp'
        break
      case 'cson':
        codeext = 'coffeescript'
        break
      case 'iced':
        codeext = 'coffeescript'
        break
      case 'dns':
        codeext = 'dns-zone'
        break
      case 'zone':
        codeext = 'dns-zone'
        break
      case 'bind':
        codeext = 'dns-zone'
        break
      case 'plist':
        codeext = 'xml'
        break
      case 'xhtml':
        codeext = 'html'
        break
      case 'iml':
        codeext = 'xml'
        break
      case 'mk':
        codeext = 'makefile'
        break
      case 'mak':
        codeext = 'makefile'
        break
      case 'make':
        codeext = 'makefile'
        break
      case 'mkdown':
        codeext = 'markdown'
        break
      case 'mkd':
        codeext = 'markdown'
        break
      case 'nginxconf':
        codeext = 'nginx'
        break
      case 'nimrod':
        codeext = 'nim'
        break
      case 'mm':
        codeext = 'objectivec'
        break
      case 'obj-c':
        codeext = 'objectivec'
        break
      case 'obj-c++':
        codeext = 'objectivec'
        break
      case 'objective-c++':
        codeext = 'objectivec'
        break
      case 'ps':
        codeext = 'powershell'
        break
      case 'ps1':
        codeext = 'powershell'
        break
      case 'gyp':
        codeext = 'python'
        break
      case 'rs':
        codeext = 'rust'
        break
      case 'vb':
        codeext = 'vbnet'
        break
      case 'conf':
        codeext = 'ini'
        break
    }
  }
  return codeext
}

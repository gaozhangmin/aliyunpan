import { IAliGetFileModel } from '../../aliapi/alimodels'
import path from 'path'
import {
  useUserStore,
  useSettingStore,
  useM3u8DownloadedStore,
  useM3u8DownloadingStore,
  useFootStore, useDowningStore, useDownedStore
} from '../../store'
import {
  AriaAddUrl,
  AriaConnect, AriaDeleteList,
  AriaGetM3u8DowningList,
  AriaHashFile, AriaStopList,
  FormatAriaError,
  IsAria2cRemote
} from '../../utils/aria2c'
import { humanSize, humanSizeSpeed } from '../../utils/format'
import {Howl} from "howler";
import {ClearFileName} from "../../utils/filehelper";
import TreeStore from "../../store/treestore";
import fs from "fs";
import { execFile } from 'child_process'
import DBDown from '../../utils/dbdown'
import { IAriaDownProgress, IStateDownFile } from '../DownDAL'
import { getEncType } from '../../utils/proxyhelper'
import fsPromises from 'fs/promises'

/** 存盘的时机：默认 10 时进行 */
let SaveTimeWait = 0
/** 下载正在执行中的数据 */
export let DownInExeMap = new Map<string, IStateDownFile>()
/** 下载正在队列中的数据 */
export let DownInQueues: IStateDownFile[] = []

const sound = new Howl({
  src: ['./audio/down_finished.mp3'], // 音频文件路径
  autoplay: false, // 是否自动播放
  volume: 1.0, // 音量，范围 0.0 ~ 1.0
});

export default class M3u8DownloadDAL {

  /**
   * 从DB中加载数据
   */
  static async aReloadDowning() {
    const downingStore = useM3u8DownloadingStore()
    if (downingStore.ListLoading) return
    downingStore.ListLoading = true
    const stateDownFiles = await DBDown.getDowningAll()
    // 首次从DB中加载数据，如果上次意外停止则重新开始，如果手动暂停则保持
    for (const stateDownFile of stateDownFiles) {
      if (!stateDownFile.Down.IsStop && stateDownFile.Down.DownState != '队列中') {
        const down = stateDownFile.Down
        down.IsDowning = false
        down.IsCompleted = false
        down.IsStop = false
        down.DownState = '队列中'
        down.DownSpeed = 0
        down.DownSpeedStr = ''
        down.IsFailed = false
        down.FailedCode = 0
        down.FailedMessage = ''
        down.AutoTry = 0
        down.IsDowning = false
      }
    }
    downingStore.ListDataRaw = stateDownFiles
    downingStore.ListLoading = false
    downingStore.mRefreshListDataShow(true)
  }

  static async aReloadDowned() {
    const downedStore = useM3u8DownloadedStore()
    if (downedStore.ListLoading) return
    downedStore.ListLoading = true
    const max = useSettingStore().debugDownedListMax
    const showlist = await DBDown.getDownedByTop(max)
    const count = await DBDown.getDownedTaskCount()
    downedStore.aLoadListData(showlist, count)
    downedStore.ListLoading = false
  }

  static async aClearDowned() {
    const max = useSettingStore().debugDownedListMax
    return await DBDown.deleteDownedOutCount(max)
  }

  /**
   * 添加到下载动作
   * @param fileList
   * @param savePath
   * @param needPanPath
   * @param tip
   */
  static aAddDownload(fileList: IAliGetFileModel[], savePath: string, needPanPath: boolean, tip: boolean) {
    const userID = useUserStore().user_id
    const settingStore = useSettingStore()

    if (savePath.endsWith('/')) savePath = savePath.substr(0, savePath.length - 1);
    if (savePath.endsWith('\\')) savePath = savePath.substr(0, savePath.length - 1);

    const downlist: IStateDownFile[] = [];
    const dTime = Date.now();

    let cPid = '';
    let cPath = '';
    const ariaRemote = settingStore.ariaState == 'remote';
    const sep = settingStore.ariaSavePath.indexOf('/') >= 0 ? '/' : '\\';
    for (let f = 0; f < fileList.length; f++) {
      const file = fileList[f];
      const name = ClearFileName(file.name);
      let fullPath = savePath;
      if (needPanPath) {
        if (cPath != '' && cPid == file.parent_file_id) fullPath = cPath;
        else {
          let cPath2 = savePath;
          const plist = TreeStore.GetDirPath(file.drive_id, file.parent_file_id);
          for (let p = 0; p < plist.length; p++) {
            const pName = ClearFileName(plist[p].name)
            if (pName == '根目录') continue
            if (path.join(cPath2, pName, name).length > 250) break
            cPath2 = path.join(cPath2, pName);
          }
          cPid = file.parent_file_id;
          cPath = cPath2;
          fullPath = cPath2;
        }
      }

      if (ariaRemote) {
        if (sep == '/') fullPath = fullPath.replace(/\\/g, '/');
        else fullPath = fullPath.replace(/\//g, '\\');
      }

      let sizehex = file.size.toString(16).toLowerCase();
      if (sizehex.length > 4) sizehex = sizehex.substr(0, 4);

      let crc64 = '';

      const downitem: IStateDownFile = {
        DownID: userID + '|' + file.file_id,
        Info: {
          GID: file.file_id.toLowerCase().substring(file.file_id.length - 16 + sizehex.length) + sizehex,
          user_id: userID,
          DownSavePath: fullPath,
          ariaRemote: ariaRemote,
          file_id: file.file_id,
          drive_id: file.drive_id,
          name: name,
          size: file.size,
          sizestr: file.sizeStr,
          isDir: file.isDir,
          icon: file.icon,
          encType: getEncType(file),
          sha1: '',
          crc64: crc64,
          m3u8_total_file_nums: file.m3u8_total_file_nums,
          m3u8_parent_file_name: file.m3u8_parent_file_name,
        },
        Down: {
          DownState: '队列中',
          DownTime: dTime,
          DownSize: 0,
          DownSpeed: 0,
          DownSpeedStr: '',
          DownProcess: 0,
          IsStop: false,
          IsDowning: false,
          IsCompleted: false,
          IsFailed: false,
          FailedCode: 0,
          FailedMessage: '',
          AutoTry: 0,
          DownUrl: file.download_url || '',
        },
      };
      AriaStopList([downitem.Info.GID]).then(r => {})
      AriaDeleteList([downitem.Info.GID]).then(r => {})
      if (downitem.Info.ariaRemote && !downitem.Info.isDir) downitem.Info.icon = 'iconfont iconcloud-download';
      downlist.push(downitem);
    }

    useM3u8DownloadingStore().mAddDownload({ downlist});
  }

  /**
   * 速度事件动作
   */
  static async aSpeedEvent() {
    const downingStore = useM3u8DownloadingStore()
    const downedStore = useM3u8DownloadedStore()
    const settingStore = useSettingStore()

    const isOnline = await AriaConnect()
    if (isOnline && downingStore.ListDataRaw.length) {
      await AriaGetM3u8DowningList()
      const ariaRemote = IsAria2cRemote()
      const DowningList: IStateDownFile[] = downingStore.ListDataRaw
      const timeThreshold = Date.now() - 60 * 1000
      const downFileMax = settingStore.downFileMax
      const shouldSkipDown = (Down: any) => {
        return (
          Down.IsCompleted ||
          Down.IsStop ||
          Down.IsDowning ||
          (Down.IsFailed && timeThreshold <= Down.AutoTry)
        )
      }
      let addDowningCount = 0
      for (let i = 0; i < DowningList.length; i++) {
        const DownItem = DowningList[i]
        const { DownID, Info, Down } = DownItem
        if (Info.ariaRemote !== ariaRemote) continue
        if (Down.IsCompleted && Down.DownState === '已完成') {
          // 将下载标记为已完成并添加到列表以供稍后处理
          const completedDownId = `${Date.now()}_${Down.DownTime}`
          // 删除已完成的下载并更新数据库
          DowningList.splice(i, 1)
          await DBDown.deleteDowning(DownID)
          // 将已完成的下载添加到下载文件列表中
          const downedData = JSON.parse(JSON.stringify({ DownID: completedDownId, Down, Info }))
          downedStore.ListDataRaw.unshift({ DownID: completedDownId, Down, Info })
          downedStore.mRefreshListDataShow(true)
          await DBDown.saveDowned(completedDownId, downedData)
          if (downedStore.ListSelected.has(completedDownId)) {
            downedStore.ListSelected.delete(completedDownId)
          }
          // 移除Aria2已完成的任务
          await AriaDeleteList([Info.GID])
          i--
        } else if ((addDowningCount + downingStore.ListDataDowningCount) < downFileMax && !shouldSkipDown(Down)) {
          addDowningCount++
          downingStore.mUpdateDownState(DownItem, 'start')
          let state = await AriaAddUrl(DownItem)
          downingStore.mUpdateDownState(DownItem, state)
        }
      }
    } else {
      useFootStore().mSaveDownTotalSpeedInfo('')
    }
    downingStore.mRefreshListDataShow(true)
    downedStore.mRefreshListDataShow(true)
  }

  static compareTsFiles(a: string, b: string): number {
    const numA = parseInt(a.match(/\/(\d+)\.ts/)![1]);
    const numB = parseInt(b.match(/\/(\d+)\.ts/)![1]);
    return numA - numB;
  }

  static countM3u8TsFileNum(directoryPath:string):string[] {
    const files = fs.readdirSync(directoryPath);
    const filesList:string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.endsWith('.ts')) {
        filesList.push('file '+ path.join(directoryPath, file))
      }
    }
    return filesList.sort(this.compareTsFiles);
  }

  static unlinkM3u8TsFiles(directoryPath:string):void {
    const files = fs.readdirSync(directoryPath);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.endsWith('.ts')) {
        fs.unlink(path.join(directoryPath, file), (err) => {
          if (err) {
            console.error('Failed to delete the file: ' + path.join(directoryPath, file), err);
          }
        });
      }
    }
  }

  static  tryConcatM3u8Video(downItem:IStateDownFile) {
    if (downItem.Info.m3u8_parent_file_name) {
      const fileNameList = M3u8DownloadDAL.countM3u8TsFileNum(downItem.Info.DownSavePath)
      if (fileNameList.length === downItem.Info.m3u8_total_file_nums) {
        const m3u8FileName = path.join(downItem.Info.DownSavePath, "m3u8_files.txt")
        if (!fs.existsSync(m3u8FileName)) {
          fs.writeFileSync(m3u8FileName, fileNameList.join('\n'))
          const ffmpegPath = useSettingStore().ffmpegPath
          //ffmpeg -f concat -safe 0 -i input.txt -c copy output.mp4
          const args = [
            '-f', 'concat',
            '-safe', '0',
            '-i', m3u8FileName,
            '-c', 'copy',
            path.join(downItem.Info.DownSavePath, downItem.Info.m3u8_parent_file_name)
          ];
          execFile(ffmpegPath, args, (error, stdout, stderr) => {
            if (error) {
              console.error(`执行FFmpeg命令时出错：${error}`);
              return;
            } else {
              M3u8DownloadDAL.unlinkM3u8TsFiles(downItem.Info.DownSavePath)
              fs.unlink(m3u8FileName, (err) => {

              });
              console.log('视频合并完成！');
            }
          });
        }
      }
    }
  }

  static mSpeedEvent(list: IAriaDownProgress[]) {
    const downingStore = useM3u8DownloadingStore()
    const settingStore = useSettingStore()
    const DowningList: IStateDownFile[] = downingStore.ListDataRaw
    const ariaRemote = !settingStore.AriaIsLocal

    const dellist: string[] = []
    const saveList: IStateDownFile[] = []

    let hasSpeed = 0

    for (const listItem of list) {
      try {
        const { gid, status, totalLength, completedLength, downloadSpeed, errorCode, errorMessage } = listItem
        const isComplete = status === 'complete'
        const isDowning = isComplete || status === 'active' || status === 'waiting'
        const isStop = status === 'paused' || status === 'removed'
        const isError = status === 'error'
        const downingItem: IStateDownFile | undefined = DowningList.find((item) => item.Info.ariaRemote === ariaRemote && item.Info.GID === gid)
        if (!downingItem) continue
        const { DownID, Down, Info } = downingItem
        const totalLengthInt = parseInt(totalLength) || 0
        Down.DownSize = parseInt(completedLength) || 0
        Down.DownSpeed = parseInt(downloadSpeed) || 0
        Down.DownSpeedStr = humanSize(Down.DownSpeed) + '/s'
        Down.DownProcess = Math.floor((Down.DownSize * 100) / (totalLengthInt + 1)) % 100
        Down.IsCompleted = isComplete
        Down.IsDowning = isDowning
        Down.IsFailed = isError
        Down.IsStop = isStop
        if (errorCode && errorCode !== '0') {
          Down.FailedCode = parseInt(errorCode) || 0
          Down.FailedMessage = FormatAriaError(errorCode, errorMessage)
        }
        if (isComplete) {
          downingStore.mUpdateDownState(downingItem, 'valid')
          const check = AriaHashFile(downingItem)
          if (check.Check) {
            if (useSettingStore().downFinishAudio && !sound.playing()) {
              sound.play()
            }
            downingStore.mUpdateDownState(downingItem, 'downed')
            this.tryConcatM3u8Video(downingItem)
          } else {
            downingStore.mUpdateDownState(downingItem, 'error', '移动文件失败，请重新下载')
          }
        } else if (isStop) {
          downingStore.mUpdateDownState(downingItem, 'stop')
          dellist.push(gid)
        } else if (isError) {
          if (!Down.FailedMessage) {
            Down.FailedMessage = '下载失败'
          }
          downingStore.mUpdateDownState(downingItem, 'error', Down.FailedMessage)
          dellist.push(gid)
        } else if (isDowning) {
          hasSpeed += Down.DownSpeed
          let lastTime = ((totalLengthInt - Down.DownSize) / (Down.DownSpeed + 1)) % 356400
          if (lastTime < 1) lastTime = 1
          // 进度条
          Down.DownState =
            `${Down.DownProcess}% ${(lastTime / 3600).toFixed(0).padStart(2, '0')}:${((lastTime % 3600) / 60)
              .toFixed(0)
              .padStart(2, '0')}:${(lastTime % 60).toFixed(0).padStart(2, '0')}`
          if (SaveTimeWait > 10) {
            saveList.push(downingItem)
          }
        }
        downingStore.mRefreshListDataShow(true)
      } catch {
        // Ignore any errors
      }
    }
    // 存盘时间
    SaveTimeWait = (SaveTimeWait + 1) % 11
    if (saveList.length) {
      DBDown.saveDownings(JSON.parse(JSON.stringify(saveList)))
    }
    if (dellist.length) {
      AriaDeleteList(dellist).then()
    }
    useFootStore().mSaveDownTotalSpeedInfo(hasSpeed && humanSizeSpeed(hasSpeed) || '')
  }

  static async deleteDowning(isAll: boolean, deleteList: IStateDownFile[], gidList: string[]) {
    // 处理待删除文件
    if (!isAll) {
      const downIDList = deleteList.map(item => item.DownID)
      // console.log('deleteDowning', deleteList)
      await DBDown.deleteDownings(JSON.parse(JSON.stringify(downIDList)))
    } else {
      await DBDown.deleteDowningAll()
    }
    // 停止aria2下载任务
    await AriaStopList(gidList)
    await AriaDeleteList(gidList)
    // 删除临时文件
    for (let downFile of deleteList) {
      let downInfo = downFile.Info
      if (downInfo.ariaRemote) continue
      try {
        if (!downInfo.isDir) {
          let filePath = path.join(downInfo.DownSavePath, downInfo.name)
          let tmpFilePath1 = filePath + '.td.aria2'
          let tmpFilePath2 = filePath + '.td'
          await fsPromises.rm(tmpFilePath1, { recursive: true })
          await fsPromises.rm(tmpFilePath2, { recursive: true })
        }
      } catch (e) {
      }
    }
  }

  static async deleteDowned(isAll: boolean, deleteList: IStateDownFile[]) {
    if (!isAll) {
      // 处理待删除状态
      const downIDList = deleteList
        .filter(list => list.Down.DownState === '待删除')
        .map(item => item.DownID)
      console.log('downedList', deleteList)
      await DBDown.deleteDowneds(JSON.parse(JSON.stringify(downIDList)))
    } else {
      await DBDown.deleteDownedAll()
    }
  }

  static async stopDowning(downList: IStateDownFile[], gidList: string[]) {
    await DBDown.saveDownings(JSON.parse(JSON.stringify(downList)))
    await AriaStopList(gidList)
  }

  static QueryIsDowning() {
    return useM3u8DownloadingStore().ListDataDowningCount > 0
  }
}

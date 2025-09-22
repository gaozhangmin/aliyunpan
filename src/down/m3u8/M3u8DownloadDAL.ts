import { IAliGetFileModel } from '../../aliapi/alimodels'
import path from 'path'
import {
  useUserStore,
  useSettingStore,
  useM3u8DownloadedStore,
  useM3u8DownloadingStore,
  useFootStore,
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

export interface IStateDownFile {
  DownID: string
  Info: IStateDownInfo

  Down: {

    DownState: string
    DownTime: number
    DownSize: number
    DownSpeed: number
    DownSpeedStr: string
    DownProcess: number
    IsStop: boolean
    IsDowning: boolean
    IsCompleted: boolean
    IsFailed: boolean
    FailedCode: number
    FailedMessage: string

    AutoTry: number

    DownUrl: string
  }
}
export interface IStateDownInfo {

  GID: string
  user_id: string

  DownSavePath: string
  ariaRemote: boolean

  file_id: string
  drive_id: string

  name: string

  size: number
  sizestr: string
  icon: string
  isDir: boolean

  sha1: string

  crc64: string
  m3u8_total_file_nums?:number
  m3u8_parent_file_name?:string
}


export interface IAriaDownProgress {
  gid: string
  status: string
  totalLength: string
  completedLength: string
  downloadSpeed: string
  errorCode: string
  errorMessage: string
}

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
  static async aReloadDowning () {
    const downingStore = useM3u8DownloadingStore()
    if(downingStore.ListLoading) return
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
        down.DownSpeed = 0;
        down.DownSpeedStr = ''
        down.IsFailed = false
        down.FailedCode = 0;
        down.FailedMessage = ''
        down.AutoTry = 0;
        down.IsDowning = false
      }
    }
    downingStore.ListDataRaw = stateDownFiles
    downingStore.mRefreshListDataShow(true)
    downingStore.ListLoading = false
  }

  static async aReloadDowned () {
    const downedStore = useM3u8DownloadedStore()
    if(downedStore.ListLoading) return
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

    useM3u8DownloadingStore().mAddDownload({ downlist, tip});
  }

  /**
   * 速度事件动作
   */
  static async aSpeedEvent() {
    const downingStore = useM3u8DownloadingStore()
    const settingStore = useSettingStore()

    const isOnline = await AriaConnect()
    if (isOnline) {
      await AriaGetM3u8DowningList().catch(() => {
        //
      });

      const DowningList = useM3u8DownloadingStore().ListDataRaw
      let downingCount = 0;
      const ariaRemote = IsAria2cRemote()
      for (let j = 0; j < DowningList.length; j++) {
        if (DowningList[j].Info.ariaRemote != ariaRemote) continue;
        if (DowningList[j].Down.IsDowning) {
          downingCount++;
        }
        if (DowningList[j].Down.IsCompleted && DowningList[j].Down.DownState === '已完成') {
          downingStore.mSaveToDowned(DowningList[j].DownID);
          j--;
        }
      }
      const time = Date.now() - 60 * 1000;
      for (let j = 0; j < DowningList.length; j++) {
        if (downingCount >= settingStore.downFileMax) break;
        if (DowningList[j].Info.ariaRemote != ariaRemote) continue;
        const DownID = DowningList[j].DownID;
        const down = DowningList[j].Down;
        if (down.IsCompleted == false && down.IsStop == false && down.IsDowning == false) {
          if (down.IsFailed == false || time > down.AutoTry) {
            downingCount += 1;
            downingStore.mUpdateDownState({ DownID, IsDowning: true, DownSpeedStr: '', DownState: '解析中', DownTime: Date.now(), FailedCode: 0, FailedMessage: '' });

            AriaAddUrl(DowningList[j]).then((ret) => {
              if (ret == 'downed') {
                downingStore.mUpdateDownState({
                  DownID,
                  IsDowning: true,
                  IsCompleted: true,
                  DownProcess: 100,
                  DownSpeedStr: '',
                  DownState: '已完成',
                  AutoTry: 0,
                  IsFailed: false,
                  IsStop: false,
                  FailedCode: 0,
                  FailedMessage: '',
                });
              } else if (ret == 'success') {
                downingStore.mUpdateDownState({
                  DownID,
                  IsDowning: true,
                  IsCompleted: false,
                  DownSpeedStr: '',
                  DownState: '下载中',
                  AutoTry: 0,
                  IsFailed: false,
                  IsStop: false,
                  FailedCode: 0,
                  FailedMessage: '',
                });
              } else if (ret == '已暂停') {
                downingStore.mUpdateDownState({
                  DownID,
                  IsDowning: false,
                  IsCompleted: false,
                  DownSpeedStr: '',
                  DownState: '已暂停',
                  AutoTry: 0,
                  IsFailed: false,
                  IsStop: true,
                  FailedCode: 0,
                  FailedMessage: '已暂停',
                });
              } else {
                downingStore.mUpdateDownState({
                  DownID,
                  IsDowning: false,
                  IsCompleted: false,
                  DownSpeedStr: '',
                  DownState: '已出错',
                  AutoTry: Date.now(),
                  IsFailed: true,
                  IsStop: false,
                  FailedCode: 504,
                  FailedMessage: ret,
                });
              }
            });
          }
        }
      }
    }
    downingStore.mRefreshListDataShow(true)
    useM3u8DownloadedStore().mRefreshListDataShow(true)
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

  /**
   * 速度事件方法
   */
  static mSpeedEvent(list: IAriaDownProgress[]) {
    const downingStore = useM3u8DownloadingStore()
    const settingStore = useSettingStore()
    const DowningList = downingStore.ListDataRaw

    if (list == undefined) list = [];
    const dellist: string[] = [];
    let hasSpeed = 0;
    for (let n = 0; n < DowningList.length; n++) {
      if (DowningList[n].Down.DownSpeedStr != '') {
        const gid = DowningList[n].Info.GID;
        let isFind = false;
        for (let m = 0; m < list.length; m++) {
          if (list[m].gid != gid) continue
          if (list[m].gid == gid && list[m].status == 'active') {
            isFind = true;
            break;
          }
        }
        if (!isFind) {
          if (DowningList[n].Down.DownState != '已暂停') DowningList[n].Down.DownState = '队列中'
          DowningList[n].Down.DownSpeed = 0;
          DowningList[n].Down.DownSpeedStr = '';
        }
      }
    }
    const ariaRemote = !settingStore.AriaIsLocal

    const saveList: IStateDownFile[] = [];
    for (let i = 0; i < list.length; i++) {
      try {
        const gid = list[i].gid
        const isComplete = list[i].status === 'complete'
        const isDowning = isComplete || list[i].status === 'active' || list[i].status === 'waiting'
        const isStop = list[i].status === 'paused' || list[i].status === 'removed'
        const isError = list[i].status === 'error'

        for (let j = 0; j < DowningList.length; j++) {
          if (DowningList[j].Info.ariaRemote != ariaRemote) continue;
          if (DowningList[j].Info.GID == gid) {
            const downItem = DowningList[j];
            const down = downItem.Down;
            const totalLength = parseInt(list[i].totalLength) || 0;
            down.DownSize = parseInt(list[i].completedLength) || 0;
            down.DownSpeed = parseInt(list[i].downloadSpeed) || 0;
            down.DownSpeedStr = humanSize(down.DownSpeed) + '/s';
            down.DownProcess = Math.floor((down.DownSize * 100) / (totalLength + 1)) % 100;

            down.IsCompleted = isComplete;
            down.IsDowning = isDowning;
            down.IsFailed = isError;
            down.IsStop = isStop;

            if (list[i].errorCode && list[i].errorCode != '0') {
              down.FailedCode = parseInt(list[i].errorCode) || 0;
              down.FailedMessage = FormatAriaError(list[i].errorCode, list[i].errorMessage);
            }

            if (isComplete) {
              down.DownSize = downItem.Info.size;
              down.DownSpeed = 0;
              down.DownSpeedStr = '';
              down.DownProcess = 100;
              down.FailedCode = 0;
              down.FailedMessage = '';

              down.DownState = '校验中';
              const check = AriaHashFile(downItem);
              if (check.Check) {
                if (useSettingStore().downFinishAudio && !sound.playing()) {
                  sound.play()
                }
                downingStore.mUpdateDownState({
                  DownID: check.DownID,
                  DownState: '已完成',
                  IsFailed: false,
                  IsDowning: true,
                  IsStop: false,
                  IsCompleted: true,
                  FailedMessage: '',
                });
                this.tryConcatM3u8Video(downItem)
              } else {
                downingStore.mUpdateDownState({
                  DownID: check.DownID,
                  DownState: '已出错',
                  IsFailed: true,
                  IsDowning: false,
                  IsStop: true,
                  IsCompleted: false,
                  FailedMessage: '移动文件失败，请重新下载',
                });
              }
            } else if (isStop) {
              down.DownState = '已暂停';
              down.DownSpeed = 0;
              down.DownSpeedStr = '';
              down.FailedCode = 0;
              down.FailedMessage = '';
            } else if (isStop || isError) {
              down.DownState = '已出错';
              down.DownSpeed = 0;
              down.DownSpeedStr = '';
              down.AutoTry = Date.now();
              if (down.FailedMessage == '') down.FailedMessage = '下载失败';
            } else if (isDowning) {
              hasSpeed += down.DownSpeed;
              let lasttime = ((totalLength - down.DownSize) / (down.DownSpeed + 1)) % 356400;
              if (lasttime < 1) lasttime = 1;
              down.DownState =
                down.DownProcess.toString() +
                '% ' +
                (lasttime / 3600).toFixed(0).padStart(2, '0') +
                ':' +
                ((lasttime % 3600) / 60).toFixed(0).padStart(2, '0') +
                ':' +
                (lasttime % 60).toFixed(0).padStart(2, '0');
              if (SaveTimeWait > 10) saveList.push(downItem);
            } else {
              //console.log('update', DowningList[j]);
            }
            if (isStop || isError) {
              dellist.push(gid);
            }
            downingStore.mRefreshListDataShow(true)
            break;
          }
        }
      } catch {}
    }

    if (saveList.length > 0) DBDown.saveDownings(JSON.parse(JSON.stringify(saveList)))
    if (dellist.length > 0) AriaDeleteList(dellist).then()
    if (SaveTimeWait > 10) SaveTimeWait = 0;
    else SaveTimeWait++;
    useFootStore().mSaveDownTotalSpeedInfo(hasSpeed && humanSizeSpeed(hasSpeed) || '')
  }

  /**
   * 查询是否下载中
   */
  static QueryIsDowning() {
    return false
  }

  /**
   * ?查询选择的是否下载中？
   */
  static QuerySelectedIsDowning() {
    return false
  }
}

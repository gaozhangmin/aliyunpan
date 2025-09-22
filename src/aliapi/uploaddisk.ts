import { IUploadingUI } from '../utils/dbupload'
import DebugLog from '../utils/debuglog'
import { OpenFileHandle } from '../utils/filehelper'
import { FileHandle, FileReadResult } from 'fs/promises'
import { IUploadInfo } from './models'
import AliUpload from './upload'
import DBCache from '../utils/dbcache'
import UserDAL from '../user/userdal'
import { Sleep } from '../utils/format'
import AliUploadHashPool from './uploadhashpool'
import nodehttps from 'https'
import type { ClientRequest } from 'http'
import path from 'path'
import { Howl } from 'howler'
import { useSettingStore } from '../store'
import FlowEnc from '../module/flow-enc'
import { getFlowEnc } from '../utils/proxyhelper'

const sound = new Howl({
  src: ['./audio/upload_finished.mp3'], // 音频文件路径
  autoplay: false, // 是否自动播放
  volume: 1.0 // 音量，范围 0.0 ~ 1.0
})

const filePosMap = new Map<number, number>()
let UploadSpeedTotal = 0
export default class AliUploadDisk {

  static async UploadOneFile(uploadInfo: IUploadInfo, fileui: IUploadingUI): Promise<string> {
    const flowEnc = getFlowEnc(fileui.user_id, fileui.File.size, fileui.encType)
    if (uploadInfo.part_info_list.length > 1) {
      return AliUploadDisk.UploadOneFileBig(uploadInfo, fileui, flowEnc)
    }
    const upload_url = uploadInfo.part_info_list[0].upload_url
    const fileHandle = await OpenFileHandle(path.join(fileui.localFilePath, fileui.File.partPath))
    if (fileHandle.error) return fileHandle.error
    filePosMap.set(fileui.UploadID, 0)
    let isok = ''
    for (let i = 0; i < 3; i++) {
      isok = await AliUploadDisk.UploadOneFilePartNode(
        fileui, flowEnc, fileHandle.handle,
        0, fileui.File.size, upload_url
      )
      if (isok == 'success') {
        break
      }
    }
    if (fileHandle.handle) await fileHandle.handle.close()
    return AliUpload.UploadFileComplete(
      fileui.user_id, fileui.drive_id,
      fileui.Info.up_file_id, fileui.Info.up_upload_id,
      fileui.File.size, uploadInfo.sha1
    )
      .then(async (isSuccess) => {
        fileui.File.uploaded_file_id = fileui.Info.up_file_id
        fileui.File.uploaded_is_rapid = false
        fileui.Info.up_file_id = ''
        fileui.Info.up_upload_id = ''
        if (isSuccess) {
          if (useSettingStore().downFinishAudio && !sound.playing()) {
            sound.play()
          }
          return 'success'
        } else return '合并文件时出错，请重试'
      })
      .catch((err: any) => {
        DebugLog.mSaveDanger('合并文件时出错', err)
        return '合并文件时出错，请重试'
      })
  }

  static async UploadOneFileBig(uploadInfo: IUploadInfo, fileui: IUploadingUI, flowEnc: FlowEnc | null): Promise<string> {
    filePosMap.set(fileui.UploadID, 0)
    const fileHandle = await OpenFileHandle(path.join(fileui.localFilePath, fileui.File.partPath))
    if (fileHandle.error) return fileHandle.error
    const fileSize = fileui.File.size
    for (let i = 0, maxi = uploadInfo.part_info_list.length; i < maxi; i++) {
      let part = uploadInfo.part_info_list[i]
      const partStart = (part.part_number - 1) * part.part_size
      const partEnd = partStart + part.part_size
      const partSize = partEnd > fileSize ? fileSize - partStart : part.part_size
      if (part.isupload) {
        filePosMap.set(fileui.UploadID, partStart + partSize)
      } else {
        const url = part.upload_url
        let expires = url.substring(url.indexOf('x-oss-expires=') + 'x-oss-expires='.length)
        expires = expires.substring(0, expires.indexOf('&'))
        const lastTime = parseInt(expires) - Date.now() / 1000
        if (lastTime < 5 * 60) {
          await AliUpload.UploadFilePartUrl(
            fileui.user_id, fileui.drive_id, fileui.Info.up_file_id,
            fileui.Info.up_upload_id, fileui.File.size, uploadInfo
          ).catch()
          if (uploadInfo.part_info_list.length == 0) return '获取分片信息失败，请重试'
          part = uploadInfo.part_info_list[i]
        }
        let isok = ''
        for (let j = 0; j < 3; j++) {
          isok = await AliUploadDisk.UploadOneFilePartNode(
            fileui, flowEnc, fileHandle.handle,
            partStart, partSize, part.upload_url
          )
          if (isok == 'success') {
            part.isupload = true
            break
          }
          if (!fileui.IsRunning) break
        }
        if (!fileui.IsRunning) break
        if (!part.isupload) {
          if (fileHandle.handle) await fileHandle.handle.close()
          return isok
        }
      }
    }
    if (fileHandle.handle) await fileHandle.handle.close()
    if (!fileui.IsRunning) return '已暂停'
    for (let i = 0, maxi = uploadInfo.part_info_list.length; i < maxi; i++) {
      if (!uploadInfo.part_info_list[i].isupload) {
        return '有分片上传失败，请重试'
      }
    }

    if (!fileui.encType && !uploadInfo.sha1) {
      if (fileui.File.size >= 1024000) {
        const prehash = await AliUploadHashPool.GetFilePreHash(path.join(fileui.localFilePath, fileui.File.partPath))
        if (fileui.File.size >= 10240000 && !prehash.startsWith('error')) {
          uploadInfo.sha1 = await DBCache.getFileHash(fileui.File.size, fileui.File.mtime, prehash, path.basename(fileui.File.name))
        }
      }
    }

    return AliUpload.UploadFileComplete(fileui.user_id, fileui.drive_id, fileui.Info.up_file_id, fileui.Info.up_upload_id, fileui.File.size, uploadInfo.sha1)
      .then(async (isSuccess) => {
        if (isSuccess) {
          if (useSettingStore().downFinishAudio && !sound.playing()) {
            sound.play()
          }
          return 'success'
        } else return '合并文件时出错，请重试'
      })
      .catch((err: any) => {
        DebugLog.mSaveDanger('合并文件时出错', err)
        return '合并文件时出错，请重试'
      })
  }


  static UploadOneFilePartNode(fileui: IUploadingUI, flowEnc: FlowEnc | null, fileHandle: FileHandle, partStart: number, partSize: number, upload_url: string): Promise<string> {
    return new Promise<string>(async (resolve) => {
      const token = await UserDAL.GetUserTokenFromDB(fileui.user_id)
      if (!token || !token.access_token) {
        resolve('找不到上传token，请重试')
        return
      }

      let option = {
        method: 'PUT',
        strictSSL: false,
        rejectUnauthorized: false,
        timeout: 15000,
        headers: {
          'Content-Type': '',
          'Content-Length': partSize,
          'Transfer-Encoding': 'chunked',
          Authorization: token.token_type + ' ' + token.access_token,
          Connection: 'keep-alive'
        }
      }
      const winfo = {
        UploadID: fileui.UploadID,
        isstop: false,
        partSize, partStart,
        buff: Buffer.alloc(40960),
        flowEnc: flowEnc
      }
      const req: ClientRequest = nodehttps.request(upload_url, option, function(res: any) {
        let _data = ''
        res.on('data', function(chunk: string) {
          _data += chunk
        })
        res.on('end', function() {
          winfo.isstop = true
          if (res.statusCode == 200) {
            resolve('success')
          } else if (res.statusCode == 409 && _data.indexOf('PartAlreadyExist') > 0) {
            resolve('success')
          } else {
            DebugLog.mSaveDanger('分片上传失败，稍后重试' + res.statusCode)
            resolve('分片上传失败，稍后重试' + res.statusCode)
          }
        })
      })
      req.on('error', (error: any) => {
        DebugLog.mSaveWarning('分片上传失败，稍后重试', error)
        winfo.isstop = true
        let message = error.message || error.code || '网络错误'
        message = message.replace('A "socket" was not created for HTTP request before 15000ms', '网络连接超时失败')
        resolve('分片上传失败，稍后重试' + message)
      })

      while (winfo.partSize > 0 && !winfo.isstop) {
        const result = await AliUploadDisk._WriteToRequest(req, fileHandle, winfo)
        if (result != 'success') {
          resolve('读取文件数据失败，请重试')
          break
        }
      }
      req.end()
    })
  }

  static async _WriteToRequest(req: ClientRequest, fileHandle: FileHandle, winfo: {
    UploadID: number;
    isstop: boolean;
    partSize: number;
    partStart: number;
    buff: Buffer,
    flowEnc: FlowEnc | null
  }): Promise<string> {
    return new Promise<string>((resolve) => {
      try {
        const flowEnc = winfo.flowEnc
        const redLen = Math.min(40960, winfo.partSize)
        if (redLen != winfo.buff.length) winfo.buff = Buffer.alloc(redLen)
        fileHandle
          .read(winfo.buff, 0, redLen, winfo.partStart)
          .then(async (rbuff: FileReadResult<Buffer>) => {
            if (redLen == rbuff.bytesRead) {
              winfo.partStart += redLen
              winfo.partSize -= redLen
              const uploadpos = winfo.partStart
              const bufferData = winfo.flowEnc ? winfo.flowEnc.encryptBuff(rbuff.buffer) : rbuff.buffer
              req.write(bufferData, async function() {
                filePosMap.set(winfo.UploadID, uploadpos)
                UploadSpeedTotal += redLen
                window.speedLimte -= redLen
                for (let i = 0; i < 10; i++) {
                  if (window.speedLimte <= 0) await Sleep(100)
                  else break
                }
                resolve('success')
              })
            } else {
              winfo.isstop = true
              resolve('读取文件数据失败，请重试')
            }
          })
          .catch((error) => {
            console.error(error)
            winfo.isstop = true
            resolve('读取文件数据失败，请重试')
          })
      } catch (error) {
        console.error(error)
        winfo.isstop = true
        resolve('读取文件数据失败，请重试')
      }
    })
  }

  static GetFileUploadSpeed(UploadID: number): number {
    return filePosMap.get(UploadID) || 0
  }


  static DelFileUploadSpeed(UploadID: number): void {
    filePosMap.delete(UploadID)
  }


  static GetFileUploadSpeedTotal(): number {
    const speed = Number(UploadSpeedTotal)
    UploadSpeedTotal = 0
    return speed
  }
}

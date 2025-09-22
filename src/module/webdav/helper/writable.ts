import { Duplex } from 'node:stream'
import { OpenWriteStreamInfo } from 'webdav-server/lib/index.v2'
import axios from 'axios'
import { ITokenInfo } from '../../../user/userstore'
import AliUpload from '../../../aliapi/upload'
import * as crypto from 'crypto'
import { Buffer } from 'buffer'
import { FileOrFolder } from '../resource/ResourceStruct'
import nodehttps from 'https'
import AliHttp from '../../../aliapi/alihttp'
import fs from 'fs'
import { getUserData } from '../../../utils/electronhelper'
import path from 'path'
import { OpenFileHandle } from '../../../utils/filehelper'
import { FileReadResult } from 'fs/promises'
import Sha1WorkerPool from '../../../utils/sha1workerpool'
import { reject } from 'lodash'

class StreamWrite extends Duplex {
  private ctx: OpenWriteStreamInfo
  private token: ITokenInfo | undefined
  private contents: any[]
  private contentsLength: number
  private file: any
  private created_now: any[]
  private totalCount: number
  private tmpFilePath: string
  private sha1Pool: any

  constructor(ctx: OpenWriteStreamInfo, token: ITokenInfo | undefined, contents: any[], file: any, created_now: any[]) {
    super()
    this.ctx = ctx
    this.token = token
    this.contents = contents
    this.contentsLength = 0
    this.file = file
    this.created_now = created_now
    this.totalCount = 0
    this.tmpFilePath = path.join(getUserData(), 'Cache')
    this.sha1Pool = new Sha1WorkerPool()
  }

  _read() {
    for (let i = 0; i < this.contents.length; i++) {
      this.push(this.contents[i])
    }
    this.push(null)
  }

  async _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    if (this.file && this.token) {
      if (!this.created_now) {
        let buff = Buffer.from([])
        if (chunk) {
          this.contents.push(chunk)
          this.contentsLength += chunk.length
        }
        if (this.contentsLength == this.ctx.estimatedSize) {
          if (this.file.upload_url) {
            await axios.put(this.file.upload_url, buff, {
              responseType: 'text',
              timeout: 30000,
              headers: {
                Authorization: this.token!.token_type + ' ' + this.token!.access_token
              }
            })
          }
          await AliUpload.UploadFileComplete(
            this.token.user_id,
            this.file.drive_id,
            this.file.file_id,
            this.file.upload_id,
            this.file.size,
            this.file.hash
          )
        }
      } else {
        // 将chunk写入到本地缓存文件
        fs.appendFileSync(path.join(this.tmpFilePath, this.file.name), chunk)
        this.totalCount += chunk.length
        // console.log('chunk.length', chunk.length)
        if (this.totalCount == this.ctx.estimatedSize) {
          let fileHandle = await OpenFileHandle(path.join(this.tmpFilePath, this.file.name))
          if (fileHandle.error) {
            callback(new Error('上传失败'))
          } else {
            let partInfo = await this.getPartInfo(this.token, this.file, fileHandle)
            if (!partInfo.israpid) { // 非秒传
              let success = await this.uploadFile(this.token, partInfo, fileHandle, callback)
              if (!success) {
                callback(new Error('上传失败'))
              }
            }
            // 上传完毕
            let complete = await this.uploadFileComplete(this.token.user_id, this.file.drive_id,
              partInfo.file_id, partInfo.upload_id, this.totalCount, partInfo.content_hash)
            if (!complete) {
              callback(new Error('上传失败'))
            }
          }
          if (global.gc) {
            global.gc()
          }
          // 删除本地缓存文件
          fs.rmSync(path.join(this.tmpFilePath, this.file.name), { force: true })
        }
      }
    }
    callback(null)
  }

  private async getFilePreHash(fileHandle: any) {
    let hash = ''
    const buff = Buffer.alloc(1024)
    await fileHandle.handle.read(buff, 0, buff.length, null)
    hash = crypto.createHash('sha1').update(buff).digest('hex')
    hash = hash.toUpperCase()
    return hash
  }

  private async getBuffHashProof(access_token: string): Promise<{ sha1: string; proof_code: string }> {
    let hash = ''
    let proof_code = ''
    await new Promise<void>((resolve) => {
      this.sha1Pool.StartWithCallback(
        { hash: 'sha1', localFilePath: path.join(this.tmpFilePath, this.file.name), access_token },
        (result: any, worker: Worker) => {
          if (result.hash == 'sha1') {
            if (result.sha1) {
              hash = result.sha1
              proof_code = result.proof_code
              this.sha1Pool.FinishWithCallback(worker)
              resolve()
            }
          }
        },
        (err: any, worker: Worker) => {
          this.sha1Pool.FinishWithCallback(worker)
          reject(err.message || 'workercatch')
        }
      )
    }).catch((err: any) => {
      reject(err.message || 'workercatch')
    })
    return { sha1: hash, proof_code }
  }

  private async getPartInfo(token: ITokenInfo, file: FileOrFolder, fileHandle: any) {
    let prehash = await this.getFilePreHash(fileHandle)
    let partInfo: any = await AliUpload.UploadCreatFileWithPreHash(
      token.user_id, file.drive_id, file.parent_file_id,
      this.file.name, this.totalCount, prehash, 'overwrite')
    if (partInfo.errormsg == 'PreHashMatched') {
      let hashPool = await this.getBuffHashProof(token.access_token)
      let sha1 = hashPool.sha1
      partInfo = await AliUpload.UploadCreatFileWithFolders(
        token.user_id, this.file.drive_id, this.file.parent_file_id,
        this.file.name, this.totalCount, sha1, hashPool.proof_code, 'overwrite')
      partInfo.content_hash = sha1
    } else {
      let hashPool = await this.getBuffHashProof(token.access_token)
      let sha1 = hashPool.sha1
      partInfo = await AliUpload.UploadCreatFileWithFolders(
        token.user_id, this.file.drive_id, this.file.parent_file_id,
        this.file.name, this.totalCount, sha1, hashPool.proof_code, 'overwrite')
      partInfo.content_hash = sha1
    }
    return partInfo
  }

  private async uploadFile(token: ITokenInfo, partInfo: any, fileHandle: any, callback: (error?: Error | null) => void) {
    // 遍历partInfo的part_info_list
    for (let i = 0; i < partInfo.part_info_list.length; i++) {
      let part = partInfo.part_info_list[i]
      const partStart = (part.part_number - 1) * part.part_size
      const partEnd = partStart + part.part_size
      const partSize = partEnd > this.totalCount ? this.totalCount - partStart : part.part_size
      const url = part.upload_url
      let expires = url.substring(url.indexOf('x-oss-expires=') + 'x-oss-expires='.length)
      expires = expires.substring(0, expires.indexOf('&'))
      const lastTime = parseInt(expires) - Date.now() / 1000
      if (lastTime < 5 * 60) {
        // 重新获取url
        await AliUpload.UploadFilePartUrl(token.user_id, this.file.drive_id, this.file.file_id, partInfo.upload_id, partSize, partInfo)
        if (partInfo.part_info_list.length > 0) {
          part = partInfo.part_info_list[i]
        }
      }
      // 保证上传完毕
      let isok = ''
      for (let j = 0; j < 3; j++) {
        isok = await this.uploadFilePartNode(token, part.upload_url, fileHandle, partStart, partSize)
        if (isok == 'success') {
          part.isupload = true
          break
        }
      }
      if (!part.isupload) {
        if (fileHandle.handle) {
          await fileHandle.handle.close()
        }
        return isok
      }
    }
    for (let i = 0, maxi = partInfo.part_info_list.length; i < maxi; i++) {
      if (!partInfo.part_info_list[i].isupload) {
        callback(new Error('有分片上传失败，请重试'))
        return false
      }
    }
    if (fileHandle.handle) {
      await fileHandle.handle.close()
    }
    return true
  }

  private async uploadFilePartNode(token: ITokenInfo, upload_url: string, fileHandle: any, partStart: number, partSize: number): Promise<string> {
    return new Promise(async (resolve, reject) => {
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
      const info = { isstop: false, partSize, partStart, buff: Buffer.alloc(40960) }
      const req = nodehttps.request(upload_url, option, (res) => {
        let _data = ''
        res.on('data', (chunk: string) => {
          _data += chunk
        })
        res.on('end', () => {
          info.isstop = true
          if (res.statusCode == 200) {
            resolve('success')
          } else if (res.statusCode == 409 && _data.indexOf('PartAlreadyExist') > 0) {
            resolve('success')
          } else {
            resolve('分片上传失败，稍后重试' + res.statusCode)
          }
        })
      })
      req.on('error', (error: any) => {
        info.isstop = true
        let message = error.message || error.code || '网络错误'
        message = message.replace('A "socket" was not created for HTTP request before 15000ms', '网络连接超时失败')
        resolve('分片上传失败，稍后重试' + message)
      })
      while (info.partSize > 0 && !info.isstop) {
        const result = await this.writeToRequest(req, info, fileHandle)
        if (result != 'success') {
          resolve('读取文件数据失败，请重试')
          break
        }
      }
      req.end()
    })
  }

  private async writeToRequest(req: any, info: any, fileHandle: any) {
    return new Promise((resolve, reject) => {
      try {
        const redLen = Math.min(40960, info.partSize)
        if (redLen != info.buff.length) info.buff = Buffer.alloc(redLen)
        fileHandle.handle
          .read(info.buff, 0, redLen, info.partStart)
          .then((rbuff: FileReadResult<Buffer>) => {
            if (redLen == rbuff.bytesRead) {
              info.partStart += redLen
              info.partSize -= redLen
              req.write(rbuff.buffer, () => {
                resolve('success')
              })
            } else {
              info.isstop = true
              resolve('读取文件数据失败，请重试')
            }
          })
          .catch((error: any) => {
            info.isstop = true
            resolve('读取文件数据失败，请重试')
          })
      } catch (error) {
        info.isstop = true
        resolve('读取文件数据失败，请重试')
      }
    })
  }

  private async uploadFileComplete(user_id: string, drive_id: string, file_id: string, upload_id: string, fileSize: number, fileSha1: string): Promise<boolean> {
    if (!user_id || !drive_id || !file_id || !upload_id) return false
    const url = 'v2/file/complete'
    const postData = { drive_id: drive_id, upload_id: upload_id, file_id: file_id }
    let resp = await AliHttp.Post(url, postData, user_id, '')
    if (resp.code == 400 || resp.code == 429) {
      resp = await AliHttp.Post(url, postData, user_id, '')
    }
    if (AliHttp.IsSuccess(resp.code)) {
      if (resp.body.size == fileSize) {
        if (fileSha1) {
          if (resp.body.content_hash && resp.body.content_hash == fileSha1) {
            return true
          } else {
            await AliUpload.UploadFileDelete(user_id, drive_id, file_id, true).catch()
            return false
          }
        } else if (fileSize < 10485760) {
          return true
        } else {
          return true
        }
      } else {
        await AliUpload.UploadFileDelete(user_id, drive_id, file_id, true).catch()
        return false
      }
    } else {
      return false
    }
  }
}

export default StreamWrite
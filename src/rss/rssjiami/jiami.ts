import { FileSystemErrorMessage } from '../../utils/filehelper'
import DebugLog from '../../utils/debuglog'
import message from '../../utils/message'
import fsPromises from 'fs/promises'
import path from 'path'
import { decodeName, encodeName } from '../../module/flow-enc/utils'
import fs from 'fs'
import FlowEnc from '../../module/flow-enc'

export async function DoJiaMi(mode: string,
                              encType: string,
                              encName: boolean,
                              password: string,
                              encPath: string,
                              outPath: string,
                              breakSmall: boolean,
                              matchExtList: string[]): Promise<any> {
  const fileList: { filePath: string, size: number }[] = []
  await GetAllFiles(encPath, breakSmall, fileList)
  if (fileList.length == 0) {
    message.error('选择的文件夹下找不到满足条件的文件')
    return 0
  } else {
    const start = Date.now()
    // 输出文件
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(outPath)
    }
    // 临时文件
    const tempDir = path.join(outPath, '.temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }
    let promiseArr = []
    for (const fileInfo of fileList) {
      const { filePath, size } = fileInfo
      const file = filePath.toLowerCase().trimEnd()
      // 过滤扩展
      if (matchExtList.length > 0) {
        let find = false
        for (let j = 0; j < matchExtList.length; j++) {
          if (file.endsWith(matchExtList[j])) {
            find = true
            break
          }
        }
        if (!find) continue
      }
      // 开始加密和解密
      try {
        let relativePath = filePath.substring(encPath.length)
        const fileName = path.basename(relativePath)
        const ext = path.extname(relativePath)
        const childPath = path.dirname(relativePath)
        if (mode === 'enc' && encName) {
          const newFileName = encodeName(password, encType, fileName) + ext
          relativePath = path.join(childPath, newFileName)
        }
        if (mode === 'dec') {
          const newFileName = decodeName(password, encType, ext !== '' ? fileName.substring(0, fileName.length - ext.length) : fileName)
          if (newFileName) {
            relativePath = path.join(childPath, newFileName)
          }
        }
        const outFilePath = path.join(outPath, relativePath)
        const outFilePathTemp = path.join(tempDir, relativePath)
        fs.writeFileSync(outFilePath, '')
        fs.writeFileSync(outFilePathTemp, '')
        // 开始加密
        if (size === 0) {
          continue
        }
        const flowEnc = new FlowEnc(password, encType, size)
        const writeStream = fs.createWriteStream(outFilePathTemp)
        const readStream = fs.createReadStream(filePath)
        const promise = new Promise<void>((resolve, reject) => {
          readStream.pipe(mode === 'enc' ? flowEnc.encryptTransform() : flowEnc.decryptTransform()).pipe(writeStream)
          readStream.on('end', () => {
            fs.renameSync(outFilePathTemp, outFilePath)
            resolve()
          })
        })
        promiseArr.push(promise)
        if (promiseArr.length > 50) {
          await Promise.all(promiseArr)
          promiseArr = []
        }
      } catch (err: any) {
        DebugLog.mSaveDanger('XM appendFile' + (err.message || '') + filePath)
      }
    }
    await Promise.all(promiseArr)
    fs.rmSync(tempDir, { recursive: true })
    const time = ((Date.now() - start) / 1000).toFixed(2) + 's'
    return { count: promiseArr.length, time }
  }
}

async function GetAllFiles(dir: string, breakSmall: boolean, fileList: any[]) {
  if (!dir.endsWith(path.sep)) dir = dir + path.sep
  try {
    const childFiles = await fsPromises.readdir(dir).catch((err: any) => {
      err = FileSystemErrorMessage(err.code, err.message)
      DebugLog.mSaveDanger('XM GetAllFiles文件失败：' + dir, err)
      message.error('跳过文件夹：' + err + ' ' + dir)
      return []
    })

    let allTask: Promise<void>[] = []
    const dirList: string[] = []
    for (let i = 0, maxi = childFiles.length; i < maxi; i++) {
      const name = childFiles[i] as string
      if (name.startsWith('.')) continue
      if (name.startsWith('#')) continue
      const item = dir + name
      allTask.push(
        fsPromises
          .lstat(item)
          .then((stat: any) => {
            if (stat.isDirectory()) dirList.push(item)
            else if (stat.isSymbolicLink()) {
              // donothing
            } else if (stat.isFile()) {
              if (!breakSmall || stat.size > 5 * 1024 * 1024) {
                fileList.push({ filePath: item, size: stat.size })
              }
            }
          })
          .catch()
      )
      if (allTask.length > 10) {
        await Promise.all(allTask).catch()
        allTask = []
      }
    }

    if (allTask.length > 0) {
      await Promise.all(allTask).catch()
      allTask = []
    }

    for (let i = 0, maxi = dirList.length; i < maxi; i++) {
      await GetAllFiles(dirList[i], breakSmall, fileList)
    }
  } catch (err: any) {
    DebugLog.mSaveDanger('GetAllFiles' + (err.message || ''))
  }

  return true
}

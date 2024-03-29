import { pathToRegexp } from 'path-to-regexp'
import FlowEnc from './index'
import fs from 'fs'
import path from 'path'
import { Buffer } from 'buffer'
import MixBase64 from './lib/mixBase64'
import Crcn from './lib/crc6-8'

const crc6 = new Crcn(6)
const origPrefix = 'orig_'

interface PasswdInfo {
  password: string;
  encType: string;
  encPath: string[];
  enable: boolean;
}

export function searchFile(filePath: string) {
  const fileArray: { size: number; filePath: string }[] = []
  const files = fs.readdirSync(filePath)
  files.forEach((child) => {
    const filePath2 = path.join(filePath, child),
      info = fs.statSync(filePath2)
    if (info.isDirectory()) {
      const deepArr = searchFile(filePath2)
      fileArray.push(...deepArr)
    } else {
      const data = { size: info.size, filePath: filePath2 }
      fileArray.push(data)
    }
  })
  return fileArray
}

export async function encryptFile(
  password: string,
  encType: string,
  enc: 'enc' | 'dec',
  encPath: string,
  outPath?: string,
  encName?: boolean | string
) {
  const start = Date.now()
  const interval = setInterval(() => {
    console.log(new Date(), 'waiting finish!!!')
  }, 2000)
  if (!path.isAbsolute(encPath)) {
    encPath = path.join(process.cwd(), encPath)
  }
  outPath = outPath || path.join(process.cwd(), 'outFile', Date.now().toString())
  console.log('you input:', password, encType, enc, encPath)
  if (!fs.existsSync(encPath)) {
    console.log('you input filePath is not exists ')
    return
  }
  // init outpath dir
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(outPath)
  }
  // input file path
  const allFilePath = searchFile(encPath)
  const tempDir = path.join(outPath, '.temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }
  let promiseArr = []
  for (const fileInfo of allFilePath) {
    const { filePath, size } = fileInfo
    let relativePath = filePath.substring(encPath.length)
    const fileName = path.basename(relativePath),
      ext = path.extname(relativePath),
      childPath = path.dirname(relativePath)
    if (enc === 'enc' && encName) {
      const newFileName = encodeName(password, encType, fileName) + ext
      relativePath = path.join(childPath, newFileName)
    }
    if (enc === 'dec') {
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
    // console.log('@@outFilePath', outFilePath, encType, size)
    const writeStream = fs.createWriteStream(outFilePathTemp)
    const readStream = fs.createReadStream(filePath)
    const promise = new Promise<void>((resolve, reject) => {
      readStream.pipe(enc === 'enc' ? flowEnc.encryptTransform() : flowEnc.decryptTransform()).pipe(writeStream)
      readStream.on('end', () => {
        console.log('@@finish filePath', filePath, outFilePathTemp)
        fs.renameSync(outFilePathTemp, outFilePath)
        resolve()
      })
    })
    promiseArr.push(promise)
    if (promiseArr.length > 50) {
      await Promise.all(promiseArr)
      promiseArr = []
    }
  }
  await Promise.all(promiseArr)
  fs.rmSync(tempDir, { recursive: true })
  console.log('@@all finish', ((Date.now() - start) / 1000).toFixed(2) + 's')
  clearInterval(interval)
}

export function convertFile(...args: [password: string, encType: string, enc: 'enc' | 'dec', encPath: string, outPath?: string, encName?: string]) {
  const statTime = Date.now()
  if (args.length > 3) {
    encryptFile(...args).then(() => {
      console.log('all file finish enc!!! time:', Date.now() - statTime)
    })
  } else {
    console.error('input error， example param:nodejs-linux passwd12345 rc4 enc ./myfolder /tmp/outPath encname  ')
  }
}

// check file name, return real name
export function convertRealName(password: string, encType: string, pathText: string): string {
  const fileName = path.basename(pathText)
  if (fileName.indexOf(origPrefix) === 0) {
    return fileName.replace(origPrefix, '')
  }
  // try encode name, fileName don't need decodeURI，encodeUrl func can't encode that like '(' '!'  in nodejs
  const ext = path.extname(fileName)
  const encName = encodeName(password, encType, decodeURIComponent(fileName))
  console.log('@@decodeURI(fileName)', decodeURIComponent(fileName))
  return encName + ext
}

// if file name has encrypt, return show name
export function convertShowName(password: string, encType: string, pathText: string): string {
  const fileName = path.basename(decodeURIComponent(pathText))
  const ext = path.extname(fileName)
  const encName = fileName.replace(ext, '')
  // encName don't need decodeURI
  let showName = decodeName(password, encType, encName)
  if (showName === null) {
    showName = origPrefix + fileName
  }
  return showName
}

// 判断是否为匹配的路径
export function pathExec(encPath: string[], url: string): RegExpExecArray | null {
  for (const filePath of encPath) {
    const result = pathToRegexp(new RegExp(filePath)).exec(url)
    if (result) {
      return result
    }
  }
  return null
}

export function encodeName(password: string, encType: string, plainName: string): string {
  const passwdOutward = FlowEnc.getPassWdOutward(password, encType)
  //  randomStr
  const mix64 = new MixBase64(passwdOutward)
  let encodeName = mix64.encode(plainName)
  const crc6Bit = crc6.checksum(Array.from(Buffer.from(encodeName + passwdOutward)))
  const crc6Check = MixBase64.getSourceChar(crc6Bit)
  encodeName += crc6Check
  return encodeName
}

export function decodeName(password: string, encType: string, encodeName: string): string | null {
  const crc6Check = encodeName.substring(encodeName.length - 1)
  const passwdOutward = FlowEnc.getPassWdOutward(password, encType)
  const mix64 = new MixBase64(passwdOutward)
  // start dec
  const subEncName = encodeName.substring(0, encodeName.length - 1)
  const crc6Bit = crc6.checksum(Array.from(Buffer.from(subEncName + passwdOutward)))
  // console.log(subEncName, MixBase64.getSourceChar(crc6Bit), crc6Check)
  if (MixBase64.getSourceChar(crc6Bit) !== crc6Check) {
    return null
  }
  // event pass crc6，it maybe decode error, like this name '68758PICxAd_1024-666 - 副本33.png'
  let decodeStr = null
  try {
    decodeStr = mix64.decode(subEncName).toString('utf8')
  } catch (e) {
    console.log('@@mix64 decode error', subEncName)
  }
  return decodeStr
}

export function encodeFolderName(password: string, encType: string, folderPasswd: string, folderEncType: string): string {
  const passwdInfo = folderEncType + '_' + folderPasswd
  return encodeName(password, encType, passwdInfo)
}

export function decodeFolderName(password: string, encType: string, encodeName: string): any {
  const arr = encodeName.split('_')
  if (arr.length < 2) {
    return false
  }
  const folderEncName = arr[arr.length - 1]
  const decodeStr = decodeName(password, encType, folderEncName)
  if (!decodeStr) {
    return decodeStr
  }
  const folderEncType = decodeStr.substring(0, decodeStr.indexOf('_'))
  const folderPasswd = decodeStr.substring(decodeStr.indexOf('_') + 1)
  return { folderEncType, folderPasswd }
}

// 检查
export function pathFindPasswd(passwdList: PasswdInfo[], url: string): {
  passwdInfo: PasswdInfo,
  pathInfo: RegExpExecArray
} | {} {
  for (const passwdInfo of passwdList) {
    for (const filePath of passwdInfo.encPath) {
      const result = passwdInfo.enable ? pathToRegexp(new RegExp(filePath)).exec(url) : null
      if (result) {
        // check folder name is can decode
        // getPassInfo()
        const newPasswdInfo = Object.assign({}, passwdInfo)
        // url maybe a folder, need decode
        const folders = url.split('/')
        for (const folderName of folders) {
          const data = decodeFolderName(passwdInfo.password, passwdInfo.encType, decodeURIComponent(folderName))
          if (data) {
            newPasswdInfo.encType = data.folderEncType
            newPasswdInfo.password = data.folderPasswd
            return { passwdInfo: newPasswdInfo, pathInfo: result }
          }
        }
        return { passwdInfo, pathInfo: result }
      }
    }
  }
  return {}
}
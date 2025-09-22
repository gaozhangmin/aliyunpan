import FlowEnc from './index'
import fs from 'fs'
import path from 'path'
import { Buffer } from 'buffer'
import MixBase64 from './lib/mixBase64'
import Crcn from './lib/crc6-8'

const crc6 = new Crcn(6)

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
import crypto from 'crypto'
import { Buffer } from 'buffer'

const source = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-~+'

class MixBase64 {
  chars: string[]
  mapChars: Record<string, number>

  constructor(passwd: string, salt = 'mix64') {
    const secret = passwd.length === 64 ? passwd : MixBase64.initKSA(passwd + salt)
    const chars = secret.split('')
    const mapChars: Record<string, number> = {}
    chars.forEach((e: string, index: number) => mapChars[e] = index)
    this.chars = chars
    this.mapChars = mapChars
  }

  static sourceChars = source.split('')

  encode(bufferOrStr: Buffer | string, encoding: BufferEncoding = 'utf-8'): string {
    const buffer = bufferOrStr instanceof Buffer ? bufferOrStr : Buffer.from(bufferOrStr, encoding)
    let result = ''
    let arr: any = []
    let bt: any = []
    let char: string
    for (let i = 0; i < buffer.length; i += 3) {
      if (i + 3 > buffer.length) {
        arr = buffer.subarray(i, buffer.length)
        break
      }
      bt = buffer.subarray(i, i + 3)
      char = this.chars[bt[0] >> 2] + this.chars[((bt[0] & 3) << 4) | (bt[1] >> 4)] + this.chars[((bt[1] & 15) << 2) | (bt[2] >> 6)] + this.chars[bt[2] & 63]
      result += char
    }
    if (buffer.length % 3 === 1) {
      char = this.chars[arr[0] >> 2] + this.chars[(arr[0] & 3) << 4] + this.chars[64] + this.chars[64]
      result += char
    } else if (buffer.length % 3 === 2) {
      char = this.chars[arr[0] >> 2] + this.chars[((arr[0] & 3) << 4) | (arr[1] >> 4)] + this.chars[(arr[1] & 15) << 2] + this.chars[64]
      result += char
    }
    return result
  }

  decode(base64Str: string): Buffer {
    let size = (base64Str.length / 4) * 3
    let j = 0
    if (~base64Str.indexOf(this.chars[64] + '' + this.chars[64])) {
      size -= 2
    } else if (~base64Str.indexOf(this.chars[64])) {
      size -= 1
    }
    const buffer = Buffer.alloc(size)
    let enc1: number
    let enc2: number
    let enc3: number
    let enc4: number
    let i = 0
    while (i < base64Str.length) {
      enc1 = this.mapChars[base64Str.charAt(i++)]
      enc2 = this.mapChars[base64Str.charAt(i++)]
      enc3 = this.mapChars[base64Str.charAt(i++)]
      enc4 = this.mapChars[base64Str.charAt(i++)]
      buffer.writeUInt8((enc1 << 2) | (enc2 >> 4), j++)
      if (enc3 !== 64) {
        buffer.writeUInt8(((enc2 & 15) << 4) | (enc3 >> 2), j++)
      }
      if (enc4 !== 64) {
        buffer.writeUInt8(((enc3 & 3) << 6) | enc4, j++)
      }
    }
    return buffer
  }

  static getCheckBit(text: string): string {
    const bufferArr = Buffer.from(text)
    let count = 0
    for (const num of bufferArr) {
      count += num
    }
    count %= 64
    return MixBase64.sourceChars[count]
  }

  static randomSecret(): string {
    const chars = source.split('')
    const newChars: string[] = []
    while (chars.length > 0) {
      const index = Math.floor(Math.random() * chars.length)
      newChars.push(chars[index])
      chars.splice(index, 1)
    }
    return newChars.join('')
  }

  static randomStr(length: number): string {
    const chars = source.split('')
    const newChars: string[] = []
    while (length-- > 0) {
      const index = Math.floor(Math.random() * chars.length)
      newChars.push(chars[index])
      chars.splice(index, 1)
    }
    return newChars.join('')
  }

  static getSourceChar(index: number): string {
    return source.split('')[index]
  }

  static initKSA(passwd: string | Buffer): string {
    let key: string | Buffer = passwd
    if (typeof passwd === 'string') {
      key = crypto.createHash('sha256').update(passwd).digest()
    }
    const K: any[] = []
    const sbox: any[] = []
    const sourceKey = source.split('')
    for (let i = 0; i < source.length; i++) {
      sbox[i] = i
    }
    for (let i = 0; i < source.length; i++) {
      K[i] = key[i % key.length]
    }
    for (let i = 0, j = 0; i < source.length; i++) {
      j = (j + sbox[i] + K[i]) % source.length
      const temp = sbox[i]
      sbox[i] = sbox[j]
      sbox[j] = temp
    }
    let secret = ''
    for (const i of sbox) {
      secret += sourceKey[i]
    }
    return secret
  }
}

export default MixBase64
import crypto from 'crypto'
import { Transform } from 'stream'

/**
 * 混淆算法，加密强度低，容易因为文件特征被破解。可以提升encode长度来对抗
 */
class MixEnc {
  private password: string
  public passwdOutward: string
  private readonly encode: Buffer
  private readonly decode: Buffer

  constructor(password: string, sizeSalt: number) {
    this.password = password
    // 说明是输入encode的秘钥，用于找回文件加解密
    this.passwdOutward = password
    // check base64
    if (password.length !== 32) {
      this.passwdOutward = crypto.pbkdf2Sync(this.password, 'MIX', 1000, 16, 'sha256').toString('hex')
    }
    console.log('MixEnc.passwdOutward', this.passwdOutward)
    const passwdSalt = this.passwdOutward + sizeSalt
    const encode = crypto.createHash('sha256').update(passwdSalt).digest()
    const decode = []
    const length = encode.length
    const decodeCheck: { [key: number]: number } = {}
    for (let i = 0; i < length; i++) {
      const enc = encode[i] ^ i
      // 这里会产生冲突
      if (!decodeCheck[enc % length]) {
        decode[enc % length] = encode[i] & 0xff
        decodeCheck[enc % length] = encode[i]
      } else {
        for (let j = 0; j < length; j++) {
          if (!decodeCheck[j]) {
            encode[i] = (encode[i] & length) | (j ^ i)
            decode[j] = encode[i] & 0xff
            decodeCheck[j] = encode[i]
            break
          }
        }
      }
    }
    this.encode = encode
    this.decode = Buffer.from(decode)
  }

  // MD5
  md5(content: string): string {
    const md5 = crypto.createHash('md5')
    return md5.update(this.passwdOutward + content).digest('hex')
  }

  async setPositionAsync(): Promise<void> {
    console.log('in the mix ')
  }

  // 加密流转换
  encryptTransform(): Transform {
    return new Transform({
      // 匿名函数确保this是指向 FlowEnc
      transform: (chunk, encoding, next) => {
        next(null, this.encrypt(chunk))
      }
    })
  }

  decryptTransform(): Transform {
    // 解密流转换，不能单实例
    return new Transform({
      transform: (chunk, encoding, next) => {
        // this.push()  用push也可以
        next(null, this.decrypt(chunk))
      }
    })
  }

  // 加密方法
  encrypt(data: Buffer): Buffer {
    data = Buffer.from(data)
    for (let i = data.length; i--;) {
      data[i] ^= this.encode[data[i] % 32]
    }
    return data
  }

  // 解密方法
  decrypt(data: Buffer): Buffer {
    for (let i = data.length; i--;) {
      data[i] ^= this.decode[data[i] % 32]
    }
    return data
  }

  static checkEncode(_encode: string): Buffer | null {
    const encode = Buffer.from(_encode, 'hex')
    const length = encode.length
    const decodeCheck: { [key: number]: number } = {}
    for (let i = 0; i < encode.length; i++) {
      const enc = encode[i] ^ i
      // 这里会产生冲突
      if (!decodeCheck[enc % length]) {
        decodeCheck[enc % length] = encode[i]
      } else {
        return null
      }
    }
    return encode
  }
}

export default MixEnc
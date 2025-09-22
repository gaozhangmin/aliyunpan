import crypto from 'crypto'
import { Transform } from 'stream'

const segmentPosition = 100 * 10000

class Rc4Md5 {
  private position: number
  private i: number
  private j: number
  private sbox: number[]
  private password: string
  public passwdOutward: string
  private fileHexKey: string

  constructor(password: string, sizeSalt: number) {
    if (!sizeSalt) {
      throw new Error('salt is null')
    }
    this.position = 0
    this.i = 0
    this.j = 0
    this.sbox = []
    this.password = password
    this.passwdOutward = password
    if (password.length !== 32) {
      this.passwdOutward = crypto.pbkdf2Sync(this.password, 'RC4', 1000, 16, 'sha256').toString('hex')
    }
    const passwdSalt = this.passwdOutward + sizeSalt
    this.fileHexKey = crypto.createHash('md5').update(passwdSalt).digest('hex')
    this.resetKSA()
  }

  resetKSA(): void {
    const offset = parseInt((this.position / segmentPosition).toString()) * segmentPosition
    const buf = Buffer.alloc(4)
    buf.writeInt32BE(offset)
    const rc4Key = Buffer.from(this.fileHexKey, 'hex')
    let j = rc4Key.length - buf.length
    for (let i = 0; i < buf.length; i++, j++) {
      rc4Key[j] = rc4Key[j] ^ buf[i]
    }
    this.initKSA(rc4Key)
  }

  async setPositionAsync(newPosition: number = 0): Promise<this> {
    newPosition *= 1
    this.position = newPosition
    this.resetKSA()
    this.PRGAExecPostion(newPosition % segmentPosition)
    return this
  }

  encryptText(plainTextLen: string): Buffer {
    const plainBuffer = Buffer.from(plainTextLen)
    return this.encrypt(plainBuffer)
  }

  encrypt(plainBuffer: Buffer): Buffer {
    return this.PRGAExcute(plainBuffer)
  }

  decrypt(plainBuffer: Buffer): Buffer {
    return this.PRGAExcute(plainBuffer)
  }

  encryptTransform(): Transform {
    return new Transform({
      transform: (chunk, encoding, next) => {
        next(null, this.encrypt(chunk))
      }
    })
  }

  decryptTransform(): Transform {
    return new Transform({
      transform: (chunk, encoding, next) => {
        next(null, this.decrypt(chunk))
      }
    })
  }

  private PRGAExcute(plainBuffer: Buffer): Buffer {
    let { sbox: S, i, j } = this
    for (let k = 0; k < plainBuffer.length; k++) {
      i = (i + 1) % 256
      j = (j + S[i]) % 256
      const temp = S[i]
      S[i] = S[j]
      S[j] = temp
      plainBuffer[k] ^= S[(S[i] + S[j]) % 256]
      if (++this.position % segmentPosition === 0) {
        this.resetKSA()
        i = this.i
        j = this.j
        S = this.sbox
      }
    }
    this.i = i
    this.j = j
    return plainBuffer
  }

  private PRGAExecPostion(plainLen: number): void {
    let { sbox: S, i, j } = this
    for (let k = 0; k < plainLen; k++) {
      i = (i + 1) % 256
      j = (j + S[i]) % 256
      const temp = S[i]
      S[i] = S[j]
      S[j] = temp
    }
    this.i = i
    this.j = j
  }

  private initKSA(key: Buffer): void {
    const K: number[] = []
    for (let i = 0; i < 256; i++) {
      this.sbox[i] = i
    }
    for (let i = 0; i < 256; i++) {
      K[i] = key[i % key.length]
    }
    for (let i = 0, j = 0; i < 256; i++) {
      j = (j + this.sbox[i] + K[i]) % 256
      const temp = this.sbox[i]
      this.sbox[i] = this.sbox[j]
      this.sbox[j] = temp
    }
    this.i = 0
    this.j = 0
  }
}

export default Rc4Md5
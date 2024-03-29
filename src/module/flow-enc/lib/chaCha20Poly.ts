import crypto from 'crypto'
import { Transform } from 'stream'

class ChaCha20Poly {
  public passwdOutward: string = ''
  private cipher: crypto.CipherCCM
  private decipher: crypto.DecipherCCM

  constructor(password: string, sizeSalt: number) {
    this.passwdOutward = password
    if (password.length !== 32) {
      const sha256 = crypto.createHash('sha256')
      const key = sha256.update(password + 'CHA20').digest('hex')
      this.passwdOutward = crypto.createHash('md5').update(key).digest('hex')
    }
    const passwdSalt = this.passwdOutward + sizeSalt
    const fileHexKey = crypto.createHash('sha256').update(passwdSalt).digest()
    const iv = crypto.pbkdf2Sync(this.passwdOutward, sizeSalt + '', 10000, 12, 'sha256')
    this.cipher = crypto.createCipheriv('chacha20-poly1305', fileHexKey, iv, {
      authTagLength: 16
    })
    this.decipher = crypto.createDecipheriv('chacha20-poly1305', fileHexKey, iv, {
      authTagLength: 16
    })
  }

  async setPositionAsync(_position: number): Promise<void> {
    const buf = Buffer.alloc(1024)
    const position = parseInt((_position / 1024).toString())
    const mod = _position % 1024
    for (let i = 0; i < position; i++) {
      this.decrypt(buf)
    }
    const modBuf = Buffer.alloc(mod)
    for (let i = 0; i < mod; i++) {
      this.decrypt(modBuf)
    }
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
        next(null, this.decrypt(chunk, false))
      }
    })
  }

  encrypt(data: Buffer | string): Buffer | undefined {
    if (typeof data === 'string') {
      data = Buffer.from(data, 'utf8')
    }
    try {
      return this.cipher.update(data)
    } catch (err) {
      console.log(err)
    }
  }

  decrypt(bufferData: Buffer, authTag?: Buffer | string | boolean): Buffer | undefined {
    try {
      if (authTag) {
        this.decipher.setAuthTag(authTag as Buffer)
      }
      if (authTag === true) {
        this.decipher.setAuthTag(this.cipher.getAuthTag())
      }
      if (typeof authTag === 'string') {
        this.decipher.setAuthTag(Buffer.from(authTag))
      }

      return this.decipher.update(bufferData)
    } catch (err) {
      console.log(err)
    }
  }

  encChaPolyFinal(): Buffer {
    return this.cipher.final()
  }

  getAuthTag(): Buffer {
    return this.cipher.getAuthTag()
  }

  decChaPolyFinal(): void {
    try {
      this.decipher.final()
    } catch (err) {
      console.log(err)
    }
  }
}

export default ChaCha20Poly
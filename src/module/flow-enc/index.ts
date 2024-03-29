import MixEnc from './lib/mixEnc'
import Rc4Md5 from './lib/rc4Md5'
import AesCTR from './lib/aesCTR'
import ChaCha20Poly from './lib/chaCha20Poly'

const cachePasswdOutward: { [key: string]: any } = {}

class FlowEnc {
  private encryptFlow: MixEnc | Rc4Md5 | AesCTR | ChaCha20Poly
  public passwdOutward: any

  constructor(password: string, encryptType: string = 'mix', sizeSalt: number = 0) {
    let encryptFlow = null
    if (encryptType === 'mix') {
      console.log('@@mix', encryptType)
      encryptFlow = new MixEnc(password, sizeSalt)
      this.passwdOutward = encryptFlow.passwdOutward
    }
    if (encryptType === 'rc4md5') {
      console.log('@@rc4md5', encryptType, sizeSalt)
      encryptFlow = new Rc4Md5(password, sizeSalt)
      this.passwdOutward = encryptFlow.passwdOutward
    }
    if (encryptType === 'aesctr') {
      console.log('@@AesCTR', encryptType, sizeSalt)
      encryptFlow = new AesCTR(password, sizeSalt)
      this.passwdOutward = encryptFlow.passwdOutward
    }
    if (encryptType === 'cha20') {
      console.log('@@ChaCha20Poly', encryptType, sizeSalt)
      encryptFlow = new ChaCha20Poly(password, sizeSalt)
      this.passwdOutward = encryptFlow.passwdOutward
    }
    if (encryptType === null || encryptFlow === null) {
      throw new Error('FlowEnc error')
    }
    cachePasswdOutward[password + encryptType] = this.passwdOutward
    this.encryptFlow = encryptFlow
  }

  async setPosition(position: number) {
    await this.encryptFlow.setPositionAsync(position)
  }

  // 加密buff
  encryptBuff(data: Buffer) {
    return this.encryptFlow.encrypt(data)
  }

  decryptBuff(data: Buffer) {
    return this.encryptFlow.decrypt(data)
  }

  // 加密流转换
  encryptTransform() {
    return this.encryptFlow.encryptTransform()
  }

  decryptTransform() {
    return this.encryptFlow.decryptTransform()
  }

  static getPassWdOutward(password: string, encryptType: string) {
    const passwdOutward = cachePasswdOutward[password + encryptType]
    if (passwdOutward) {
      return passwdOutward
    }
    const flowEnc = new FlowEnc(password, encryptType, 1)
    return flowEnc.passwdOutward
  }
}

export default FlowEnc
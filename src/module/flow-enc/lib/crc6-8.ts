class Crc68 {
  private readonly table: number[] = []
  private readonly initialValue: number

  constructor(num: number, polynomial?: number, initialValue: number = 0) {
    polynomial = polynomial || Crc68.POLY8.CRC8_DALLAS_MAXIM
    if (num === 6) {
      this.table = Crc68.generateTable6()
    }
    if (num === 8) {
      this.table = Crc68.generateTable8MAXIM(polynomial)
    }
    this.initialValue = initialValue
  }

  checksum(byteArray: number[]): number {
    let c = this.initialValue
    for (let i = 0; i < byteArray.length; i++) {
      c = this.table[(c ^ byteArray[i]) % 256]
    }
    return c
  }

  static generateTable8(polynomial: number): number[] {
    const csTable: number[] = []
    for (let i = 0; i < 256; ++i) {
      let curr = i
      for (let j = 0; j < 8; ++j) {
        if ((curr & 0x80) !== 0) {
          curr = ((curr << 1) ^ polynomial) % 256
        } else {
          curr = (curr << 1) % 256
        }
      }
      csTable[i] = curr
    }
    return csTable
  }

  static generateTable8MAXIM(polynomial: number): number[] {
    const csTable: number[] = []
    for (let i = 0; i < 256; ++i) {
      let curr = i
      for (let j = 0; j < 8; ++j) {
        if ((curr & 0x01) !== 0) {
          curr = ((curr >> 1) ^ 0x8c) % 256
        } else {
          curr = (curr >> 1) % 256
        }
      }
      csTable[i] = curr
    }
    return csTable
  }

  static generateTable6(): number[] {
    const csTable: number[] = []
    for (let i = 0; i < 256; i++) {
      let curr = i
      for (let j = 0; j < 8; ++j) {
        if ((curr & 0x01) !== 0) {
          curr = ((curr >> 1) ^ 0x30) % 256
        } else {
          curr = (curr >> 1) % 256
        }
      }
      csTable[i] = curr
    }
    return csTable
  }

  static generateTable6test(): number[] {
    const csTable: number[] = []
    for (let i = 0; i < 256; i++) {
      let curr = i
      for (let j = 0; j < 8; ++j) {
        if ((curr & 0x80) !== 0) {
          curr = ((curr << 1) ^ 0x03) % 256
        } else {
          curr = (curr << 1) % 256
        }
      }
      csTable[i] = curr >> 2
    }
    return csTable
  }

  static POLY8 = {
    CRC8: 0xd5,
    CRC8_CCITT: 0x07,
    CRC8_DALLAS_MAXIM: 0x31,
    CRC8_SAE_J1850: 0x1d,
    CRC_8_WCDMA: 0x9b
  }
}

export default Crc68
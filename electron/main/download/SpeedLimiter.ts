// electron/main/download/SpeedLimiter.ts

export class SpeedLimiter {
  private maxBytesPerSec: number
  private bucket: number
  private lastRefill: number
  private static readonly REFILL_WINDOW_MS = 100

  constructor(maxBytesPerSec = 0) {
    this.maxBytesPerSec = maxBytesPerSec
    this.bucket = maxBytesPerSec > 0 ? maxBytesPerSec / 10 : Infinity
    this.lastRefill = Date.now()
  }

  setRate(bytesPerSec: number): void {
    this.maxBytesPerSec = bytesPerSec
    this.bucket = bytesPerSec > 0 ? bytesPerSec / 10 : Infinity
    this.lastRefill = Date.now()
  }

  /**
   * Consume `bytes` from the token bucket.
   * Returns 0 if the caller may proceed immediately.
   * Returns positive ms if the caller should sleep before writing.
   */
  consume(bytes: number): number {
    if (this.maxBytesPerSec === 0) return 0

    const now = Date.now()
    const elapsed = now - this.lastRefill
    if (elapsed >= SpeedLimiter.REFILL_WINDOW_MS) {
      const refill = (elapsed / 1000) * this.maxBytesPerSec
      this.bucket = Math.min(this.maxBytesPerSec / 10, this.bucket + refill)
      this.lastRefill = now
    }

    if (this.bucket >= bytes) {
      this.bucket -= bytes
      return 0
    }

    const deficit = bytes - this.bucket
    const sleepMs = Math.ceil((deficit / this.maxBytesPerSec) * 1000)
    this.bucket = 0
    return sleepMs
  }
}

// electron/main/download/__tests__/SpeedLimiter.test.ts
import { describe, it, expect } from 'vitest'
import { SpeedLimiter } from '../SpeedLimiter'

describe('SpeedLimiter', () => {
  it('returns 0 sleep when maxBytesPerSec is 0 (unlimited)', () => {
    const limiter = new SpeedLimiter(0)
    expect(limiter.consume(1024 * 1024 * 100)).toBe(0)
  })

  it('returns 0 when bucket has enough tokens for the request', () => {
    const limiter = new SpeedLimiter(1024 * 1024) // 1 MB/s → bucket = 102400
    expect(limiter.consume(100_000)).toBe(0)
  })

  it('returns positive sleep ms when bucket is exhausted', () => {
    const limiter = new SpeedLimiter(1024 * 1024) // bucket = 102400
    limiter.consume(102_400) // drain bucket
    const sleep = limiter.consume(50_000)
    expect(sleep).toBeGreaterThan(0)
    expect(sleep).toBeLessThanOrEqual(1000)
  })

  it('setRate(0) makes subsequent consumes unlimited', () => {
    const limiter = new SpeedLimiter(1000)
    limiter.consume(100)
    limiter.setRate(0)
    expect(limiter.consume(999_999)).toBe(0)
  })

  it('setRate updates the rate and refills bucket proportionally', () => {
    const limiter = new SpeedLimiter(512 * 1024) // 512 KB/s
    limiter.setRate(10 * 1024 * 1024)            // 10 MB/s → bucket = 1 MB
    expect(limiter.consume(500_000)).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { clamp, sampleCpuPct, sampleLoadAvg, sampleRtt, walk } from '../metrics'

describe('metrics', () => {
  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
  })

  it('walk stays near baseline', () => {
    const v = walk(10, 2, 10_000)
    expect(v).toBeGreaterThan(5)
    expect(v).toBeLessThan(15)
  })

  it('samples produce parseable numbers', () => {
    expect(Number(sampleCpuPct())).toBeGreaterThan(0)
    const load = sampleLoadAvg()
    expect(Number(load.load1)).toBeGreaterThanOrEqual(0)
    expect(Number(sampleRtt(1.0))).toBeGreaterThan(0)
  })
})

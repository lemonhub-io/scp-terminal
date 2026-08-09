import { describe, expect, it } from 'vitest'
import { isLivePath, readLiveFile } from '../liveFs'
import { SITE } from '../../site/identity'

describe('liveFs', () => {
  it('marks virtual proc/etc paths as live', () => {
    expect(isLivePath('/proc/uptime')).toBe(true)
    expect(isLivePath('/etc/hostname')).toBe(true)
    expect(isLivePath('/home/user/notes.txt')).toBe(false)
  })

  it('serves hostname identity', () => {
    expect(readLiveFile('/etc/hostname')).toBe(`${SITE.hostname}\n`)
  })

  it('serves uptime and loadavg shapes', () => {
    const up = readLiveFile('/proc/uptime')!
    expect(up).toMatch(/^\d+\.\d+ \d+\.\d+\n$/)
    const load = readLiveFile('/proc/loadavg')!
    expect(load.split(' ').length).toBeGreaterThanOrEqual(5)
  })
})

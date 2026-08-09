import { describe, expect, it } from 'vitest'
import {
  expandTimePlaceholdersAt,
  formatUtcDateTime,
  formatUtcStamp,
  parseOffsetMs,
  uptimeParts,
} from '../time'

describe('time utils', () => {
  it('parses compound offsets with a leading sign', () => {
    expect(parseOffsetMs('-1d12h')).toBe(-(86_400_000 + 12 * 3_600_000))
    expect(parseOffsetMs('+36d')).toBe(36 * 86_400_000)
    expect(parseOffsetMs('-30m')).toBe(-30 * 60_000)
    expect(parseOffsetMs('0')).toBe(0)
  })

  it('formats UTC stamps stably', () => {
    const d = new Date('2026-03-20T15:04:05.000Z')
    expect(formatUtcStamp(d)).toBe('2026-03-20 15:04:05')
    expect(formatUtcDateTime(d)).toBe('2026-03-20 15:04:05 UTC')
  })

  it('expands now / offsets relative to a fixed clock', () => {
    const out = expandTimePlaceholdersAt(
      'now={nowStamp} past={ts:-2h} day={date:-1d} month={buildMonth}',
      '2026-08-07T12:00:00.000Z',
    )
    expect(out).toContain('now=2026-08-07 12:00:00')
    expect(out).toContain('past=2026-08-07 10:00:00')
    expect(out).toContain('day=2026-08-06')
    expect(out).toContain('month=2026.08')
  })

  it('computes uptime parts', () => {
    const parts = uptimeParts(90_000)
    expect(parts.minutes).toBe(1)
    expect(parts.seconds).toBe(30)
    expect(parts.days).toBe(0)
  })
})

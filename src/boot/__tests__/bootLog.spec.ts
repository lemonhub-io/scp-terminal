import { describe, expect, it } from 'vitest'
import { BOOT_LINES, findFailures } from '../bootLog'
import type { BootLineKind } from '../bootLog'

const KINDS: BootLineKind[] = ['kernel', 'info', 'ok', 'fail', 'target', 'redacted', 'prompt']

describe('bootLog', () => {
  it('has a non-trivial boot sequence', () => {
    expect(BOOT_LINES.length).toBeGreaterThan(10)
  })

  it('every line has a valid kind', () => {
    for (const line of BOOT_LINES) {
      expect(KINDS).toContain(line.kind)
      expect(line.text.length).toBeGreaterThan(0)
    }
  })

  it('every failure is followed by recovery', () => {
    const failures = findFailures()
    expect(failures.length).toBeGreaterThan(0)
    for (const failure of failures) {
      const index = BOOT_LINES.indexOf(failure)
      const following = BOOT_LINES.slice(index + 1)
      expect(following.some((line) => line.kind === 'ok')).toBe(true)
    }
  })

  it('ends with the login prompt', () => {
    const last = BOOT_LINES[BOOT_LINES.length - 1]!
    expect(last.kind).toBe('prompt')
    expect(last.text).toContain('login')
  })

  it('contains kernel and target lines', () => {
    expect(BOOT_LINES.some((line) => line.kind === 'kernel')).toBe(true)
    expect(BOOT_LINES.some((line) => line.kind === 'target')).toBe(true)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '../../i18n'
import { getBootLines, findFailures } from '../bootLog'
import type { BootLineKind } from '../bootLog'

const KINDS: BootLineKind[] = ['kernel', 'info', 'ok', 'fail', 'target', 'redacted', 'prompt']

describe('bootLog', () => {
  beforeEach(() => {
    setLocale('en')
  })

  it('has a non-trivial boot sequence', () => {
    expect(getBootLines().length).toBeGreaterThan(10)
  })

  it('every line has a valid kind', () => {
    for (const line of getBootLines()) {
      expect(KINDS).toContain(line.kind)
      expect(line.text.length).toBeGreaterThan(0)
    }
  })

  it('every failure is followed by recovery', () => {
    const lines = getBootLines()
    const failures = findFailures()
    expect(failures.length).toBeGreaterThan(0)
    for (const failure of failures) {
      const index = lines.findIndex((line) => line.kind === failure.kind && line.text === failure.text)
      const following = lines.slice(index + 1)
      expect(following.some((line) => line.kind === 'ok')).toBe(true)
    }
  })

  it('ends with the login prompt', () => {
    const lines = getBootLines()
    const last = lines[lines.length - 1]!
    expect(last.kind).toBe('prompt')
    expect(last.text).toContain('login')
  })

  it('contains kernel and target lines', () => {
    const lines = getBootLines()
    expect(lines.some((line) => line.kind === 'kernel')).toBe(true)
    expect(lines.some((line) => line.kind === 'target')).toBe(true)
  })

  it('localizes boot lines for zh-CN', () => {
    setLocale('zh-CN')
    const lines = getBootLines()
    expect(lines.some((line) => line.text.includes('正在'))).toBe(true)
  })
})

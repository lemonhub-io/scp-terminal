import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CredentialsError, MIN_PASSWORD_LENGTH, hasCredentials, register, verify } from '../credentials'
import { mockGetDirectory } from '../../terminal/__tests__/mockOpfs'
import type { MockDirHandle } from '../../terminal/__tests__/mockOpfs'

describe('credentials', () => {
  let root: MockDirHandle

  beforeEach(() => {
    vi.unstubAllGlobals()
    root = mockGetDirectory()
  })

  it('has no credentials on first run', async () => {
    expect(await hasCredentials()).toBe(false)
  })

  it('registers and verifies a user', async () => {
    await register('alice', 'secret123')
    expect(await hasCredentials()).toBe(true)
    expect(await verify('alice', 'secret123')).toBe(true)
  })

  it('rejects wrong username and password', async () => {
    await register('alice', 'secret123')
    expect(await verify('alice', 'wrongpass')).toBe(false)
    expect(await verify('bob', 'secret123')).toBe(false)
  })

  it('trims the username', async () => {
    await register('  alice  ', 'secret123')
    expect(await verify('alice', 'secret123')).toBe(true)
    expect(await verify('  alice  ', 'secret123')).toBe(true)
  })

  it('rejects empty usernames', async () => {
    await expect(register('  ', 'secret123')).rejects.toThrowError(CredentialsError)
  })

  it('rejects short passwords', async () => {
    await expect(register('alice', 'abc'.repeat(MIN_PASSWORD_LENGTH - 3))).rejects.toThrowError(CredentialsError)
  })

  it('rejects duplicate registration', async () => {
    await register('alice', 'secret123')
    await expect(register('bob', 'otherpass')).rejects.toThrowError(/already exists/i)
  })

  it('does not store plaintext passwords', async () => {
    await register('alice', 'secret123')
    const stored = readStored()
    expect(stored).not.toBeNull()
    expect(stored?.hash).not.toContain('secret123')
    expect(stored?.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored?.salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('uses a random salt per registration', async () => {
    await register('alice', 'secret123')
    const first = readStored()
    vi.unstubAllGlobals()
    root = mockGetDirectory()
    await register('bob', 'secret123')
    const second = readStored()
    expect(first?.salt).not.toBe(second?.salt)
  })

  function readStored(): { username: string; salt: string; hash: string } | null {
    const entry = root.entry.children.get('.scp-credentials.json')
    return entry ? (JSON.parse(entry.content) as { username: string; salt: string; hash: string }) : null
  }
})

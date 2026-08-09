import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '../../i18n'
import { CredentialsError, hasCredentials, register, verify, getStoredUsername } from '../credentials'
import { mockGetDirectory } from '../../terminal/__tests__/mockOpfs'
import type { MockDirHandle } from '../../terminal/__tests__/mockOpfs'

describe('credentials', () => {
  let root: MockDirHandle

  beforeEach(() => {
    setLocale('en')
    vi.unstubAllGlobals()
    root = mockGetDirectory()
  })

  it('has no credentials on first run', async () => {
    expect(await hasCredentials()).toBe(false)
  })

  it('registers and verifies a username only', async () => {
    await register('alice')
    expect(await hasCredentials()).toBe(true)
    expect(await verify('alice')).toBe(true)
    expect(await getStoredUsername()).toBe('alice')
  })

  it('rejects wrong username', async () => {
    await register('alice')
    expect(await verify('bob')).toBe(false)
  })

  it('trims the username', async () => {
    await register('  alice  ')
    expect(await verify('alice')).toBe(true)
    expect(await verify('  alice  ')).toBe(true)
  })

  it('rejects empty usernames', async () => {
    await expect(register('  ')).rejects.toThrowError(CredentialsError)
  })

  it('rejects duplicate registration', async () => {
    await register('alice')
    await expect(register('bob')).rejects.toThrowError(/already exists/i)
  })

  it('stores only username without password material', async () => {
    await register('alice')
    const stored = readStored()
    expect(stored).toEqual({ username: 'alice' })
    expect(stored).not.toHaveProperty('hash')
    expect(stored).not.toHaveProperty('salt')
  })

  it('reads legacy files that still contain salt/hash', async () => {
    root = mockGetDirectory()
    const handle = await navigator.storage.getDirectory()
    const file = await handle.getFileHandle('.scp-credentials.json', { create: true })
    const w = await file.createWritable()
    await w.write(
      JSON.stringify({
        username: 'legacy',
        salt: 'aabbccdd',
        hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      }),
    )
    await w.close()
    expect(await hasCredentials()).toBe(true)
    expect(await verify('legacy')).toBe(true)
    expect(await getStoredUsername()).toBe('legacy')
  })

  function readStored(): Record<string, unknown> | null {
    const entry = root.entry.children.get('.scp-credentials.json')
    return entry ? (JSON.parse(entry.content) as Record<string, unknown>) : null
  }
})

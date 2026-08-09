import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FsError } from '../fs/types'
import { OpfsBackend } from '../fs/opfs'
import { mockGetDirectory } from './mockOpfs'

describe('OpfsBackend', () => {
  let fs: OpfsBackend

  beforeEach(async () => {
    vi.unstubAllGlobals()
    mockGetDirectory()
    fs = new OpfsBackend()
    await fs.init()
  })

  it('seeds the initial tree on first run', async () => {
    expect(await fs.exists('/home/user/notes.txt')).toBe(true)
    expect(await fs.exists('/home/user/notes.txt')).toBe(true)
    expect(await fs.exists('/tmp')).toBe(true)
    expect(await fs.exists('/etc')).toBe(true)
    expect(await fs.exists('/usr/bin')).toBe(true)
    expect(await fs.exists('/var/log')).toBe(true)
    expect(await fs.exists('/proc')).toBe(true)
    expect(await fs.read('/etc/hostname')).toBe('site19-admin-01\n')
    expect(await fs.read('/etc/passwd')).toContain('user:x:1000:1000')
  })

  it('does not re-seed when the tree exists', async () => {
    await fs.init()
    await fs.write('/scratch.txt', 'keep')
    await fs.init()
    expect(await fs.exists('/scratch.txt')).toBe(true)
  })

  it('reads and writes file contents', async () => {
    expect(await fs.read('/home/user/notes.txt')).toContain('cd /tmp')
    await fs.write('/data.txt', 'streamed')
    expect(await fs.read('/data.txt')).toBe('streamed')
  })

  it('throws ENOENT for missing paths', async () => {
    await expect(fs.read('/nope.txt')).rejects.toThrowError(FsError)
    await expect(fs.read('/nope.txt')).rejects.toThrowError(/No such file/)
    expect(await fs.exists('/nope.txt')).toBe(false)
  })

  it('exists returns false when parent directories are missing', async () => {
    expect(await fs.exists('/var/mail/alice/inbox.txt')).toBe(false)
    expect(await fs.exists('/srv/site19/personnel/EMP-1001/record.txt')).toBe(false)
    expect(await fs.exists('/nope/deep/nested/file.txt')).toBe(false)
  })

  it('rejects reading a directory', async () => {
    await expect(fs.read('/home')).rejects.toThrowError(/Is a directory/)
    await expect(fs.list('/home/user/notes.txt')).rejects.toThrowError(/Not a directory/)
  })

  it('mkdir throws EEXIST on duplicates', async () => {
    await expect(fs.mkdir('/home')).rejects.toThrowError(/File exists/)
  })

  it('removes files and empty directories', async () => {
    await fs.mkdir('/empty')
    await fs.remove('/empty')
    await fs.remove('/home/user/notes.txt')
    expect(await fs.exists('/home/user/notes.txt')).toBe(false)
  })

  it('rejects removing a non-empty directory', async () => {
    await expect(fs.remove('/home')).rejects.toThrowError(/not empty/i)
  })

  it('rejects removing missing nodes', async () => {
    await expect(fs.remove('/ghost.txt')).rejects.toThrowError(/No such file/)
  })

  it('stat returns entry types', async () => {
    expect(await fs.stat('/tmp')).toMatchObject({ name: 'tmp', type: 'dir', size: 4096 })
    expect(await fs.stat('/home/user/notes.txt')).toMatchObject({ name: 'notes.txt', type: 'file' })
    expect(await fs.stat('/')).toMatchObject({ name: '/', type: 'dir', size: 4096 })
  })
})

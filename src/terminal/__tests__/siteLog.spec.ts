import { beforeEach, describe, expect, it } from 'vitest'
import { FsError } from '../fs/types'
import type { FsBackend, FsEntry } from '../fs/types'
import { ensureSeedTree } from '../fs/seed'
import { appendSiteLog } from '../siteLog'

class MemoryBackend implements FsBackend {
  private nodes = new Map<string, { type: 'dir' | 'file'; content: string }>()
  private initPromise: Promise<void> | null = null

  constructor() {
    this.nodes.set('/', { type: 'dir', content: '' })
  }

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = ensureSeedTree(this)
    }
    return this.initPromise
  }

  async list(path: string): Promise<FsEntry[]> {
    const node = this.requireNode(path)
    if (node.type !== 'dir') {
      throw new FsError('ENOTDIR', path)
    }
    const prefix = path === '/' ? '/' : path + '/'
    return [...this.nodes]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key]) => {
        const name = key.slice(prefix.length)
        const n = this.requireNode(key)
        return { name, type: n.type, size: n.type === 'file' ? n.content.length : 4096 }
      })
  }

  async read(path: string): Promise<string> {
    const node = this.requireNode(path)
    if (node.type !== 'file') {
      throw new FsError('EISDIR', path)
    }
    return node.content
  }

  async write(path: string, content: string): Promise<void> {
    this.nodes.set(path, { type: 'file', content })
  }

  async mkdir(path: string): Promise<void> {
    if (this.nodes.has(path)) {
      throw new FsError('EEXIST', path)
    }
    this.nodes.set(path, { type: 'dir', content: '' })
  }

  async remove(path: string): Promise<void> {
    this.nodes.delete(path)
  }

  async exists(path: string): Promise<boolean> {
    return this.nodes.has(path)
  }

  async stat(path: string): Promise<FsEntry> {
    const node = this.requireNode(path)
    const name = path === '/' ? '/' : path.split('/').pop()!
    return { name, type: node.type, size: node.type === 'file' ? node.content.length : 4096 }
  }

  private requireNode(path: string): { type: 'dir' | 'file'; content: string } {
    const node = this.nodes.get(path)
    if (!node) {
      throw new FsError('ENOENT', path)
    }
    return node
  }
}

describe('siteLog', () => {
  let fs: MemoryBackend

  beforeEach(async () => {
    fs = new MemoryBackend()
    await fs.init()
  })

  it('appends plain text under /var/log/site19', async () => {
    await appendSiteLog(fs, 'check', '\x1b[32m[ OK ]\x1b[0m line one\nline two')
    expect(await fs.exists('/var/log/site19/check.log')).toBe(true)
    const text = await fs.read('/var/log/site19/check.log')
    expect(text).toContain('line one')
    expect(text).toContain('line two')
    expect(text).not.toContain('\x1b[')
    expect(text).toContain('check')
  })
})

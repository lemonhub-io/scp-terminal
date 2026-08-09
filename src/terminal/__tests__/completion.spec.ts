import { beforeEach, describe, expect, it } from 'vitest'
import { FsError } from '../fs/types'
import type { FsBackend, FsEntry } from '../fs/types'
import { ensureSeedTree } from '../fs/seed'
import { completeLine } from '../completion'
import { getCommandNames } from '../shell'

class MemoryBackend implements FsBackend {
  private nodes = new Map<string, { type: 'dir' | 'file'; content: string }>()

  constructor() {
    this.nodes.set('/', { type: 'dir', content: '' })
  }

  async init(): Promise<void> {
    await ensureSeedTree(this)
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
    return this.requireNode(path).content
  }

  async write(path: string, content: string): Promise<void> {
    this.nodes.set(path, { type: 'file', content })
  }

  async mkdir(path: string): Promise<void> {
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
    return { name: path.split('/').pop()!, type: node.type, size: 0 }
  }

  private requireNode(path: string): { type: 'dir' | 'file'; content: string } {
    const node = this.nodes.get(path)
    if (!node) {
      throw new FsError('ENOENT', path)
    }
    return node
  }
}

describe('completion', () => {
  let fs: MemoryBackend

  beforeEach(async () => {
    fs = new MemoryBackend()
    await fs.init()
  })

  it('completes command names', async () => {
    const result = await completeLine('hel', '/home/user', fs, getCommandNames())
    expect(result.line.startsWith('help')).toBe(true)
  })

  it('completes paths under cwd', async () => {
    const result = await completeLine('cat not', '/home/user', fs, getCommandNames())
    expect(result.line).toContain('notes.txt')
  })
})

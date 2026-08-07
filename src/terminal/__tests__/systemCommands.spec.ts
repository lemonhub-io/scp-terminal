import { beforeEach, describe, expect, it } from 'vitest'
import { FsError } from '../fs/types'
import type { FsBackend, FsEntry } from '../fs/types'
import { ensureSeedTree } from '../fs/seed'
import { executeCommand } from '../shell'
import type { CommandContext } from '../shell'

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
      throw new FsError('ENOTDIR', `Not a directory: ${path}`)
    }
    const prefix = path === '/' ? '/' : path + '/'
    return [...this.nodes]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key]) => {
        const name = key.slice(prefix.length)
        const n = this.requireNode(key)
        return { name, type: n.type, size: n.type === 'file' ? n.content.length : 4096 }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async read(path: string): Promise<string> {
    const node = this.requireNode(path)
    if (node.type !== 'file') {
      throw new FsError('EISDIR', `Is a directory: ${path}`)
    }
    return node.content
  }

  async write(path: string, content: string): Promise<void> {
    const existing = this.nodes.get(path)
    if (existing && existing.type !== 'file') {
      throw new FsError('EISDIR', `Is a directory: ${path}`)
    }
    this.nodes.set(path, { type: 'file', content })
  }

  async mkdir(path: string): Promise<void> {
    if (this.nodes.has(path)) {
      throw new FsError('EEXIST', `File exists: ${path}`)
    }
    this.nodes.set(path, { type: 'dir', content: '' })
  }

  async remove(path: string): Promise<void> {
    const node = this.requireNode(path)
    if (node.type === 'dir' && [...this.nodes.keys()].some((key) => key.startsWith(path + '/'))) {
      throw new FsError('ENOTEMPTY', `Directory not empty: ${path}`)
    }
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
      throw new FsError('ENOENT', `No such file or directory: ${path}`)
    }
    return node
  }
}

interface Harness {
  ctx: CommandContext
  streamed: string[]
}

function createContext(): Harness {
  const streamed: string[] = []
  const ctx: CommandContext = {
    fs: new MemoryBackend(),
    cwd: '/home/user',
    user: 'tester',
    stdin: '',
    stdout: () => {},
    stderr: () => {},
    stream: async (t: string) => {
      streamed.push(t)
    },
    clear: () => {},
  }
  return { ctx, streamed }
}

describe('system commands', () => {
  let harness: Harness

  beforeEach(async () => {
    harness = createContext()
    await harness.ctx.fs.init()
  })

  it('sysinfo streams system information', async () => {
    await executeCommand('sysinfo', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('系统名称:SCP-Linux')
    expect(output).toContain('内核版本:6.8.0-scp')
    expect(output).toContain('site19-admin-01')
    expect(output).toContain('[ OK ]')
  })

  it('check streams a full health report', async () => {
    await executeCommand('check', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('CPU')
    expect(output).toContain('内存')
    expect(output).toContain('检查根分区')
    expect(output).toContain('健康检查完成 — 系统状态良好')
  })

  it('network streams interface diagnostics', async () => {
    await executeCommand('network', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('eth0')
    expect(output).toContain('10.4.2.31')
    expect(output).toContain('链路正常')
  })

  it('services lists running services', async () => {
    await executeCommand('services', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('sshd.service')
    expect(output).toContain('site19-storage-opfs.service')
    expect(output).toContain('16 个运行中')
  })

  it('disk shows mount usage table', async () => {
    await executeCommand('disk', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('挂载点')
    expect(output).toContain('62%')
    expect(output).toContain('磁盘检查完成')
  })

  it('security streams a posture scan with site flavor', async () => {
    await executeCommand('security', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('防火墙')
    expect(output).toContain('入侵检测系统')
    expect(output).toContain('E-11 小队')
    expect(output).toContain('安全扫描完成')
  })

  it('trace shows a hop-by-hop path', async () => {
    await executeCommand('trace 1.2.3.4', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('1  gateway.site19.local')
    expect(output).toContain('12  1.2.3.4')
    expect(output).toContain('路径通畅')
  })

  it('trace defaults to a public address', async () => {
    await executeCommand('trace', harness.ctx)
    expect(harness.streamed.join('\n')).toContain('8.8.8.8')
  })

  it('containment streams containment zone status', async () => {
    await executeCommand('containment', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('隔离区管理系统')
    expect(output).toContain('█-5')
    expect(output).toContain('DATA EXPUNGED')
    expect(output).toContain('E-11 巡逻')
    expect(output).toContain('隔离区状态查询完成')
  })

  it('log streams recent site logs with redacted entries', async () => {
    await executeCommand('log', harness.ctx)
    const output = harness.streamed.join('\n')
    expect(output).toContain('site19-watchdog')
    expect(output).toContain('DATA EXPUNGED')
    expect(output).toContain('24 条日志')
  })

  it('appears in the command registry', async () => {
    await executeCommand('help', harness.ctx)
    expect(harness.ctx.stdout).toBeDefined()
  })
})

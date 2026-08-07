import { beforeEach, describe, expect, it } from 'vitest'
import { FsError } from '../fs/types'
import type { FsBackend, FsEntry } from '../fs/types'
import { HOME_DIR } from '../fs/paths'
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
        const node = this.requireNode(key)
        return { name, type: node.type, size: node.type === 'file' ? node.content.length : 4096 }
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

interface TestHarness {
  ctx: CommandContext
  stdout: string[]
  stderr: string[]
  clearCalls: number
}

function createContext(): TestHarness {
  const stdout: string[] = []
  const stderr: string[] = []
  const harness = {
    ctx: {
      fs: new MemoryBackend(),
      cwd: HOME_DIR,
      user: 'tester',
      stdin: '',
      stdout: (t: string) => stdout.push(t),
      stderr: (t: string) => stderr.push(t),
      clear: () => harness.clearCalls++,
      stream: async (t: string) => {
        stdout.push(t)
      },
    },
    stdout,
    stderr,
    clearCalls: 0,
  }
  return harness
}

describe('shell', () => {
  let out: TestHarness

  beforeEach(async () => {
    out = createContext()
    await out.ctx.fs.init()
  })

  it('ignores empty input', async () => {
    await executeCommand('   ', out.ctx)
    expect(out.stdout).toEqual([])
    expect(out.stderr).toEqual([])
  })

  it('reports unknown commands', async () => {
    await executeCommand('frobnicate', out.ctx)
    expect(out.stderr[0]).toContain('command not found')
  })

  it('pwd prints the current directory', async () => {
    await executeCommand('pwd', out.ctx)
    expect(out.stdout).toEqual([HOME_DIR])
  })

  it('cd changes the current directory', async () => {
    await executeCommand('cd /tmp', out.ctx)
    expect(out.ctx.cwd).toBe('/tmp')
    await executeCommand('cd', out.ctx)
    expect(out.ctx.cwd).toBe(HOME_DIR)
  })

  it('cd rejects files and missing paths', async () => {
    await executeCommand('cd notes.txt', out.ctx)
    expect(out.ctx.cwd).toBe(HOME_DIR)
    expect(out.stderr[0]).toContain('Not a directory')
    await executeCommand('cd /nope', out.ctx)
    expect(out.stderr[out.stderr.length - 1]).toContain('No such file')
  })

  it('ls lists directories with trailing slashes', async () => {
    await executeCommand('ls /', out.ctx)
    expect(out.stdout[0]).toContain('home/')
    expect(out.stdout[0]).toContain('tmp/')
    expect(out.stdout[0]).toContain('etc/')
  })

  it('cat prints file contents', async () => {
    await executeCommand('cat notes.txt', out.ctx)
    expect(out.stdout[0]).toContain('cd /tmp')
  })

  it('echo joins arguments with spaces', async () => {
    await executeCommand('echo hello world', out.ctx)
    expect(out.stdout).toEqual(['hello world'])
    await executeCommand('echo', out.ctx)
    expect(out.stdout).toEqual(['hello world', ''])
  })

  it('mkdir, touch and rm work end to end', async () => {
    await executeCommand('mkdir work', out.ctx)
    await executeCommand('touch work/a.txt', out.ctx)
    await executeCommand('ls work', out.ctx)
    expect(out.stdout).toEqual(['a.txt'])
    await executeCommand('rm work/a.txt', out.ctx)
    await executeCommand('rm work', out.ctx)
    await executeCommand('ls /home/user', out.ctx)
    expect(out.stdout[out.stdout.length - 1]).not.toContain('work')
  })

  it('mkdir reports existing paths', async () => {
    await executeCommand('mkdir /home', out.ctx)
    expect(out.stderr[0]).toContain('File exists')
  })

  it('touch reports existing files', async () => {
    await executeCommand('touch notes.txt', out.ctx)
    expect(out.stderr[0]).toContain('File exists')
  })

  it('cat with no file and no stdin prints empty', async () => {
    await executeCommand('cat', out.ctx)
    expect(out.stdout).toEqual([''])
  })

  it('clear invokes the clear callback', async () => {
    await executeCommand('clear', out.ctx)
    expect(out.clearCalls).toBe(1)
  })

  it('help lists all commands', async () => {
    await executeCommand('help', out.ctx)
    const text = out.stdout.join('\n')
    expect(text).toContain('Available commands')
    expect(text).toContain('ls')
    expect(text).toContain('cd')
  })

  it('whoami and uname print identity', async () => {
    await executeCommand('whoami', out.ctx)
    expect(out.stdout).toEqual(['tester'])
    await executeCommand('uname', out.ctx)
    expect(out.stdout[1]).toContain('SCP-Terminal')
  })

  it('date prints a date string', async () => {
    await executeCommand('date', out.ctx)
    expect(out.stdout[0]?.length).toBeGreaterThan(0)
  })

  it('parses quoted arguments and escapes', async () => {
    await executeCommand(`echo 'hello world' "it's" \\$HOME`, out.ctx)
    expect(out.stdout).toEqual(['hello world it\'s $HOME'])
  })

  it('redirects stdout to a file', async () => {
    await executeCommand('echo hello > /tmp/out.txt', out.ctx)
    expect(out.stdout).toEqual([])
    await executeCommand('cat /tmp/out.txt', out.ctx)
    expect(out.stdout).toEqual(['hello'])
  })

  it('appends with >> redirect', async () => {
    await executeCommand('echo one > /tmp/out.txt', out.ctx)
    await executeCommand('echo two >> /tmp/out.txt', out.ctx)
    await executeCommand('cat /tmp/out.txt', out.ctx)
    expect(out.stdout).toEqual(['onetwo'])
  })

  it('pipes stdout into the next command', async () => {
    await executeCommand('echo piped | cat', out.ctx)
    expect(out.stdout).toEqual(['piped'])
  })

  it('cat reads stdin when no file given', async () => {
    await executeCommand('cat', out.ctx)
    expect(out.stdout).toEqual([''])
    await executeCommand('echo data | cat', out.ctx)
    expect(out.stdout[1]).toBe('data')
  })

  it('ls -a shows hidden files', async () => {
    await executeCommand('touch /home/user/.secret', out.ctx)
    await executeCommand('ls /home/user', out.ctx)
    expect(out.stdout[0]).not.toContain('.secret')
    await executeCommand('ls -a /home/user', out.ctx)
    expect(out.stdout[out.stdout.length - 1]).toContain('.secret')
  })

  it('ls -l prints long format', async () => {
    await executeCommand('ls -l /home/user', out.ctx)
    const line = out.stdout[0]
    expect(line).toContain('-rw-r--r--')
    expect(line).toContain('notes.txt')
  })

  it('ls -lh prints human-readable sizes', async () => {
    await executeCommand('echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx > /home/user/big.txt', out.ctx)
    await executeCommand('ls -lh /home/user', out.ctx)
    expect(out.stdout.join('\n')).toContain('big.txt')
  })

  it('echo -n is accepted', async () => {
    await executeCommand('echo -n hello', out.ctx)
    expect(out.stdout).toEqual(['hello'])
  })

  it('cat concatenates multiple files', async () => {
    await executeCommand('echo a > /tmp/a.txt', out.ctx)
    await executeCommand('echo b > /tmp/b.txt', out.ctx)
    await executeCommand('cat /tmp/a.txt /tmp/b.txt', out.ctx)
    expect(out.stdout.join('')).toBe('ab')
  })

  it('mkdir -p creates nested directories', async () => {
    await executeCommand('mkdir -p /tmp/a/b/c', out.ctx)
    await executeCommand('ls /tmp/a/b', out.ctx)
    expect(out.stdout).toEqual(['c/'])
  })

  it('rm -r removes non-empty directories', async () => {
    await executeCommand('mkdir -p /tmp/deep/x', out.ctx)
    await executeCommand('touch /tmp/deep/x/f.txt', out.ctx)
    await executeCommand('rm -r /tmp/deep', out.ctx)
    await executeCommand('ls /tmp', out.ctx)
    expect(out.stdout[0]).not.toContain('deep')
  })

  it('rm -f ignores missing files', async () => {
    await executeCommand('rm -f /tmp/ghost.txt', out.ctx)
    expect(out.stderr).toEqual([])
  })

  it('touch creates multiple files', async () => {
    await executeCommand('touch /tmp/one /tmp/two', out.ctx)
    await executeCommand('ls /tmp', out.ctx)
    expect(out.stdout[0]).toContain('one')
    expect(out.stdout[0]).toContain('two')
  })

  it('uname supports flags', async () => {
    await executeCommand('uname -s', out.ctx)
    expect(out.stdout).toEqual(['SCP-Terminal'])
    await executeCommand('uname -r', out.ctx)
    expect(out.stdout[1]).toBe('6.8.0-scp')
    await executeCommand('uname -n', out.ctx)
    expect(out.stdout[2]).toBe('localhost')
    await executeCommand('uname -a', out.ctx)
    expect(out.stdout[3]).toContain('SCP-Terminal localhost 6.8.0-scp')
  })
})

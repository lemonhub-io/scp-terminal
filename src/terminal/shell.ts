import { t } from '../i18n'
import { FsError } from './fs/types'
import type { FsBackend } from './fs/types'
import { HOME_DIR, resolvePath } from './fs/paths'
import { systemCommands } from './systemCommands'

export interface CommandContext {
  fs: FsBackend
  cwd: string
  user: string
  stdin: string
  stdout: (text: string) => void
  stderr: (text: string) => void
  stream: (text: string) => Promise<void>
  clear: () => void
}

export interface Command {
  name: string
  usage: string
  description: string
  run: (args: string[], ctx: CommandContext) => Promise<void> | void
}

type TokenKind = 'arg' | 'pipe' | 'redirect' | 'append'

interface Token {
  kind: TokenKind
  value: string
}

interface Segment {
  args: string[]
  redirect: { path: string; append: boolean } | null
}

function defineCommand(name: string, run: Command['run']): Command {
  return {
    name,
    get usage() {
      return t(`shell.cmd.${name}.usage`)
    },
    get description() {
      return t(`shell.cmd.${name}.description`)
    },
    run,
  }
}

const commands: Command[] = [
  defineCommand('pwd', (_args, ctx) => {
    ctx.stdout(ctx.cwd)
  }),
  defineCommand('ls', async (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    const showAll = flags.has('-a')
    const long = flags.has('-l')
    const human = flags.has('-h')
    const path = abs(ctx.cwd, positionals[0] ?? '.')
    const entries = (await ctx.fs.list(path)).filter((e) => showAll || !e.name.startsWith('.'))
    if (long) {
      const rows = entries.map((e) => {
        const perm = e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'
        const size = human ? humanizeSize(e.size) : String(e.size)
        return `${perm}  1 user user ${size.padStart(8)} Aug  7 02:00 ${e.name}`
      })
      ctx.stdout(rows.join('\n') || '.')
      return
    }
    ctx.stdout(entries.map((e) => (e.type === 'dir' ? e.name + '/' : e.name)).join('  ') || '.')
  }),
  defineCommand('cd', async (args, ctx) => {
    const path = abs(ctx.cwd, args[0] ?? HOME_DIR)
    const stat = await ctx.fs.stat(path)
    if (stat.type !== 'dir') {
      throw new FsError('ENOTDIR', args[0] ?? '')
    }
    ctx.cwd = path
  }),
  defineCommand('cat', async (args, ctx) => {
    if (args.length === 0) {
      ctx.stdout(ctx.stdin.replace(/\n$/, ''))
      return
    }
    for (const file of args) {
      const content = await ctx.fs.read(abs(ctx.cwd, file))
      ctx.stdout(content.replace(/\n$/, ''))
    }
  }),
  defineCommand('echo', (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    void flags
    ctx.stdout(positionals.join(' '))
  }),
  defineCommand('mkdir', async (args, ctx) => {
    const parent = args[0] === '-p'
    const paths = parent ? args.slice(1) : args
    for (const p of paths) {
      const resolved = abs(ctx.cwd, p)
      if (parent) {
        await mkdirRecursive(ctx.fs, resolved)
      } else {
        await ctx.fs.mkdir(resolved)
      }
    }
  }),
  defineCommand('touch', async (args, ctx) => {
    for (const file of args) {
      const resolved = abs(ctx.cwd, file)
      if (await ctx.fs.exists(resolved)) {
        throw new FsError('EEXIST', file)
      }
      await ctx.fs.write(resolved, '')
    }
  }),
  defineCommand('rm', async (args, ctx) => {
    const recursive = args.includes('-r')
    const force = args.includes('-f')
    const paths = args.filter((a) => !a.startsWith('-'))
    for (const p of paths) {
      const resolved = abs(ctx.cwd, p)
      try {
        if (recursive) {
          await removeRecursive(ctx.fs, resolved)
        } else {
          await ctx.fs.remove(resolved)
        }
      } catch (error) {
        if (force && error instanceof FsError && error.code === 'ENOENT') {
          continue
        }
        throw error
      }
    }
  }),
  defineCommand('clear', (_args, ctx) => {
    ctx.clear()
  }),
  defineCommand('help', (_args, ctx) => {
    const lines = commands.map((c) => `  ${c.usage.padEnd(22)} ${c.description}`)
    ctx.stdout([t('shell.availableCommands'), ...lines, ''].join('\n'))
  }),
  defineCommand('date', (_args, ctx) => {
    ctx.stdout(new Date().toLocaleString())
  }),
  defineCommand('whoami', (_args, ctx) => {
    ctx.stdout(ctx.user)
  }),
  defineCommand('uname', (args, ctx) => {
    const all = args.includes('-a')
    const fields: string[] = []
    if (all || args.includes('-s')) {
      fields.push('SCP-Terminal')
    }
    if (all || args.includes('-n')) {
      fields.push('localhost')
    }
    if (all || args.includes('-r')) {
      fields.push('6.8.0-scp')
    }
    if (fields.length === 0) {
      fields.push('SCP-Terminal')
    }
    ctx.stdout(fields.join(' '))
  }),
  ...systemCommands,
]

const commandByName = new Map(commands.map((c) => [c.name, c]))

export function getCommands(): Command[] {
  return commands
}

export async function executeCommand(line: string, ctx: CommandContext): Promise<void> {
  const tokens = tokenize(line)
  if (tokens.length === 0) {
    return
  }

  const segments = splitSegments(tokens)
  let pipeBuffer = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const [name = '', ...rawArgs] = segment.args
    const command = commandByName.get(name)

    if (!command) {
      ctx.stderr(t('shell.commandNotFound', { name }))
      ctx.stderr(t('shell.helpHint'))
      return
    }

    const isLast = i === segments.length - 1
    let segmentOutput = ''

    const segmentCtx: CommandContext = {
      ...ctx,
      cwd: ctx.cwd,
      stdin: pipeBuffer,
      stdout: (text) => {
        segmentOutput += text
        if (isLast && !segment.redirect) {
          ctx.stdout(text)
        }
      },
      stream: async (text) => {
        if (isLast && !segment.redirect) {
          await ctx.stream(text)
        }
      },
    }

    try {
      await command.run(rawArgs, segmentCtx)
    } catch (error) {
      if (error instanceof Error) {
        ctx.stderr(`${name}: ${error.message}`)
      } else {
        ctx.stderr(`${name}: ${t('shell.unknownError')}`)
      }
    }
    ctx.cwd = segmentCtx.cwd

    if (!isLast) {
      pipeBuffer = segmentOutput.replace(/\n$/, '') + '\n'
      continue
    }

    if (segment.redirect) {
      const target = abs(ctx.cwd, segment.redirect.path)
      const existing = await ctx.fs.exists(target)
      if (segment.redirect.append && existing) {
        const previous = await ctx.fs.read(target)
        await ctx.fs.write(target, previous + segmentOutput)
      } else {
        await ctx.fs.write(target, segmentOutput)
      }
    }
  }
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let current = ''
  let inSingle = false
  let inDouble = false

  const pushCurrent = (): void => {
    if (current.length > 0) {
      tokens.push({ kind: 'arg', value: current })
      current = ''
    }
  }

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inSingle) {
      if (ch === "'") {
        inSingle = false
      } else {
        current += ch
      }
      continue
    }
    if (inDouble) {
      if (ch === '"') {
        inDouble = false
      } else if (ch === '\\' && (line[i + 1] === '"' || line[i + 1] === '\\' || line[i + 1] === '$')) {
        current += line[i + 1]!
        i++
      } else {
        current += ch
      }
      continue
    }
    if (ch === "'") {
      inSingle = true
      continue
    }
    if (ch === '"') {
      inDouble = true
      continue
    }
    if (ch === '\\') {
      current += line[i + 1] ?? ''
      i++
      continue
    }
    if (ch === '|') {
      pushCurrent()
      tokens.push({ kind: 'pipe', value: '|' })
      continue
    }
    if (ch === '>') {
      pushCurrent()
      if (line[i + 1] === '>') {
        tokens.push({ kind: 'append', value: '>>' })
        i++
      } else {
        tokens.push({ kind: 'redirect', value: '>' })
      }
      continue
    }
    if (ch === undefined || /\s/.test(ch)) {
      pushCurrent()
      continue
    }
    current += ch
  }
  pushCurrent()
  return tokens
}

function splitSegments(tokens: Token[]): Segment[] {
  const segments: Segment[] = []
  let args: string[] = []
  let redirect: { path: string; append: boolean } | null = null

  const flush = (): void => {
    if (args.length > 0 || redirect) {
      segments.push({ args, redirect })
    }
    args = []
    redirect = null
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    switch (token.kind) {
      case 'pipe':
        flush()
        break
      case 'redirect':
      case 'append': {
        const pathToken = tokens[i + 1]
        if (pathToken && pathToken.kind === 'arg') {
          redirect = { path: pathToken.value, append: token.kind === 'append' }
          i++
        }
        break
      }
      default:
        args.push(token.value)
    }
  }
  flush()
  return segments
}

function parseOptions(args: string[]): { flags: Set<string>; positionals: string[] } {
  const flags = new Set<string>()
  const positionals: string[] = []
  for (const arg of args) {
    if (arg.startsWith('-') && arg.length > 1) {
      flags.add(arg)
    } else {
      positionals.push(arg)
    }
  }
  return { flags, positionals }
}

function abs(cwd: string, path: string): string {
  const parts = resolvePath(cwd, path)
  return '/' + parts.join('/')
}

async function mkdirRecursive(fs: FsBackend, path: string): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current += '/' + part
    if (!(await fs.exists(current))) {
      await fs.mkdir(current)
    }
  }
}

function humanizeSize(size: number): string {
  if (size >= 1 << 30) {
    return (size / (1 << 30)).toFixed(1) + 'G'
  }
  if (size >= 1 << 20) {
    return (size / (1 << 20)).toFixed(1) + 'M'
  }
  if (size >= 1 << 10) {
    return Math.round(size / (1 << 10)) + 'K'
  }
  return String(size)
}

async function removeRecursive(fs: FsBackend, path: string): Promise<void> {
  const stat = await fs.stat(path)
  if (stat.type === 'file') {
    await fs.remove(path)
    return
  }
  const entries = await fs.list(path)
  for (const entry of entries) {
    await removeRecursive(fs, `${path}/${entry.name}`)
  }
  await fs.remove(path)
}

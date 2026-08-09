import { t } from '../i18n'
import { SITE } from '../site/identity'
import { formatLsMtime, formatUtcDateTime } from '../utils/time'
import { FsError } from './fs/types'
import type { FsBackend } from './fs/types'
import { HOME_DIR, resolvePath } from './fs/paths'
import { isLivePath, readLiveFile } from './liveFs'
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
  /** Optional command history for `history` builtin */
  history?: string[]
}

export type CommandGroup = 'basic' | 'text' | 'system'

export interface Command {
  name: string
  usage: string
  description: string
  group: CommandGroup
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

function defineCommand(name: string, group: CommandGroup, run: Command['run']): Command {
  return {
    name,
    group,
    get usage() {
      return t(`shell.cmd.${name}.usage`)
    },
    get description() {
      return t(`shell.cmd.${name}.description`)
    },
    run,
  }
}

function readTextSource(ctx: CommandContext, pathOrEmpty: string | undefined): Promise<string> {
  if (!pathOrEmpty) {
    return Promise.resolve(ctx.stdin.replace(/\n$/, ''))
  }
  const resolved = abs(ctx.cwd, pathOrEmpty)
  if (isLivePath(resolved)) {
    const live = readLiveFile(resolved)
    if (live != null) {
      return Promise.resolve(live.replace(/\n$/, ''))
    }
  }
  return ctx.fs.read(resolved).then((c) => c.replace(/\n$/, ''))
}

const commands: Command[] = [
  defineCommand('pwd', 'basic', (_args, ctx) => {
    ctx.stdout(ctx.cwd)
  }),
  defineCommand('ls', 'basic', async (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    const showAll = flags.has('-a')
    const long = flags.has('-l')
    const human = flags.has('-h')
    const path = abs(ctx.cwd, positionals[0] ?? '.')
    const entries = (await ctx.fs.list(path)).filter((e) => showAll || !e.name.startsWith('.'))
    if (long) {
      const owner = ctx.user || 'user'
      const rows = entries.map((e) => {
        const perm = e.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'
        const size = human ? humanizeSize(e.size) : String(e.size)
        const mtime = formatLsMtime(e.mtimeMs != null ? new Date(e.mtimeMs) : new Date())
        // root-owned system paths vs home files
        const isSystem = path === '/' || path.startsWith('/etc') || path.startsWith('/proc') || path.startsWith('/var')
        const user = isSystem && !path.startsWith('/home') ? 'root' : owner
        return `${perm}  1 ${user.padEnd(8)} ${user.padEnd(8)} ${size.padStart(8)} ${mtime} ${e.name}`
      })
      ctx.stdout(rows.join('\n') || '.')
      return
    }
    ctx.stdout(entries.map((e) => (e.type === 'dir' ? e.name + '/' : e.name)).join('  ') || '.')
  }),
  defineCommand('cd', 'basic', async (args, ctx) => {
    const path = abs(ctx.cwd, args[0] ?? HOME_DIR)
    const stat = await ctx.fs.stat(path)
    if (stat.type !== 'dir') {
      throw new FsError('ENOTDIR', args[0] ?? '')
    }
    ctx.cwd = path
  }),
  defineCommand('cat', 'text', async (args, ctx) => {
    if (args.length === 0) {
      ctx.stdout(ctx.stdin.replace(/\n$/, ''))
      return
    }
    for (const file of args) {
      const resolved = abs(ctx.cwd, file)
      if (isLivePath(resolved)) {
        const live = readLiveFile(resolved)
        if (live != null) {
          ctx.stdout(live.replace(/\n$/, ''))
          continue
        }
      }
      const content = await ctx.fs.read(resolved)
      ctx.stdout(content.replace(/\n$/, ''))
    }
  }),
  defineCommand('echo', 'text', (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    void flags
    ctx.stdout(positionals.join(' '))
  }),
  defineCommand('mkdir', 'basic', async (args, ctx) => {
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
  defineCommand('touch', 'basic', async (args, ctx) => {
    for (const file of args) {
      const resolved = abs(ctx.cwd, file)
      if (await ctx.fs.exists(resolved)) {
        throw new FsError('EEXIST', file)
      }
      await ctx.fs.write(resolved, '')
    }
  }),
  defineCommand('rm', 'basic', async (args, ctx) => {
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
  defineCommand('clear', 'basic', (_args, ctx) => {
    ctx.clear()
  }),
  defineCommand('grep', 'text', async (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    const ignoreCase = flags.has('-i')
    const pattern = positionals[0]
    if (!pattern) {
      throw new Error(t('shell.grep.needPattern'))
    }
    const files = positionals.slice(1)
    let re: RegExp
    try {
      re = new RegExp(pattern, ignoreCase ? 'i' : '')
    } catch {
      throw new Error(t('shell.grep.badPattern'))
    }
    const sources = files.length > 0 ? files : [undefined]
    const multi = files.length > 1
    for (const file of sources) {
      const text = await readTextSource(ctx, file)
      const lines = text.split('\n')
      for (const line of lines) {
        if (re.test(line)) {
          ctx.stdout(multi && file ? `${file}:${line}` : line)
        }
      }
    }
  }),
  defineCommand('head', 'text', async (args, ctx) => {
    const { n, positionals } = parseLineCount(args, 10)
    const text = await readTextSource(ctx, positionals[0])
    const lines = text === '' ? [] : text.split('\n')
    ctx.stdout(lines.slice(0, n).join('\n'))
  }),
  defineCommand('tail', 'text', async (args, ctx) => {
    const { n, positionals } = parseLineCount(args, 10)
    const text = await readTextSource(ctx, positionals[0])
    const lines = text === '' ? [] : text.split('\n')
    ctx.stdout(lines.slice(-n).join('\n'))
  }),
  defineCommand('wc', 'text', async (args, ctx) => {
    const { flags, positionals } = parseOptions(args)
    const only =
      flags.has('-l') || flags.has('-w') || flags.has('-c')
        ? { l: flags.has('-l'), w: flags.has('-w'), c: flags.has('-c') }
        : { l: true, w: true, c: true }

    const files = positionals.length > 0 ? positionals : [undefined]
    const rows: string[] = []
    for (const file of files) {
      const text = await readTextSource(ctx, file)
      const lineCount = text === '' ? 0 : text.split('\n').length
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      const chars = text.length
      const cols: string[] = []
      if (only.l) {
        cols.push(String(lineCount).padStart(8))
      }
      if (only.w) {
        cols.push(String(words).padStart(8))
      }
      if (only.c) {
        cols.push(String(chars).padStart(8))
      }
      if (file) {
        cols.push(file)
      }
      rows.push(cols.join(' '))
    }
    ctx.stdout(rows.join('\n'))
  }),
  defineCommand('help', 'basic', (args, ctx) => {
    const topic = args[0]
    if (topic) {
      const cmd = commandByName.get(topic)
      if (!cmd) {
        ctx.stderr(t('shell.help.unknown', { name: topic }))
        return
      }
      const manKey = `shell.cmd.${topic}.man`
      const man = t(manKey)
      const body = man === manKey ? cmd.description : man
      ctx.stdout([`${cmd.name} — ${cmd.description}`, '', t('shell.help.usage', { usage: cmd.usage }), '', body, ''].join('\n'))
      return
    }

    const groups: { id: CommandGroup; title: string }[] = [
      { id: 'basic', title: t('shell.help.group.basic') },
      { id: 'text', title: t('shell.help.group.text') },
      { id: 'system', title: t('shell.help.group.system') },
    ]
    const lines: string[] = [t('shell.availableCommands'), '']
    for (const g of groups) {
      const list = commands.filter((c) => c.group === g.id)
      if (list.length === 0) {
        continue
      }
      lines.push(g.title)
      for (const c of list) {
        lines.push(`  ${c.usage.padEnd(24)} ${c.description}`)
      }
      lines.push('')
    }
    lines.push(t('shell.help.hintDetail'))
    ctx.stdout(lines.join('\n'))
  }),
  defineCommand('history', 'basic', (args, ctx) => {
    const hist = ctx.history
    if (!hist || hist.length === 0) {
      ctx.stdout(t('shell.history.empty'))
      return
    }
    const n = args[0] && /^\d+$/.test(args[0]) ? Number(args[0]) : hist.length
    const slice = hist.slice(-n)
    const start = hist.length - slice.length
    ctx.stdout(slice.map((line, i) => `  ${String(start + i + 1).padStart(4)}  ${line}`).join('\n'))
  }),
  defineCommand('date', 'basic', (_args, ctx) => {
    ctx.stdout(formatUtcDateTime(new Date()))
  }),
  defineCommand('whoami', 'basic', (_args, ctx) => {
    ctx.stdout(ctx.user)
  }),
  defineCommand('uname', 'basic', (args, ctx) => {
    const all = args.includes('-a')
    const fields: string[] = []
    if (all || args.includes('-s')) {
      fields.push(SITE.product)
    }
    if (all || args.includes('-n')) {
      fields.push(SITE.hostname)
    }
    if (all || args.includes('-r')) {
      fields.push(SITE.kernel)
    }
    if (fields.length === 0) {
      fields.push(SITE.product)
    }
    ctx.stdout(fields.join(' '))
  }),
  ...systemCommands,
]

const commandByName = new Map(commands.map((c) => [c.name, c]))

export function getCommands(): Command[] {
  return commands
}

export function getCommandNames(): string[] {
  return commands.map((c) => c.name).sort()
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

/** Parse -n N / -nN style line counts for head/tail. */
function parseLineCount(args: string[], defaultN: number): { n: number; positionals: string[] } {
  let n = defaultN
  const positionals: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (a === '-n' && args[i + 1] && /^\d+$/.test(args[i + 1]!)) {
      n = Number(args[i + 1])
      i++
      continue
    }
    const m = a.match(/^-n(\d+)$/)
    if (m) {
      n = Number(m[1])
      continue
    }
    if (a.startsWith('-') && a.length > 1) {
      continue
    }
    positionals.push(a)
  }
  return { n, positionals }
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

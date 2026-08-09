import type { FsBackend } from './fs/types'
import { resolvePath } from './fs/paths'

export interface CompleteResult {
  /** Full line after applying completion (or common prefix). */
  line: string
  /** When multiple matches share no further prefix, list for the caller to display. */
  candidates: string[]
}

function abs(cwd: string, path: string): string {
  const parts = resolvePath(cwd, path)
  return '/' + parts.join('/')
}

function commonPrefix(items: string[]): string {
  if (items.length === 0) {
    return ''
  }
  let prefix = items[0]!
  for (const item of items.slice(1)) {
    let i = 0
    while (i < prefix.length && i < item.length && prefix[i] === item[i]) {
      i++
    }
    prefix = prefix.slice(0, i)
    if (!prefix) {
      break
    }
  }
  return prefix
}

/**
 * Tab-complete the last token: command names when first word, otherwise paths.
 */
export async function completeLine(
  line: string,
  cwd: string,
  fs: FsBackend,
  commandNames: string[],
): Promise<CompleteResult> {
  if ((line.match(/'/g) ?? []).length % 2 === 1 || (line.match(/"/g) ?? []).length % 2 === 1) {
    return { line, candidates: [] }
  }

  const leading = line.match(/^\s*/)?.[0] ?? ''
  const body = line.slice(leading.length)
  if (!body.trim()) {
    return { line, candidates: [] }
  }

  // Split keeping whitespace tokens
  const parts: string[] = []
  let buf = ''
  for (const ch of body) {
    if (/\s/.test(ch)) {
      if (buf) {
        parts.push(buf)
        buf = ''
      }
      if (parts.length && /^\s+$/.test(parts[parts.length - 1]!)) {
        parts[parts.length - 1] += ch
      } else {
        parts.push(ch)
      }
    } else {
      buf += ch
    }
  }
  if (buf) {
    parts.push(buf)
  }

  // Find last non-space token index
  let lastIdx = parts.length - 1
  while (lastIdx >= 0 && /^\s+$/.test(parts[lastIdx]!)) {
    lastIdx--
  }
  if (lastIdx < 0) {
    return { line, candidates: [] }
  }

  const last = parts[lastIdx]!
  const before = parts.slice(0, lastIdx)
  const isFirstWord = before.every((p) => /^\s+$/.test(p))

  if (isFirstWord) {
    const matches = commandNames.filter((n) => n.startsWith(last)).sort()
    if (matches.length === 0) {
      return { line, candidates: [] }
    }
    if (matches.length === 1) {
      parts[lastIdx] = matches[0]! + ' '
      return { line: leading + parts.join(''), candidates: [] }
    }
    const shared = commonPrefix(matches)
    if (shared.length > last.length) {
      parts[lastIdx] = shared
      return { line: leading + parts.join(''), candidates: matches }
    }
    return { line, candidates: matches }
  }

  // Path completion for last token
  const slash = last.lastIndexOf('/')
  const dirHint = slash === -1 ? '.' : last.slice(0, slash + 1) || '/'
  const basePart = slash === -1 ? last : last.slice(slash + 1)
  const dirAbs = abs(cwd, dirHint === '' ? '/' : dirHint)

  let entries: { name: string; type: 'dir' | 'file' }[] = []
  try {
    if (await fs.exists(dirAbs)) {
      const st = await fs.stat(dirAbs)
      if (st.type === 'dir') {
        entries = await fs.list(dirAbs)
      }
    }
  } catch {
    return { line, candidates: [] }
  }

  const matches = entries
    .filter((e) => e.name.startsWith(basePart))
    .filter((e) => basePart.startsWith('.') || !e.name.startsWith('.'))
    .map((e) => {
      const suffix = e.type === 'dir' ? e.name + '/' : e.name
      if (slash === -1) {
        return suffix
      }
      return last.slice(0, slash + 1) + suffix
    })
    .sort()

  if (matches.length === 0) {
    return { line, candidates: [] }
  }
  if (matches.length === 1) {
    parts[lastIdx] = matches[0]!
    return { line: leading + parts.join(''), candidates: [] }
  }
  const shared = commonPrefix(matches)
  if (shared.length > last.length) {
    parts[lastIdx] = shared
    return { line: leading + parts.join(''), candidates: matches }
  }
  return { line, candidates: matches }
}

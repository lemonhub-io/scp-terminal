import type { FsBackend } from './fs/types'

const HISTORY_PATH = '/home/user/.scp_history'
const MAX_ENTRIES = 500

export async function loadHistory(fs: FsBackend): Promise<string[]> {
  try {
    if (!(await fs.exists(HISTORY_PATH))) {
      return []
    }
    const text = await fs.read(HISTORY_PATH)
    return text
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.length > 0)
      .slice(-MAX_ENTRIES)
  } catch {
    return []
  }
}

export async function saveHistory(fs: FsBackend, entries: string[]): Promise<void> {
  const trimmed = entries.slice(-MAX_ENTRIES)
  const parent = '/home/user'
  if (!(await fs.exists(parent))) {
    await fs.mkdir(parent)
  }
  await fs.write(HISTORY_PATH, trimmed.join('\n') + (trimmed.length ? '\n' : ''))
}

export function pushHistory(entries: string[], line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) {
    return entries
  }
  // Drop consecutive duplicates
  if (entries[entries.length - 1] === trimmed) {
    return entries
  }
  const next = [...entries, trimmed]
  if (next.length > MAX_ENTRIES) {
    return next.slice(-MAX_ENTRIES)
  }
  return next
}

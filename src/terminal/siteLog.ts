import { formatUtcStamp } from '../utils/time'
import { stripAnsi } from './ansi'
import type { FsBackend } from './fs/types'

const LOG_DIR = '/var/log/site19'
const MAX_LOG_BYTES = 256 * 1024

async function ensureDir(fs: FsBackend, path: string): Promise<void> {
  const parts = path.split('/').filter(Boolean)
  let current = ''
  for (const part of parts) {
    current += '/' + part
    if (!(await fs.exists(current))) {
      await fs.mkdir(current)
    }
  }
}

/**
 * Append a diagnostic stream to /var/log/site19/<command>.log (plain text).
 * Truncates from the head when the file grows past MAX_LOG_BYTES.
 */
export async function appendSiteLog(fs: FsBackend, command: string, body: string): Promise<void> {
  const safe = command.replace(/[^a-z0-9_-]/gi, '_') || 'unknown'
  const path = `${LOG_DIR}/${safe}.log`
  await ensureDir(fs, LOG_DIR)

  const stamp = formatUtcStamp(new Date())
  const plain = stripAnsi(body).replace(/\r\n/g, '\n')
  const block = `\n===== ${stamp} UTC · ${command} =====\n${plain.replace(/\n$/, '')}\n`

  let next = block
  if (await fs.exists(path)) {
    const prev = await fs.read(path)
    next = prev + block
  }
  if (next.length > MAX_LOG_BYTES) {
    next = next.slice(next.length - MAX_LOG_BYTES)
    const cut = next.indexOf('\n')
    if (cut > 0) {
      next = next.slice(cut + 1)
    }
  }
  await fs.write(path, next)
}

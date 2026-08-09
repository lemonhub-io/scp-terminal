/** Session "boot" — first module evaluation of this page load. */
const SESSION_BOOT_MS = Date.now()

const UNIT_MS: Record<string, number> = {
  d: 86_400_000,
  h: 3_600_000,
  m: 60_000,
  s: 1_000,
}

export function getSessionBootDate(): Date {
  return new Date(SESSION_BOOT_MS)
}

export function getSessionUptimeMs(now = Date.now()): number {
  return Math.max(0, now - SESSION_BOOT_MS)
}

/** Parse offset specs like `-2h`, `+36d`, `-1d12h`, `0`. Leading sign applies to the whole duration. */
export function parseOffsetMs(spec: string): number {
  const trimmed = spec.trim()
  if (trimmed === '' || trimmed === '0') {
    return 0
  }
  const globalSign = trimmed.startsWith('-') ? -1 : 1
  const body = trimmed.replace(/^[+-]/, '')
  const re = /(\d+)([dhms])/gi
  let total = 0
  let matched = false
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    matched = true
    const amount = Number(m[1])
    const unit = m[2]!.toLowerCase()
    total += amount * (UNIT_MS[unit] ?? 0)
  }
  if (!matched) {
    return 0
  }
  return globalSign * total
}

export function offsetDate(spec: string, base = new Date()): Date {
  return new Date(base.getTime() + parseOffsetMs(spec))
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** `2026-03-20 14:05:33 UTC` */
export function formatUtcDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} UTC`
  )
}

/** `2026-03-20 14:05:33` (no zone suffix — for syslog-style lines) */
export function formatUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
  )
}

/** `2026-03-20` */
export function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/** `2026.03` build-style month stamp from a date */
export function formatUtcBuildMonth(date: Date): string {
  return `${date.getUTCFullYear()}.${pad2(date.getUTCMonth() + 1)}`
}

/** `Mar 20 14:05` style for ls -l (local time, Unix-ish) */
export function formatLsMtime(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mon = months[date.getMonth()] ?? 'Jan'
  const day = String(date.getDate()).padStart(2, ' ')
  return `${mon} ${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export interface UptimeParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

export function uptimeParts(ms: number = getSessionUptimeMs()): UptimeParts {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds, totalSeconds }
}

/**
 * Expand dynamic time placeholders in a template string.
 *
 * Supported:
 * - `{now}` `{nowUtc}` — full UTC datetime with zone
 * - `{nowStamp}` — UTC stamp without zone
 * - `{nowDate}` — UTC date only
 * - `{bootTime}` — session boot UTC datetime
 * - `{buildMonth}` — current UTC YYYY.MM
 * - `{ts:-2h}` / `{ts:+36d}` — offset from now as UTC stamp (no zone)
 * - `{tsUtc:-2h}` — offset as full UTC datetime with zone
 * - `{date:-7d}` — offset as UTC date only
 *
 * Named `{params}` from `params` are applied first (except reserved keys processed after).
 */
export function expandTimePlaceholders(
  template: string,
  params: Record<string, string> = {},
  now: Date = new Date(),
): string {
  let out = template

  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{${key}}`).join(value)
  }

  out = out.replace(/\{tsUtc:([+-]?(?:\d+[dhms])+|0)\}/gi, (_m, spec: string) =>
    formatUtcDateTime(offsetDate(spec, now)),
  )
  out = out.replace(/\{ts:([+-]?(?:\d+[dhms])+|0)\}/gi, (_m, spec: string) =>
    formatUtcStamp(offsetDate(spec, now)),
  )
  out = out.replace(/\{date:([+-]?(?:\d+[dhms])+|0)\}/gi, (_m, spec: string) =>
    formatUtcDate(offsetDate(spec, now)),
  )

  const builtins: Record<string, string> = {
    now: formatUtcDateTime(now),
    nowUtc: formatUtcDateTime(now),
    nowStamp: formatUtcStamp(now),
    nowDate: formatUtcDate(now),
    bootTime: formatUtcDateTime(getSessionBootDate()),
    buildMonth: formatUtcBuildMonth(now),
  }
  for (const [key, value] of Object.entries(builtins)) {
    out = out.split(`{${key}}`).join(value)
  }

  return out
}

/** For tests: allow deterministic expansion */
export function expandTimePlaceholdersAt(
  template: string,
  isoNow: string,
  params: Record<string, string> = {},
): string {
  return expandTimePlaceholders(template, params, new Date(isoNow))
}

import { t, tm } from './index'
import {
  expandTimePlaceholders,
  formatUtcDateTime,
  getSessionBootDate,
  getSessionUptimeMs,
  uptimeParts,
} from '../utils/time'

const OK = '\x1b[32m[ OK ]\x1b[0m'
const WARN = '\x1b[33m[ WARN ]\x1b[0m'
const INFO = '\x1b[36m[ INFO ]\x1b[0m'

function pad(value: string, width: number): string {
  return value.padEnd(width)
}

function interpolate(template: string, params: Record<string, string>): string {
  const withStatus = template
    .replace(/\{ok\}/g, OK)
    .replace(/\{warn\}/g, WARN)
    .replace(/\{info\}/g, INFO)

  return expandTimePlaceholders(withStatus, params)
}

/** Resolve a localized line array with status-tag, time, and named placeholders. */
export function formatStreamLines(key: string, params: Record<string, string> = {}): string {
  const lines = tm<string[]>(key)
  const merged = withDefaultTimeParams(params)
  if (!Array.isArray(lines)) {
    return interpolate(String(lines), merged)
  }
  return lines.map((line) => interpolate(String(line), merged)).join('\n')
}

/** Build a fixed-width table from localized header + rows, then inject into lines. */
export function formatTableStream(
  baseKey: string,
  widths: number[],
  params: Record<string, string> = {},
): string {
  const header = tm<string[]>(`${baseKey}.header`)
  const rows = tm<string[][]>(`${baseKey}.rows`)
  const tableLines: string[] = []

  const timeParams = withDefaultTimeParams(params)
  if (Array.isArray(header)) {
    tableLines.push(
      header
        .map((cell, i) => pad(expandTimePlaceholders(String(cell), timeParams), widths[i] ?? 10))
        .join(''),
    )
  }
  if (Array.isArray(rows)) {
    for (const row of rows) {
      tableLines.push(
        row
          .map((cell, i) => pad(expandTimePlaceholders(String(cell), timeParams), widths[i] ?? 10))
          .join(''),
      )
    }
  }

  return formatStreamLines(`${baseKey}.lines`, {
    ...params,
    table: tableLines.join('\n'),
  })
}

function withDefaultTimeParams(params: Record<string, string>): Record<string, string> {
  // Callers should pass collectDynamicParams() for full metrics; keep safe defaults here.
  return {
    uptime: formatUptime(),
    bootTime: formatUtcDateTime(getSessionBootDate()),
    now: formatUtcDateTime(new Date()),
    hostname: 'site19-admin-01',
    fqdn: 'site19-admin-01.ops.site19.local',
    user: 'user',
    ...params,
  }
}

/** Localized real session uptime (since this page load). */
export function formatUptime(): string {
  const { days, hours, minutes, seconds } = uptimeParts(getSessionUptimeMs())
  if (days > 0) {
    return t('time.uptime.withDays', { days, hours, minutes })
  }
  if (hours > 0) {
    return t('time.uptime.withHours', { hours, minutes, seconds })
  }
  if (minutes > 0) {
    return t('time.uptime.withMinutes', { minutes, seconds })
  }
  return t('time.uptime.secondsOnly', { seconds })
}

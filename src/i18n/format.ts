import { t, tm } from './index'

const OK = '\x1b[32m[ OK ]\x1b[0m'
const WARN = '\x1b[33m[ WARN ]\x1b[0m'
const INFO = '\x1b[36m[ INFO ]\x1b[0m'

function pad(value: string, width: number): string {
  return value.padEnd(width)
}

function interpolate(template: string, params: Record<string, string>): string {
  return template
    .replace(/\{ok\}/g, OK)
    .replace(/\{warn\}/g, WARN)
    .replace(/\{info\}/g, INFO)
    .replace(/\{(\w+)\}/g, (match: string, key: string) => (key in params ? params[key]! : match))
}

/** Resolve a localized line array with status-tag and named placeholders. */
export function formatStreamLines(key: string, params: Record<string, string> = {}): string {
  const lines = tm<string[]>(key)
  if (!Array.isArray(lines)) {
    return interpolate(String(lines), params)
  }
  return lines.map((line) => interpolate(String(line), params)).join('\n')
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

  if (Array.isArray(header)) {
    tableLines.push(header.map((cell, i) => pad(String(cell), widths[i] ?? 10)).join(''))
  }
  if (Array.isArray(rows)) {
    for (const row of rows) {
      tableLines.push(row.map((cell, i) => pad(String(cell), widths[i] ?? 10)).join(''))
    }
  }

  return formatStreamLines(`${baseKey}.lines`, {
    ...params,
    table: tableLines.join('\n'),
  })
}

export function formatUptime(): string {
  return t('system.uptime')
}

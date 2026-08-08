import { tm } from '../i18n'

export type BootLineKind = 'kernel' | 'info' | 'ok' | 'fail' | 'target' | 'redacted' | 'prompt'

export interface BootLine {
  text: string
  kind: BootLineKind
}

/** Localized boot sequence for the current locale. */
export function getBootLines(): BootLine[] {
  const lines = tm<BootLine[]>('boot.lines')
  return Array.isArray(lines) ? lines.map((line) => ({ kind: line.kind, text: line.text })) : []
}

/**
 * Static accessor used by tests and skip-path callers.
 * Prefer getBootLines() for runtime UI so locale switches are respected.
 */
export const BOOT_LINES: BootLine[] = new Proxy([] as BootLine[], {
  get(_target, prop, receiver) {
    const lines = getBootLines()
    if (prop === 'length') {
      return lines.length
    }
    if (prop === Symbol.iterator) {
      return lines[Symbol.iterator].bind(lines)
    }
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return lines[Number(prop)]
    }
    const value = Reflect.get(lines, prop, receiver)
    return typeof value === 'function' ? value.bind(lines) : value
  },
})

export function findFailures(): BootLine[] {
  return getBootLines().filter((line) => line.kind === 'fail')
}

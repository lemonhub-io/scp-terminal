export const HOME_DIR = '/home/user'

export interface PathParts {
  parts: string[]
  name: string
}

export function normalizeParts(cwd: string, path: string): string[] {
  const parts = path.startsWith('/') ? [] : cwd.split('/').filter(Boolean)
  for (const part of path.split('/')) {
    if (part === '' || part === '.') {
      continue
    }
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts
}

export function resolvePath(cwd: string, path: string): string[] {
  return normalizeParts(cwd, path)
}

export function splitParent(cwd: string, path: string): PathParts {
  const parts = normalizeParts(cwd, path)
  const name = parts.pop()
  if (!name) {
    throw new Error(`Invalid path: ${path}`)
  }
  return { parts, name }
}

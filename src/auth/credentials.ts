const CREDENTIALS_FILE = '.scp-credentials.json'

export interface StoredCredentials {
  username: string
  salt: string
  hash: string
}

export const MIN_PASSWORD_LENGTH = 4

export class CredentialsError extends Error {}

export async function hasCredentials(): Promise<boolean> {
  const root = await getRoot()
  try {
    await root.getFileHandle(CREDENTIALS_FILE)
    return true
  } catch {
    return false
  }
}

export async function register(username: string, password: string): Promise<void> {
  const trimmed = username.trim()
  if (!trimmed) {
    throw new CredentialsError('Username must not be empty')
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new CredentialsError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  if (await hasCredentials()) {
    throw new CredentialsError('Account already exists')
  }

  const salt = randomSalt()
  const hash = await hashPassword(password, salt)
  await writeCredentials({ username: trimmed, salt, hash })
}

export async function verify(username: string, password: string): Promise<boolean> {
  const stored = await readCredentials()
  if (!stored) {
    return false
  }
  if (stored.username !== username.trim()) {
    return false
  }
  const candidate = await hashPassword(password, stored.salt)
  return timingSafeEqual(candidate, stored.hash)
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function readCredentials(): Promise<StoredCredentials | null> {
  const root = await getRoot()
  let file: FileSystemFileHandle
  try {
    file = await root.getFileHandle(CREDENTIALS_FILE)
  } catch {
    return null
  }
  const text = await (await file.getFile()).text()
  return JSON.parse(text) as StoredCredentials
}

async function writeCredentials(credentials: StoredCredentials): Promise<void> {
  const root = await getRoot()
  const file = await root.getFileHandle(CREDENTIALS_FILE, { create: true })
  const writable = await file.createWritable()
  await writable.write(JSON.stringify(credentials))
  await writable.close()
}

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory()
}

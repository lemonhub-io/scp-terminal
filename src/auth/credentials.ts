import { t } from '../i18n'

const CREDENTIALS_FILE = '.scp-credentials.json'

/** Username-only profile stored in OPFS (no password). */
export interface StoredCredentials {
  username: string
}

export type CredentialsErrorCode = 'empty_username' | 'account_exists'

export class CredentialsError extends Error {
  code: CredentialsErrorCode

  constructor(code: CredentialsErrorCode, params?: Record<string, unknown>) {
    super(t(`auth.errors.${code}`, params))
    this.name = 'CredentialsError'
    this.code = code
  }
}

export async function hasCredentials(): Promise<boolean> {
  return (await readCredentials()) != null
}

export async function register(username: string): Promise<void> {
  const trimmed = username.trim()
  if (!trimmed) {
    throw new CredentialsError('empty_username')
  }

  if (await hasCredentials()) {
    throw new CredentialsError('account_exists')
  }

  await writeCredentials({ username: trimmed })
}

/** Confirm the given username matches the stored profile. */
export async function verify(username: string): Promise<boolean> {
  const stored = await readCredentials()
  if (!stored) {
    return false
  }
  return stored.username === username.trim()
}

export async function getStoredUsername(): Promise<string | null> {
  const stored = await readCredentials()
  return stored?.username ?? null
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
  try {
    const raw = JSON.parse(text) as { username?: unknown }
    if (typeof raw.username !== 'string' || !raw.username.trim()) {
      return null
    }
    // Ignore legacy salt/hash fields if present — password auth removed
    return { username: raw.username.trim() }
  } catch {
    return null
  }
}

async function writeCredentials(credentials: StoredCredentials): Promise<void> {
  const root = await getRoot()
  const file = await root.getFileHandle(CREDENTIALS_FILE, { create: true })
  const writable = await file.createWritable()
  await writable.write(JSON.stringify({ username: credentials.username }))
  await writable.close()
}

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory()
}

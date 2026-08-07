import type { FsBackend } from './types'
import { OpfsBackend } from './opfs'

export async function createBackend(): Promise<FsBackend> {
  const backend = new OpfsBackend()
  await backend.init()
  return backend
}

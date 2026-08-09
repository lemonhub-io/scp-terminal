import { FsError } from './types'
import type { FsBackend, FsEntry } from './types'
import { ensureSeedTree } from './seed'

type DirHandle = FileSystemDirectoryHandle
type FileHandle = FileSystemFileHandle

export class OpfsBackend implements FsBackend {
  private root: DirHandle | null = null

  async init(): Promise<void> {
    this.root = await navigator.storage.getDirectory()
    await ensureSeedTree(this)
  }

  async list(path: string): Promise<FsEntry[]> {
    const parts = toParts(path)
    const dir = await this.resolveDir(parts, path)
    const entries: FsEntry[] = []
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileHandle).getFile()
        entries.push({ name, type: 'file', size: file.size, mtimeMs: file.lastModified })
      } else {
        entries.push({ name, type: 'dir', size: 4096, mtimeMs: Date.now() })
      }
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }

  async read(path: string): Promise<string> {
    const { dir, name } = await this.splitFile(path)
    let file: FileHandle
    try {
      file = await dir.getFileHandle(name)
    } catch (error) {
      throw mapLookupError(error, path, true)
    }
    return (await file.getFile()).text()
  }

  async write(path: string, content: string): Promise<void> {
    const { dir, name } = await this.splitFile(path)
    let file: FileHandle
    try {
      file = await dir.getFileHandle(name, { create: true })
    } catch (error) {
      throw mapLookupError(error, path, true)
    }
    const writable = await file.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async mkdir(path: string): Promise<void> {
    const { dir, name } = await this.splitFile(path)
    let existing: DirHandle | undefined
    try {
      existing = await dir.getDirectoryHandle(name)
    } catch {
      // not present yet — fine
    }
    if (existing) {
      throw new FsError('EEXIST', path)
    }
    try {
      await dir.getDirectoryHandle(name, { create: true })
    } catch (error) {
      throw mapLookupError(error, path, true)
    }
  }

  async remove(path: string): Promise<void> {
    const { dir, name } = await this.splitFile(path)
    let entryType: 'dir' | 'file' | undefined
    try {
      await dir.getDirectoryHandle(name)
      entryType = 'dir'
    } catch {
      try {
        await dir.getFileHandle(name)
        entryType = 'file'
      } catch {
        throw new FsError('ENOENT', path)
      }
    }
    if (entryType === 'dir') {
      const sub = await dir.getDirectoryHandle(name)
      let hasChildren = false
      for await (const _ of sub.entries()) {
        hasChildren = true
        break
      }
      if (hasChildren) {
        throw new FsError('ENOTEMPTY', path)
      }
    }
    await dir.removeEntry(name)
  }

  async exists(path: string): Promise<boolean> {
    const parts = toParts(path)
    if (parts.length === 0) {
      return true
    }
    try {
      const { dir, name } = await this.splitFile(path)
      try {
        await dir.getDirectoryHandle(name)
        return true
      } catch {
        try {
          await dir.getFileHandle(name)
          return true
        } catch {
          return false
        }
      }
    } catch {
      return false
    }
  }

  async stat(path: string): Promise<FsEntry> {
    const parts = toParts(path)
    if (parts.length === 0) {
      return { name: '/', type: 'dir', size: 4096, mtimeMs: Date.now() }
    }
    const { dir, name } = await this.splitFile(path)
    try {
      await dir.getDirectoryHandle(name)
      return { name, type: 'dir', size: 4096, mtimeMs: Date.now() }
    } catch {
      try {
        const file = await dir.getFileHandle(name)
        const blob = await file.getFile()
        return { name, type: 'file', size: blob.size, mtimeMs: blob.lastModified }
      } catch (error) {
        throw mapLookupError(error, path, false)
      }
    }
  }

  private async resolveDir(parts: string[], path: string): Promise<DirHandle> {
    let dir = this.requireRoot()
    for (const part of parts) {
      try {
        dir = await dir.getDirectoryHandle(part)
      } catch (error) {
        throw mapLookupError(error, path, false)
      }
    }
    return dir
  }

  private async splitFile(path: string): Promise<{ dir: DirHandle; name: string }> {
    const parts = toParts(path)
    const name = parts.pop() ?? ''
    if (parts.length === 0 && name === '') {
      throw new FsError('EISDIR', path)
    }
    const dir = await this.resolveDir(parts, path)
    return { dir, name }
  }

  private requireRoot(): DirHandle {
    if (!this.root) {
      throw new FsError('ENOENT', '/')
    }
    return this.root
  }
}

function toParts(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function mapLookupError(error: unknown, path: string, asFile: boolean): FsError {
  if (error instanceof FsError) {
    return error
  }
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotFoundError':
        return new FsError('ENOENT', path)
      case 'TypeMismatchError':
        return new FsError(asFile ? 'EISDIR' : 'ENOTDIR', path)
      case 'InvalidModificationError':
        return new FsError('EEXIST', path)
    }
  }
  throw error
}

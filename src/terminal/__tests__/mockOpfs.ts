import { vi } from 'vitest'

export interface MockEntry {
  kind: 'directory' | 'file'
  content: string
  children: Map<string, MockEntry>
}

export function makeEntry(kind: 'directory' | 'file', content = ''): MockEntry {
  return { kind, content, children: new Map() }
}

export class MockDirHandle implements FileSystemDirectoryHandle {
  readonly kind = 'directory' as const
  constructor(readonly name: string, readonly entry: MockEntry) {}

  async resolve(_possibleDescendant: FileSystemHandle): Promise<string[] | null> {
    return null
  }

  [Symbol.asyncIterator](): FileSystemDirectoryHandleAsyncIterator<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  > {
    return this.entries()
  }

  private makeAsyncIterator<T>(items: T[]): FileSystemDirectoryHandleAsyncIterator<T> {
    let index = 0
    const done = { value: undefined, done: true } as IteratorResult<T, undefined>
    const iterator: FileSystemDirectoryHandleAsyncIterator<T> = {
      next: async () => {
        if (index >= items.length) {
          return done
        }
        const item = items[index++] as T
        return { value: item, done: false }
      },
      return: async () => {
        index = items.length
        return done
      },
      throw: async (error: unknown) => {
        throw error
      },
      [Symbol.asyncIterator]() {
        return this
      },
      [Symbol.asyncDispose]: async () => {},
    }
    return iterator
  }

  entries(): FileSystemDirectoryHandleAsyncIterator<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  > {
    return this.makeAsyncIterator(
      [...this.entry.children].map(
        ([name, child]) =>
          [name, child.kind === 'directory' ? new MockDirHandle(name, child) : new MockFileHandle(name, child)] as [
            string,
            FileSystemDirectoryHandle | FileSystemFileHandle,
          ],
      ),
    )
  }

  keys(): FileSystemDirectoryHandleAsyncIterator<string> {
    return this.makeAsyncIterator([...this.entry.children.keys()])
  }

  values(): FileSystemDirectoryHandleAsyncIterator<FileSystemDirectoryHandle | FileSystemFileHandle> {
    return this.makeAsyncIterator(
      [...this.entry.children].map(([name, child]) =>
        child.kind === 'directory' ? new MockDirHandle(name, child) : new MockFileHandle(name, child),
      ),
    )
  }

  async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> {
    const child = this.entry.children.get(name)
    if (child?.kind === 'directory') {
      return new MockDirHandle(name, child)
    }
    if (child?.kind === 'file') {
      throw new DOMException('Type mismatch', 'TypeMismatchError')
    }
    if (!options?.create) {
      throw new DOMException('Not found', 'NotFoundError')
    }
    const fresh = makeEntry('directory')
    this.entry.children.set(name, fresh)
    return new MockDirHandle(name, fresh)
  }

  async getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle> {
    const child = this.entry.children.get(name)
    if (child?.kind === 'file') {
      return new MockFileHandle(name, child)
    }
    if (child?.kind === 'directory') {
      throw new DOMException('Type mismatch', 'TypeMismatchError')
    }
    if (!options?.create) {
      throw new DOMException('Not found', 'NotFoundError')
    }
    const fresh = makeEntry('file')
    this.entry.children.set(name, fresh)
    return new MockFileHandle(name, fresh)
  }

  async removeEntry(name: string): Promise<void> {
    const child = this.entry.children.get(name)
    if (!child) {
      throw new DOMException('Not found', 'NotFoundError')
    }
    if (child.kind === 'directory' && child.children.size > 0) {
      throw new DOMException('Invalid modification', 'InvalidModificationError')
    }
    this.entry.children.delete(name)
  }

  async isSameEntry(): Promise<boolean> {
    return false
  }
}

export class MockFileHandle implements FileSystemFileHandle {
  readonly kind = 'file' as const
  constructor(readonly name: string, readonly entry: MockEntry) {}

  async getFile(): Promise<File> {
    return new File([this.entry.content], this.name)
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    const write = vi.fn<(data: string) => Promise<void>>(async (data: string) => {
      this.entry.content = String(data)
    })
    const close = vi.fn<() => Promise<void>>(async () => {})
    const seek = vi.fn<(position: number) => Promise<void>>(async () => {})
    const truncate = vi.fn<(size: number) => Promise<void>>(async () => {})
    const mock = {
      write,
      close,
      seek,
      truncate,
    }
    return mock as unknown as FileSystemWritableFileStream
  }

  async isSameEntry(): Promise<boolean> {
    return false
  }
}

export function mockGetDirectory(): MockDirHandle {
  const root = new MockDirHandle('', makeEntry('directory'))
  vi.stubGlobal('navigator', {
    storage: { getDirectory: vi.fn<() => Promise<MockDirHandle>>(async () => root) },
  })
  return root
}

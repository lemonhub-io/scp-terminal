export type FsErrorCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'ENOTEMPTY'

export class FsError extends Error {
  code: FsErrorCode

  constructor(code: FsErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface FsEntry {
  name: string
  type: 'dir' | 'file'
  size: number
}

export interface FsBackend {
  init(): Promise<void>
  list(path: string): Promise<FsEntry[]>
  read(path: string): Promise<string>
  write(path: string, content: string): Promise<void>
  mkdir(path: string): Promise<void>
  remove(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  stat(path: string): Promise<FsEntry>
}

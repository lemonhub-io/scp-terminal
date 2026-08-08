import { t } from '../../i18n'
import type { FsBackend } from './types'

export const HOME_DIR = '/home/user'

export const SEED_DIRS: string[] = [
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/home',
  HOME_DIR,
  '/lib',
  '/media',
  '/mnt',
  '/opt',
  '/proc',
  '/root',
  '/sbin',
  '/srv',
  '/sys',
  '/tmp',
  '/usr',
  '/usr/bin',
  '/usr/lib',
  '/usr/local',
  '/usr/local/bin',
  '/usr/local/lib',
  '/usr/share',
  '/var',
  '/var/cache',
  '/var/lib',
  '/var/log',
  '/var/spool',
  '/var/tmp',
]

export function getSeedFiles(): Record<string, string> {
  return {
    '/etc/hostname': 'localhost',
    '/etc/passwd':
      'root:x:0:0:root:/root:/bin/sh\nuser:x:1000:1000:user:/home/user:/bin/bash\n',
    '/etc/hosts': '127.0.0.1\tlocalhost\n::1\t\tlocalhost ip6-localhost ip6-loopback\n',
    '/etc/fstab': '# /etc/fstab: static file system information\n',
    '/proc/version': 'SCP-Terminal 1.0.0 (xterm.js)\n',
    '/proc/uptime': '0.00 0.00\n',
    '/proc/cpuinfo': 'processor\t: 0\nmodel name\t: Virtual Terminal CPU\n',
    '/home/user/notes.txt': t('seed.notes'),
  }
}

/** @deprecated Prefer getSeedFiles() so notes.txt follows locale */
export const SEED_FILES: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop) {
    if (typeof prop === 'string') {
      return getSeedFiles()[prop]
    }
    return undefined
  },
  ownKeys() {
    return Reflect.ownKeys(getSeedFiles())
  },
  getOwnPropertyDescriptor(_target, prop) {
    const files = getSeedFiles()
    if (typeof prop === 'string' && prop in files) {
      return { configurable: true, enumerable: true, value: files[prop] }
    }
    return undefined
  },
})

export const REMOVED_SEED_FILES: string[] = ['/etc/motd', '/home/user/welcome.txt']

export async function ensureSeedTree(fs: FsBackend): Promise<void> {
  for (const dir of SEED_DIRS) {
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir)
    }
  }
  for (const [path, content] of Object.entries(getSeedFiles())) {
    if (!(await fs.exists(path))) {
      await fs.write(path, content)
    }
  }
  for (const path of REMOVED_SEED_FILES) {
    if (await fs.exists(path)) {
      await fs.remove(path)
    }
  }
}

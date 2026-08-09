import { t } from '../../i18n'
import { SITE } from '../../site/identity'
import { readLiveFile } from '../liveFs'
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

/** Always refreshed on init so locale/identity stay consistent. */
export const REFRESH_SEED_FILES = new Set([
  '/etc/hostname',
  '/proc/version',
  '/proc/uptime',
  '/proc/loadavg',
  '/proc/meminfo',
  '/proc/cpuinfo',
  '/home/user/notes.txt',
])

export function getSeedFiles(): Record<string, string> {
  const uptime = readLiveFile('/proc/uptime') ?? '0.00 0.00\n'
  const loadavg = readLiveFile('/proc/loadavg') ?? '0.00 0.00 0.00 1/1 1\n'
  const meminfo = readLiveFile('/proc/meminfo') ?? ''
  const cpuinfo = readLiveFile('/proc/cpuinfo') ?? ''
  const version = readLiveFile('/proc/version') ?? `${SITE.product}\n`
  const hostname = readLiveFile('/etc/hostname') ?? `${SITE.hostname}\n`

  return {
    '/etc/hostname': hostname,
    '/etc/passwd':
      'root:x:0:0:root:/root:/bin/sh\nuser:x:1000:1000:user:/home/user:/bin/bash\n',
    '/etc/hosts':
      `127.0.0.1\tlocalhost ${SITE.hostname}\n` +
      `::1\t\tlocalhost ip6-localhost ip6-loopback\n` +
      `10.4.2.31\t${SITE.fqdn} ${SITE.hostname}\n`,
    '/etc/fstab': '# /etc/fstab: static file system information\n',
    '/proc/version': version,
    '/proc/uptime': uptime,
    '/proc/loadavg': loadavg,
    '/proc/meminfo': meminfo,
    '/proc/cpuinfo': cpuinfo,
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
    const exists = await fs.exists(path)
    if (!exists || REFRESH_SEED_FILES.has(path)) {
      await fs.write(path, content)
    }
  }
  for (const path of REMOVED_SEED_FILES) {
    if (await fs.exists(path)) {
      await fs.remove(path)
    }
  }
}

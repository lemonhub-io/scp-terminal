import { SITE } from '../site/identity'
import { sampleLoadAvg, sampleMem, sampleProcessCount, sampleCpuPct } from '../utils/metrics'
import { getSessionUptimeMs } from '../utils/time'

/** Paths served live at read time (not frozen OPFS seed). */
export const LIVE_PATHS = new Set([
  '/proc/uptime',
  '/proc/loadavg',
  '/proc/meminfo',
  '/proc/version',
  '/proc/cpuinfo',
  '/etc/hostname',
])

export function isLivePath(path: string): boolean {
  return LIVE_PATHS.has(path)
}

export function readLiveFile(path: string): string | null {
  switch (path) {
    case '/proc/uptime': {
      const secs = getSessionUptimeMs() / 1000
      return `${secs.toFixed(2)} ${(secs * 0.35).toFixed(2)}\n`
    }
    case '/proc/loadavg': {
      const { load1, load5, load15 } = sampleLoadAvg()
      const { procTotal, procRunning } = sampleProcessCount()
      // loadavg format: 1 5 15 running/total lastpid
      return `${load1} ${load5} ${load15} ${procRunning}/${procTotal} ${SITE.shellPidBase}\n`
    }
    case '/proc/meminfo': {
      const { memUsed, memTotal } = sampleMem()
      const totalKb = Math.round(Number(memTotal) * 1024 * 1024)
      const usedKb = Math.round(Number(memUsed) * 1024 * 1024)
      const freeKb = Math.max(0, totalKb - usedKb)
      return [
        `MemTotal:       ${String(totalKb).padStart(8)} kB`,
        `MemFree:        ${String(freeKb).padStart(8)} kB`,
        `MemAvailable:   ${String(Math.round(freeKb * 0.92)).padStart(8)} kB`,
        `Buffers:        ${String(Math.round(totalKb * 0.02)).padStart(8)} kB`,
        `Cached:         ${String(Math.round(totalKb * 0.08)).padStart(8)} kB`,
        `SwapTotal:      ${String(2 * 1024 * 1024).padStart(8)} kB`,
        `SwapFree:       ${String(2 * 1024 * 1024).padStart(8)} kB`,
        '',
      ].join('\n')
    }
    case '/proc/version':
      return `${SITE.product} ${SITE.productVersion} (${SITE.kernel}, xterm.js) ${SITE.arch}\n`
    case '/proc/cpuinfo': {
      const mhz = (2400 + Number(sampleCpuPct()) * 2).toFixed(3)
      return [
        'processor\t: 0',
        'vendor_id\t: GenuineSite19',
        'cpu family\t: 6',
        'model name\t: Intel Xeon E5-2680v4 @ 2.40GHz',
        `cpu MHz\t\t: ${mhz}`,
        'cache size\t: 35840 KB',
        `siblings\t: 8`,
        `cpu cores\t: 8`,
        '',
      ].join('\n')
    }
    case '/etc/hostname':
      return `${SITE.hostname}\n`
    default:
      return null
  }
}

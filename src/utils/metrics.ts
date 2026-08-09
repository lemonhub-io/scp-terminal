import { getSessionUptimeMs } from './time'
import { SITE } from '../site/identity'

/** Bounded random walk around a baseline (changes slowly with time). */
export function walk(base: number, amplitude: number, periodMs = 17_000): number {
  const t = Date.now() / periodMs
  const wave = Math.sin(t) * 0.55 + Math.sin(t * 1.7 + 1.3) * 0.35 + Math.sin(t * 0.4 + 2.1) * 0.1
  const noise = (Math.random() - 0.5) * 0.15
  return base + amplitude * (wave + noise)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function fmt1(n: number): string {
  return n.toFixed(1)
}

export function fmt2(n: number): string {
  return n.toFixed(2)
}

export function sampleLoadAvg(): { load1: string; load5: string; load15: string } {
  const upMin = getSessionUptimeMs() / 60_000
  // Quiet admin host — load rises slightly after boot then settles
  const base = clamp(0.04 + Math.min(0.2, upMin * 0.01), 0.04, 0.35)
  const l1 = clamp(walk(base, 0.08, 9_000), 0.02, 1.2)
  const l5 = clamp(walk(base * 0.85, 0.05, 22_000), 0.02, 1.0)
  const l15 = clamp(walk(base * 0.7, 0.03, 45_000), 0.01, 0.8)
  return { load1: fmt2(l1), load5: fmt2(l5), load15: fmt2(l15) }
}

export function sampleCpuPct(): string {
  return fmt1(clamp(walk(12.4, 3.5, 11_000), 4, 28))
}

export function sampleMem(): { memUsed: string; memTotal: string; memPct: string } {
  const total = 16
  let used = 6.8
  if (typeof performance !== 'undefined') {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
    if (perf.memory?.usedJSHeapSize) {
      // Map heap into a plausible "host RAM used" band without claiming real system RAM
      const heapGb = perf.memory.usedJSHeapSize / (1024 ** 3)
      used = clamp(5.5 + heapGb * 8, 5.2, 12.5)
    } else {
      used = clamp(walk(6.8, 0.6, 30_000), 5.5, 9.5)
    }
  } else {
    used = clamp(walk(6.8, 0.6, 30_000), 5.5, 9.5)
  }
  const pct = (used / total) * 100
  return { memUsed: fmt1(used), memTotal: String(total), memPct: fmt1(pct) }
}

export function sampleTempC(): string {
  return String(Math.round(clamp(walk(42, 2.2, 40_000), 38, 48)))
}

export function sampleFanRpm(): string {
  return String(Math.round(clamp(walk(3200, 180, 25_000), 2800, 3600)))
}

export function sampleRtt(baseMs: number, amp = 0.25): string {
  return fmt1(clamp(walk(baseMs, amp, 8_000 + baseMs * 200), baseMs * 0.5, baseMs * 2.2))
}

export function sampleProcessCount(): { procTotal: string; procRunning: string } {
  const total = Math.round(clamp(walk(184, 8, 50_000), 170, 210))
  const running = Math.round(clamp(walk(2.2, 1.2, 7_000), 1, 6))
  return { procTotal: String(total), procRunning: String(running) }
}

export function samplePowerLoad(): { pduLoadKw: string; upsLoadPct: string; batteryPct: string } {
  return {
    pduLoadKw: fmt1(clamp(walk(1.9, 0.15, 35_000), 1.5, 2.4)),
    upsLoadPct: String(Math.round(clamp(walk(41, 3, 40_000), 32, 55))),
    batteryPct: String(Math.round(clamp(walk(99.5, 0.8, 120_000), 97, 100))),
  }
}

export function sampleClimate(): { ambientC: string; humidity: string; co2: string } {
  return {
    ambientC: fmt1(clamp(walk(21.3, 0.25, 55_000), 20.6, 22.0)),
    humidity: String(Math.round(clamp(walk(43, 2, 60_000), 38, 50))),
    co2: String(Math.round(clamp(walk(612, 40, 45_000), 520, 780))),
  }
}

export interface DiskEstimate {
  diskRootSize: string
  diskRootUsed: string
  diskRootAvail: string
  diskRootPct: string
  diskQuotaHint: string
}

function humanGiB(bytes: number): string {
  const g = bytes / (1024 ** 3)
  if (g >= 10) {
    return `${Math.round(g)}G`
  }
  return `${fmt1(g)}G`
}

/** Map browser storage estimate onto fictional root volume numbers. */
export async function estimateDiskParams(): Promise<DiskEstimate> {
  // Fictional virtio root stays ~2.1G narrative; overlay real browser usage as "used" share when available
  const rootBytes = 2.1 * 1024 ** 3
  let usedFrac = 0.62
  let quotaHint = 'browser-storage:n/a'

  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      if (est.quota && est.quota > 0) {
        const usage = est.usage ?? 0
        // Keep in a readable band so the table still looks like a small appliance disk
        usedFrac = clamp(0.35 + (usage / est.quota) * 0.45, 0.28, 0.88)
        quotaHint = `browser-storage:${humanGiB(usage)}/${humanGiB(est.quota)}`
      }
    }
  } catch {
    // ignore
  }

  usedFrac = clamp(walk(usedFrac * 100, 1.5, 90_000) / 100, 0.28, 0.9)
  const used = rootBytes * usedFrac
  const avail = rootBytes - used
  const pct = Math.round(usedFrac * 100)

  return {
    diskRootSize: '2.1G',
    diskRootUsed: humanGiB(used),
    diskRootAvail: humanGiB(avail),
    diskRootPct: `${pct}%`,
    diskQuotaHint: quotaHint,
  }
}

/** Session-stable shell PID (derived from product constants + boot). */
export function sessionShellPid(): number {
  return SITE.shellPidBase
}

export function sampleShellCpu(): string {
  return fmt1(clamp(walk(1.2, 0.6, 6_000), 0.2, 4.5))
}

export function sampleMetricsParams(): Record<string, string> {
  const load = sampleLoadAvg()
  const mem = sampleMem()
  const procs = sampleProcessCount()
  const power = samplePowerLoad()
  const climate = sampleClimate()
  return {
    cpuPct: sampleCpuPct(),
    ...mem,
    ...load,
    tempC: sampleTempC(),
    fanRpm: sampleFanRpm(),
    ...procs,
    rttGw: sampleRtt(0.4, 0.12),
    rttCore: sampleRtt(0.4, 0.1),
    rttNode: sampleRtt(0.7, 0.15),
    rttContain: sampleRtt(1.1, 0.2),
    rttSra: sampleRtt(1.3, 0.2),
    rttSite: sampleRtt(12.4, 1.5),
    rttTunnel0: sampleRtt(12.4, 1.2),
    rttTunnel1: sampleRtt(18.1, 1.5),
    rttTunnel2: sampleRtt(22.0, 1.8),
    ...power,
    ...climate,
    shellPid: String(sessionShellPid()),
    shellCpu: sampleShellCpu(),
    logShown: '48',
    logHidden: '4',
  }
}

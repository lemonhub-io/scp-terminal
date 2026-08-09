import { formatUptime } from '../i18n/format'
import { identityParams } from '../site/identity'
import { estimateDiskParams, sampleMetricsParams } from '../utils/metrics'
import { formatUtcDateTime, getSessionBootDate } from '../utils/time'

/**
 * Collect runtime params for stream commands: identity, clocks, metrics, disk.
 */
export async function collectDynamicParams(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const disk = await estimateDiskParams()
  const metrics = sampleMetricsParams()
  return {
    ...identityParams(),
    ...metrics,
    ...disk,
    uptime: formatUptime(),
    bootTime: formatUtcDateTime(getSessionBootDate()),
    now: formatUtcDateTime(new Date()),
    ...extra,
  }
}

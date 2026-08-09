/**
 * Canonical Site-19 host identity — single source for prompt, uname, sysinfo, seed.
 * Fictional facility assets stay stable; only clocks/metrics jitter at runtime.
 */
export const SITE = {
  hostname: 'site19-admin-01',
  fqdn: 'site19-admin-01.ops.site19.local',
  siteCode: 'Site-19',
  domain: 'site19.local',
  kernel: '6.8.0-scp',
  product: 'SCP-Terminal',
  productVersion: '1.0.0',
  arch: 'x86_64',
  /** Stable pseudo PIDs for this browser session's "shell" */
  shellPidBase: 880,
} as const

export type SiteIdentity = typeof SITE

export function identityParams(): Record<string, string> {
  return {
    hostname: SITE.hostname,
    fqdn: SITE.fqdn,
    siteCode: SITE.siteCode,
    domain: SITE.domain,
    kernel: SITE.kernel,
    product: SITE.product,
    productVersion: SITE.productVersion,
    arch: SITE.arch,
  }
}

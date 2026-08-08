export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

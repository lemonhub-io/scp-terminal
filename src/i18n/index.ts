import { createI18n } from 'vue-i18n'
import type { AppLocale } from './types'
import { isAppLocale } from './types'
import en from './locales/en'
import zhCN from './locales/zh-CN'

export const LOCALE_STORAGE_KEY = 'scp-terminal-locale'

const messages = {
  en,
  'zh-CN': zhCN,
}

export type MessageSchema = typeof en

function detectLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isAppLocale(stored)) {
      return stored
    }
  } catch {
    // localStorage unavailable
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  if (nav.toLowerCase().startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages,
  missingWarn: false,
  fallbackWarn: false,
  warnHtmlMessage: false,
})

type ComposerLike = {
  t: (key: string, params?: Record<string, unknown>) => string
  tm: (key: string) => unknown
  locale: { value: string } | string
}

function composer(): ComposerLike {
  return i18n.global as unknown as ComposerLike
}

export function t(key: string, params?: Record<string, unknown>): string {
  return composer().t(key, params)
}

export function tm<T = unknown>(key: string): T {
  return composer().tm(key) as T
}

export function getLocale(): AppLocale {
  const locale = composer().locale
  const value = typeof locale === 'string' ? locale : locale.value
  return isAppLocale(value) ? value : 'en'
}

export function setLocale(locale: AppLocale): void {
  const current = composer().locale
  if (typeof current !== 'string') {
    current.value = locale
  }
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export function applyDocumentLang(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = getLocale()
  }
}

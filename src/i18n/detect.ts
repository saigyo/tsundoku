import { SUPPORTED_LOCALES, type Locale } from './messages'

function isLocale(v: string): v is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v)
}

/** Gespeicherte Wahl gewinnt; sonst erster Prefix-Treffer aus den
 *  Browsersprachen; sonst 'en'. Pur gehalten für Testbarkeit. */
export function detectLocale(stored: string | null, navigatorLangs: readonly string[]): Locale {
  if (stored !== null && isLocale(stored)) return stored
  for (const lang of navigatorLangs) {
    const prefix = lang.toLowerCase().split('-')[0]
    if (isLocale(prefix)) return prefix
  }
  return 'en'
}

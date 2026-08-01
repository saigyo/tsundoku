import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BUNDLES } from './bundles'
import { detectLocale } from './detect'
import type { Locale, Messages } from './messages'

const STORAGE_KEY = 'tsundoku.locale'

interface I18n {
  locale: Locale
  m: Messages
  /** Locale-gebundenes Zahlenformat; formatiert auch Dezimalzahlen (Rating). */
  fmtInt: (n: number) => string
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<I18n | null>(null)

function readStored(): string | null {
  // localStorage kann werfen (Safari Private Mode, abgeschaltete Cookies)
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    detectLocale(readStored(), navigator.languages ?? []),
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18n>(() => {
    const nf = new Intl.NumberFormat(locale)
    return {
      locale,
      m: BUNDLES[locale],
      fmtInt: (n) => nf.format(n),
      setLocale: (l) => {
        // Nur die explizite Wahl wird gespeichert; Auto-Detect bleibt flüchtig.
        try {
          localStorage.setItem(STORAGE_KEY, l)
        } catch {
          // Persistenz ist Komfort, keine Voraussetzung
        }
        setLocaleState(l)
      },
    }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useI18n outside LocaleProvider')
  return ctx
}

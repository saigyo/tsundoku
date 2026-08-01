import { describe, expect, it } from 'vitest'
import { de } from '../i18n/de'
import { langLabel } from './languages'

// ja-Bundle existiert erst ab Task 9; für den Locale-Wechsel reicht ein
// künstliches Messages-Objekt mit anderer locale.
const jaLike = { ...de, locale: 'ja' as const }

describe('langLabel', () => {
  it('zeigt Sprachen in der UI-Sprache an (Intl.DisplayNames)', () => {
    expect(langLabel('Japanese', de)).toBe('Japanisch')
    expect(langLabel('German', de)).toBe('Deutsch')
    expect(langLabel('German', jaLike)).toBe('ドイツ語')
    expect(langLabel('Greek (Ancient)', de)).toBe('Altgriechisch')
  })
  it('nutzt Message-Schlüssel für die Sentinel-Werte', () => {
    expect(langLabel('andere', de)).toBe(de.lang.other)
    expect(langLabel('unbekannt', de)).toBe(de.lang.unknown)
  })
  it('reicht unbekannte LibraryThing-Namen unverändert durch', () => {
    expect(langLabel('Klingon', de)).toBe('Klingon')
  })
})

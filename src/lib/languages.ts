/**
 * Deutsche Anzeigenamen; Schlüssel = Werte aus stats.languages / stats.originalLanguages.
 *
 * Abweichung vom Brief: Das Generat speichert Sprachen als englische Namen
 * (`German`, `English`, …), nicht als ISO-Codes. Verifiziert mit
 * `node -e "const l=require('./public/data/library.json'); console.log(l.stats.languages.slice(0,10))"` —
 * Top-Werte: German 3028, English 1670, Japanese 226, Chinese 100, Spanish 56,
 * French 49, Latin 29, Greek (Ancient) 19. `stats.originalLanguages` nutzt
 * dasselbe Format (z. B. English 1708, German 645, Japanese 630).
 */
import type { Locale, Messages } from '../i18n/messages'

/** LibraryThing-Sprachname -> ISO-639-Code; Anzeige übernimmt Intl.DisplayNames. */
export const LANG_ISO: Record<string, string> = {
  German: 'de',
  English: 'en',
  Japanese: 'ja',
  Chinese: 'zh',
  Spanish: 'es',
  French: 'fr',
  Latin: 'la',
  Russian: 'ru',
  Italian: 'it',
  Dutch: 'nl',
  Polish: 'pl',
  Portuguese: 'pt',
  Hungarian: 'hu',
  Ukrainian: 'uk',
  Turkish: 'tr',
  Czech: 'cs',
  Korean: 'ko',
  'Greek (Ancient)': 'grc',
}

export const OTHER_LANG = 'andere'
export const UNKNOWN_LANG = 'unbekannt'

const displayNames = new Map<Locale, Intl.DisplayNames>()

export function langLabel(code: string, m: Messages): string {
  if (code === OTHER_LANG) return m.lang.other
  if (code === UNKNOWN_LANG) return m.lang.unknown
  const iso = LANG_ISO[code]
  if (!iso) return code
  let dn = displayNames.get(m.locale)
  if (!dn) {
    dn = new Intl.DisplayNames([m.locale], { type: 'language' })
    displayNames.set(m.locale, dn)
  }
  const label = dn.of(iso)
  // DisplayNames gibt bei unbekanntem Code die Eingabe zurück — dann ist der
  // rohe LibraryThing-Name die bessere Anzeige.
  return label && label !== iso ? label : code
}

export const LANG_COLORS: Record<string, string> = {
  German: '#223a70', // kon
  English: '#9e3d3b', // enji
  Japanese: '#7a8b4a', // rikyū
  Chinese: '#b07736',
  Spanish: '#6f5980',
  French: '#2e5c6e',
  Latin: '#8d6449',
  'Greek (Ancient)': '#4a6e5a',
  [OTHER_LANG]: '#746a5e',
  [UNKNOWN_LANG]: '#b9b2a5',
}

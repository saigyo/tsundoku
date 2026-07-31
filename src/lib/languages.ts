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
export const LANG_LABELS: Record<string, string> = {
  German: 'Deutsch',
  English: 'Englisch',
  Japanese: 'Japanisch',
  Chinese: 'Chinesisch',
  Spanish: 'Spanisch',
  French: 'Französisch',
  Latin: 'Latein',
  'Greek (Ancient)': 'Altgriechisch',
}

export const OTHER_LANG = 'andere'
export const UNKNOWN_LANG = 'unbekannt'

export function langLabel(code: string): string {
  if (code === OTHER_LANG || code === UNKNOWN_LANG) return code
  return LANG_LABELS[code] ?? code
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

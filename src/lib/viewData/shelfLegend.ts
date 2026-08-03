import type { Messages } from '../../i18n/messages'
import { DDC_COLORS } from '../ddc'
import { langLabel, LANG_COLORS } from '../languages'
import type { Book, Filter } from '../types'

export type ColorMode = 'ddc' | 'language' | 'readStatus' | 'acquiredYear'

/** Farbe für Bücher ohne Wert in der aktiven Dimension (auch das Regal färbt damit). */
export const NEUTRAL = '#b9b2a5'

/** Filterdimension je Farbmodus — die Legende zählt ohne die Filter der
 *  eigenen Dimension (Ausschluss-Semantik, s. Spec) und togglet diese Art. */
export const LEGEND_KIND: Record<ColorMode, Filter['kind']> = {
  ddc: 'ddcTop',
  language: 'language',
  readStatus: 'readStatus',
  acquiredYear: 'acquiredYear',
}

export interface LegendEntry {
  label: string
  color: string
  count: number
  /** null = passiver Eintrag: fehlende Werte sind nicht filterbar */
  filter: Filter | null
}

/** Legendeneinträge je Farbmodus, absteigend nach Anzahl — vormals
 *  buildLegend in Shelf.tsx, hier pur und testbar, um den Filter je
 *  Eintrag ergänzt. Sprachen gruppieren nach languages[0] (so färbt das
 *  Regal); der Sprachfilter selbst matcht per includes — dokumentierte
 *  Unschärfe bei mehrsprachigen Büchern (Spec).
 *
 *  Zwei Populationen, analog zum Filter-Editor: `population` bestimmt,
 *  WELCHE Kategorien existieren (mit Anzahl 0 registriert), `counted`
 *  liefert nur die Zahlen. Damit bleiben durch fremde Filter leergezählte
 *  Kategorien sichtbar und klickbar, statt aus der Legende zu verschwinden
 *  (Spec). `counted` ist in der Praxis stets eine Teilmenge von
 *  `population`; der Zählschritt registriert unbekannte Kategorien
 *  trotzdem defensiv mit. */
export function shelfLegend(
  mode: ColorMode,
  population: Book[],
  counted: Book[],
  yearScale: (y: number) => string,
  m: Messages,
): LegendEntry[] {
  const dest = new Map<string, { color: string; count: number; filter: Filter | null }>()
  const register = (label: string, color: string, filter: Filter | null) => {
    if (!dest.has(label)) dest.set(label, { color, count: 0, filter })
    return dest.get(label)!
  }
  const classify = (b: Book): [string, string, Filter | null] => {
    switch (mode) {
      case 'ddc':
        return b.ddc
          ? [m.ddc.short[b.ddc.top], DDC_COLORS[b.ddc.top], { kind: 'ddcTop', value: b.ddc.top }]
          : [m.views.shelf.noInfo, NEUTRAL, null]
      case 'language': {
        const code = b.languages[0]
        return code
          ? [langLabel(code, m), LANG_COLORS[code] ?? NEUTRAL, { kind: 'language', value: code }]
          : [m.views.shelf.noInfo, NEUTRAL, null]
      }
      case 'readStatus':
        return b.hasRead
          ? [m.views.shelf.legendRead, 'var(--kon)', { kind: 'readStatus', value: 'read' }]
          : [m.views.shelf.legendUnread, 'var(--paper)', { kind: 'readStatus', value: 'unread' }]
      case 'acquiredYear': {
        if (b.acquiredYear === null) return [m.views.shelf.noAcqYear, NEUTRAL, null]
        // Dekaden-Swatch am Dekaden-Mittelpunkt aus dem tatsächlichen
        // Jahresverlauf, sonst wäre die Legende ohne Farbwert nutzlos.
        const decade = Math.floor(b.acquiredYear / 10) * 10
        return [
          m.views.shelf.decade(decade),
          yearScale(decade + 5),
          { kind: 'acquiredYear', from: decade, to: decade + 9 },
        ]
      }
    }
  }
  for (const b of population) {
    const [label, color, filter] = classify(b)
    register(label, color, filter)
  }
  for (const b of counted) {
    const [label, color, filter] = classify(b)
    register(label, color, filter).count += 1
  }
  return [...dest].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}

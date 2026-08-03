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
 *  Unschärfe bei mehrsprachigen Büchern (Spec). */
export function shelfLegend(
  mode: ColorMode,
  books: Book[],
  yearScale: (y: number) => string,
  m: Messages,
): LegendEntry[] {
  const dest = new Map<string, { color: string; count: number; filter: Filter | null }>()
  const add = (label: string, color: string, filter: Filter | null) => {
    const e = dest.get(label)
    if (e) e.count += 1
    else dest.set(label, { color, count: 1, filter })
  }
  for (const b of books) {
    switch (mode) {
      case 'ddc':
        if (b.ddc) add(m.ddc.short[b.ddc.top], DDC_COLORS[b.ddc.top], { kind: 'ddcTop', value: b.ddc.top })
        else add(m.views.shelf.noInfo, NEUTRAL, null)
        break
      case 'language': {
        const code = b.languages[0]
        if (code) add(langLabel(code, m), LANG_COLORS[code] ?? NEUTRAL, { kind: 'language', value: code })
        else add(m.views.shelf.noInfo, NEUTRAL, null)
        break
      }
      case 'readStatus':
        if (b.hasRead) add(m.views.shelf.legendRead, '#223a70', { kind: 'readStatus', value: 'read' })
        else add(m.views.shelf.legendUnread, '#f4efe6', { kind: 'readStatus', value: 'unread' })
        break
      case 'acquiredYear': {
        if (b.acquiredYear === null) {
          add(m.views.shelf.noAcqYear, NEUTRAL, null)
        } else {
          // Dekaden-Swatch am Dekaden-Mittelpunkt aus dem tatsächlichen
          // Jahresverlauf, sonst wäre die Legende ohne Farbwert nutzlos.
          const decade = Math.floor(b.acquiredYear / 10) * 10
          add(m.views.shelf.decade(decade), yearScale(decade + 5), {
            kind: 'acquiredYear',
            from: decade,
            to: decade + 9,
          })
        }
        break
      }
    }
  }
  return [...dest].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}

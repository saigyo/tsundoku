import { OTHER_LANG } from '../languages'
import type { Book } from '../types'

export interface PacePoint {
  book: Book
  pages: number
  days: number
  /** > 100 Tage: offen, ob gelesen oder nur nicht abgeschlossen — kein Tempo. */
  suspect: boolean
}

export interface PaceData {
  points: PacePoint[]
  withDays: number
  discardedNegative: number
  facets: { lang: string; points: PacePoint[] }[]
}

// Abweichung vom Brief: Sprachen im Generat sind englische Namen, keine
// ISO-Codes (`de`/`en`/`ja`) — siehe src/lib/languages.ts.
const FACET_LANGS = ['German', 'English', 'Japanese']

export function paceData(books: Book[]): PaceData {
  const withDaysAll = books.filter((b) => b.readDays !== null)
  const negative = withDaysAll.filter((b) => (b.readDays as number) < 0)
  const valid = withDaysAll.filter((b) => (b.readDays as number) >= 0)

  const points: PacePoint[] = valid
    .filter((b) => b.pages !== null)
    .map((b) => ({
      book: b,
      pages: b.pages as number,
      days: b.readDays as number,
      suspect: (b.readDays as number) > 100,
    }))

  const facetOf = (p: PacePoint) => {
    const l = p.book.languages[0]
    return l !== undefined && FACET_LANGS.includes(l) ? l : OTHER_LANG
  }
  const facetMap = new Map<string, PacePoint[]>()
  for (const p of points) {
    const key = facetOf(p)
    const arr = facetMap.get(key)
    if (arr) arr.push(p)
    else facetMap.set(key, [p])
  }
  const order = [...FACET_LANGS, OTHER_LANG]
  const facets = order
    .filter((l) => facetMap.has(l))
    .map((lang) => ({ lang, points: facetMap.get(lang) as PacePoint[] }))

  return { points, withDays: valid.length, discardedNegative: negative.length, facets }
}

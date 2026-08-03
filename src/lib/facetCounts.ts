import { filterBooks } from '../store/filters'
import type { Book, Filter, MediaType } from './types'

export interface FacetCounts {
  read: number
  unread: number
  media: Map<MediaType, number>
  collections: Map<string, number>
}

/** Zählungen für den Filter-Editor. Jede Dimension zählt gegen die
 *  Filtermenge OHNE die Filter der eigenen Dimension — sonst nullte ein
 *  aktiver Filter seine Geschwister aus („Medium: Buch" aktiv → E-Book
 *  zeigte 0, obwohl ein Klick die Menge per ODER erweitert). Jede Zahl
 *  beantwortet: „Wie viele Titel zeigt die App, wenn dieser Chip
 *  (zusätzlich) aktiv ist?" (Spec 2026-08-03, Abschnitt Zählungen.) */
export function facetCounts(books: Book[], filters: Filter[]): FacetCounts {
  const without = (kind: Filter['kind']) =>
    filterBooks(books, filters.filter((f) => f.kind !== kind))

  const statusBase = without('readStatus')
  const read = statusBase.filter((b) => b.hasRead).length

  const media = new Map<MediaType, number>()
  for (const b of without('mediaType')) media.set(b.mediaType, (media.get(b.mediaType) ?? 0) + 1)

  const collections = new Map<string, number>()
  for (const b of without('collection'))
    for (const c of b.collections) collections.set(c, (collections.get(c) ?? 0) + 1)

  return { read, unread: statusBase.length - read, media, collections }
}

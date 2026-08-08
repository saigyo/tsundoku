import { create } from 'zustand'
import type { Messages } from '../i18n/messages'
import { canonicalAward } from '../lib/awards'
import { flagLabel, hasFlag } from '../lib/flags'
import { genreLabel, genreMatches } from '../lib/genres'
import { langLabel } from '../lib/languages'
import { DEFAULT_VIEW, type Book, type Filter, type RangeKind, type ViewId } from '../lib/types'

function matches(b: Book, f: Filter): boolean {
  switch (f.kind) {
    case 'tag':
      return b.tagsNorm.includes(f.value)
    case 'language':
      return b.languages.includes(f.value)
    case 'originalLanguage':
      return b.originalLanguages.includes(f.value)
    case 'ddcTop':
      return b.ddc !== null && b.ddc.top === f.value
    case 'mediaType':
      return b.mediaType === f.value
    case 'collection':
      return b.collections.includes(f.value)
    case 'author':
      return b.authors.some((a) => a.name === f.value) || b.primaryAuthor === f.value
    case 'award':
      return b.awards.some((a) => canonicalAward(a) === f.value)
    case 'genre':
      return genreMatches(b, f.value)
    case 'flag':
      return hasFlag(b, f.value)
    case 'acquiredYear':
      return b.acquiredYearEffective !== null && b.acquiredYearEffective >= f.from && b.acquiredYearEffective <= f.to
    case 'readYear':
      return b.readYearEffective !== null && b.readYearEffective >= f.from && b.readYearEffective <= f.to
    case 'editionYear':
      return b.editionYear !== null && b.editionYear >= f.from && b.editionYear <= f.to
    case 'readStatus':
      return f.value === 'read' ? b.hasRead : !b.hasRead
  }
}

/** UND über Dimensionen (kind), ODER innerhalb einer Dimension.
 *  Ausnahme Tags, Genres und Qualitäts-Flags: UND auch innerhalb der
 *  Dimension — ein Buch trägt viele Tags, mehrere Genres bzw. mehrere
 *  Qualitäts-Flags gleichzeitig, mehrere gewählte sollen die Menge verengen,
 *  nicht erweitern. Bei einwertigen Dimensionen (Sprache, Medium …) wäre UND
 *  fast immer leer. */
export function filterBooks(books: Book[], filters: Filter[]): Book[] {
  if (filters.length === 0) return books
  const groups = new Map<Filter['kind'], Filter[]>()
  for (const f of filters) {
    const g = groups.get(f.kind)
    if (g) g.push(f)
    else groups.set(f.kind, [f])
  }
  const groupList = [...groups.entries()]
  return books.filter((b) =>
    groupList.every(([kind, g]) =>
      kind === 'tag' || kind === 'genre' || kind === 'flag'
        ? g.every((f) => matches(b, f))
        : g.some((f) => matches(b, f)),
    ),
  )
}

export function sameFilter(a: Filter, b: Filter): boolean {
  if (a.kind !== b.kind) return false
  if ('from' in a && 'from' in b) return a.from === b.from && a.to === b.to
  if ('value' in a && 'value' in b) return a.value === b.value
  return false
}

/** Stabiler, locale-unabhängiger Schlüssel für React-Listen — das übersetzte
 *  Label würde beim Sprachwechsel alle Einträge unnötig neu mounten. */
export function filterKey(f: Filter): string {
  return 'value' in f ? `${f.kind}:${f.value}` : `${f.kind}:${f.from}-${f.to}`
}

export function filterLabel(f: Filter, m: Messages): string {
  switch (f.kind) {
    case 'tag':
      return m.filter.tag(f.value)
    case 'language':
      return m.filter.language(langLabel(f.value, m))
    case 'originalLanguage':
      return m.filter.originalLanguage(langLabel(f.value, m))
    case 'ddcTop':
      return m.filter.ddcTop(m.ddc.short[f.value] ?? String(f.value))
    case 'mediaType':
      return m.filter.mediaType(m.media[f.value])
    case 'collection':
      return m.filter.collection(f.value)
    case 'author':
      return m.filter.author(f.value)
    case 'award':
      return m.filter.award(f.value)
    case 'genre':
      return m.filter.genre(genreLabel(f.value, m))
    case 'flag':
      return m.filter.flag(flagLabel(f.value, m))
    case 'acquiredYear':
      return m.filter.acquired(f.from, f.to)
    case 'readYear':
      return m.filter.read(f.from, f.to)
    case 'editionYear':
      return m.filter.edition(f.from, f.to)
    case 'readStatus':
      return f.value === 'read' ? m.filter.statusRead : m.filter.statusUnread
  }
}

interface FilterState {
  filters: Filter[]
  view: ViewId
  addFilter: (f: Filter) => void
  removeFilter: (f: Filter) => void
  toggleFilter: (f: Filter) => void
  setRange: (kind: RangeKind, from: number, to: number) => void
  clearFilters: () => void
  setView: (v: ViewId) => void
}

export const useFilterStore = create<FilterState>()((set) => ({
  filters: [],
  view: DEFAULT_VIEW,
  addFilter: (f) =>
    set((s) => (s.filters.some((g) => sameFilter(g, f)) ? s : { filters: [...s.filters, f] })),
  removeFilter: (f) => set((s) => ({ filters: s.filters.filter((g) => !sameFilter(g, f)) })),
  toggleFilter: (f) =>
    set((s) =>
      s.filters.some((g) => sameFilter(g, f))
        ? { filters: s.filters.filter((g) => !sameFilter(g, f)) }
        : { filters: [...s.filters, f] },
    ),
  setRange: (kind, from, to) =>
    set((s) => ({ filters: [...s.filters.filter((g) => g.kind !== kind), { kind, from, to } as Filter] })),
  clearFilters: () => set({ filters: [] }),
  setView: (v) => set({ view: v }),
}))

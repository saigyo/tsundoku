import { create } from 'zustand'
import { canonicalAward } from '../lib/awards'
import { DDC_SHORT } from '../lib/ddc'
import { langLabel } from '../lib/languages'
import { DEFAULT_VIEW, type Book, type Filter, type RangeKind, type ViewId } from '../lib/types'

const MEDIA_LABELS: Record<string, string> = {
  book: 'Buch',
  ebook: 'E-Book',
  film: 'Film',
  vinyl: 'Schallplatte',
}

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
    case 'acquiredYear':
      return b.acquiredYear !== null && b.acquiredYear >= f.from && b.acquiredYear <= f.to
    case 'readYear':
      return b.readYearEffective !== null && b.readYearEffective >= f.from && b.readYearEffective <= f.to
    case 'editionYear':
      return b.editionYear !== null && b.editionYear >= f.from && b.editionYear <= f.to
    case 'readStatus':
      return f.value === 'read' ? b.hasRead : !b.hasRead
  }
}

/** UND über Dimensionen (kind), ODER innerhalb einer Dimension. */
export function filterBooks(books: Book[], filters: Filter[]): Book[] {
  if (filters.length === 0) return books
  const groups = new Map<Filter['kind'], Filter[]>()
  for (const f of filters) {
    const g = groups.get(f.kind)
    if (g) g.push(f)
    else groups.set(f.kind, [f])
  }
  const groupList = [...groups.values()]
  return books.filter((b) => groupList.every((g) => g.some((f) => matches(b, f))))
}

export function sameFilter(a: Filter, b: Filter): boolean {
  if (a.kind !== b.kind) return false
  if ('from' in a && 'from' in b) return a.from === b.from && a.to === b.to
  if ('value' in a && 'value' in b) return a.value === b.value
  return false
}

export function filterLabel(f: Filter): string {
  switch (f.kind) {
    case 'tag':
      return `Tag: ${f.value}`
    case 'language':
      return `Sprache: ${langLabel(f.value)}`
    case 'originalLanguage':
      return `Original: ${langLabel(f.value)}`
    case 'ddcTop':
      return `Wissensgebiet: ${DDC_SHORT[f.value] ?? f.value}`
    case 'mediaType':
      return `Medium: ${MEDIA_LABELS[f.value]}`
    case 'collection':
      return `Sammlung: ${f.value}`
    case 'author':
      return `Autor·in: ${f.value}`
    case 'award':
      return `Liste: ${f.value}`
    case 'acquiredYear':
      return `Erworben: ${f.from}–${f.to}`
    case 'readYear':
      return `Gelesen: ${f.from}–${f.to}`
    case 'editionYear':
      return `Ausgabe: ${f.from}–${f.to}`
    case 'readStatus':
      return `Status: ${f.value === 'read' ? 'gelesen' : 'ungelesen'}`
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

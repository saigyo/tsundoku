import type { Book } from '../types'
import { SERIES_MARKER_TAGS, STATUS_TAGS, YEAR_TAG } from './tagNetwork'

export type TrendAxis = 'acquired' | 'read'

/** Jahr eines Buchs auf der gewählten Achse (Lektüre = readYearEffective). */
export function axisYear(b: Book, axis: TrendAxis): number | null {
  return axis === 'acquired' ? b.acquiredYear : b.readYearEffective
}

export interface TagRow {
  tag: string
  /** Titel mit diesem Tag in der Basis (Filtermenge mit Jahr auf der Achse). */
  total: number
  /** Titel je Jahr, indexparallel zu years. */
  counts: number[]
}

export interface TagTrendData {
  /** Lückenlos von min bis max — Heatmap-Spalten und Linien teilen die Achse. */
  years: number[]
  /** Basis-Titel je Jahr, indexparallel zu years. */
  totalsPerYear: number[]
  /** Alle geeigneten Tags: total absteigend, bei Gleichstand alphabetisch. */
  rows: TagRow[]
  /** Titel der Filtermenge mit Jahr auf der Achse. */
  usable: number
  excluded: { yearTags: number; status: number; seriesMarkers: number }
}

export function tagTrendRows(books: Book[], axis: TrendAxis): TagTrendData {
  const excludedSets = {
    yearTags: new Set<string>(),
    status: new Set<string>(),
    seriesMarkers: new Set<string>(),
  }
  const eligible = (tag: string): boolean => {
    if (YEAR_TAG.test(tag)) {
      excludedSets.yearTags.add(tag)
      return false
    }
    if (STATUS_TAGS.has(tag)) {
      excludedSets.status.add(tag)
      return false
    }
    if (SERIES_MARKER_TAGS.has(tag)) {
      excludedSets.seriesMarkers.add(tag)
      return false
    }
    return true
  }
  const usable = books.filter((b) => axisYear(b, axis) !== null)
  if (usable.length === 0) {
    return {
      years: [],
      totalsPerYear: [],
      rows: [],
      usable: 0,
      excluded: { yearTags: 0, status: 0, seriesMarkers: 0 },
    }
  }
  const yearVals = usable.map((b) => axisYear(b, axis) as number)
  const minYear = Math.min(...yearVals)
  const maxYear = Math.max(...yearVals)
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
  const totalsPerYear = new Array<number>(years.length).fill(0)
  const byTag = new Map<string, number[]>()
  for (const book of usable) {
    const i = (axisYear(book, axis) as number) - minYear
    totalsPerYear[i] += 1
    // Set: die Alias-Normalisierung kann denselben Tag mehrfach in tagsNorm
    // hinterlassen — ein Buch zählt je Tag und Jahr genau einmal.
    for (const t of new Set(book.tagsNorm)) {
      if (!eligible(t)) continue
      let arr = byTag.get(t)
      if (!arr) {
        arr = new Array<number>(years.length).fill(0)
        byTag.set(t, arr)
      }
      arr[i] += 1
    }
  }
  const rows: TagRow[] = [...byTag]
    .map(([tag, counts]) => ({ tag, total: counts.reduce((s, c) => s + c, 0), counts }))
    .sort((a, z) => z.total - a.total || a.tag.localeCompare(z.tag))
  return {
    years,
    totalsPerYear,
    rows,
    usable: usable.length,
    excluded: {
      yearTags: excludedSets.yearTags.size,
      status: excludedSets.status.size,
      seriesMarkers: excludedSets.seriesMarkers.size,
    },
  }
}

export interface RankedTag {
  tag: string
  /** Anteil im Abschnitt ÷ Anteil in der Basis (Spec: Maß). */
  lift: number
  inSlice: number
  total: number
}

/** Überrepräsentations-Rangliste für den Abschnitt [from, to] (inklusive). */
export function tagRanking(
  data: TagTrendData,
  from: number,
  to: number,
  opts: { minSupport?: number; limit?: number } = {},
): RankedTag[] {
  const minSupport = opts.minSupport ?? 3
  const limit = opts.limit ?? 15
  if (data.years.length === 0) return []
  const i0 = Math.max(0, from - data.years[0])
  const i1 = Math.min(data.years.length - 1, to - data.years[0])
  if (i1 < i0) return []
  const sliceTotal = data.totalsPerYear.slice(i0, i1 + 1).reduce((s, c) => s + c, 0)
  if (sliceTotal === 0) return []
  const ranked: RankedTag[] = []
  for (const row of data.rows) {
    const inSlice = row.counts.slice(i0, i1 + 1).reduce((s, c) => s + c, 0)
    if (inSlice < minSupport) continue
    const lift = (inSlice / sliceTotal) / (row.total / data.usable)
    if (lift <= 1) continue
    ranked.push({ tag: row.tag, lift, inSlice, total: row.total })
  }
  ranked.sort((a, z) => z.lift - a.lift || z.inSlice - a.inSlice || a.tag.localeCompare(z.tag))
  return ranked.slice(0, limit)
}

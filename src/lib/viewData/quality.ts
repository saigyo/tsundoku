import { FLAG_IDS, hasFlag, type FlagId } from '../flags'
import type { Book } from '../types'

/**
 * Datengrundlage der Datenqualitäts-View (Spec „Datenqualitäts-View"):
 * alles aus dem GEFILTERTEN Bestand — die globalen Import-Zähler (Block 4)
 * kommen direkt aus stats und laufen nicht durch dieses Modul.
 */

/** Feldinventar der Abdeckungs-Balken; Reihenfolge = Tiebreaker. */
export const QUALITY_FIELD_IDS = [
  'ddc',
  'pages',
  'dimsMeasured',
  'origLangRecorded',
  'acquiredDirect',
  'weight',
  'awards',
  'started',
  'price',
  'rating',
  'readDate',
  'series',
  'fromWhere',
] as const

export type QualityFieldId = (typeof QUALITY_FIELD_IDS)[number]

const FIELD_PREDICATES: Record<QualityFieldId, (b: Book) => boolean> = {
  ddc: (b) => b.ddc !== null,
  pages: (b) => b.pages !== null,
  dimsMeasured: (b) => !b.physicalEstimated && b.physical.heightMm !== null,
  origLangRecorded: (b) => b.originalLanguages.length > 0 && !b.originalLanguagesInferred,
  // bewusst acquiredYear (direkt), nicht effective — der Proxy hat seine eigene Flag-Zeile
  acquiredDirect: (b) => b.acquiredYear !== null,
  weight: (b) => b.physical.weightG !== null,
  awards: (b) => b.awards.length > 0,
  started: (b) => b.startedDate !== null,
  price: (b) => b.price !== null,
  rating: (b) => b.rating !== null,
  readDate: (b) => b.readDate !== null,
  series: (b) => b.series.length > 0,
  fromWhere: (b) => b.fromWhere !== null,
}

export interface QualityTiles {
  acquired: { direct: number; proxy: number; missing: number; total: number }
  readYear: { withYear: number; tagOnly: number; read: number }
  bulk: { n: number; total: number }
  dims: { measured: number; estimated: number; missing: number; total: number }
  rating: { n: number; total: number }
}

export interface CountRow<I extends string> {
  id: I
  n: number
}

export interface QualityData {
  tiles: QualityTiles
  /** absteigend nach n; Gleichstand: QUALITY_FIELD_IDS-Reihenfolge */
  coverage: CountRow<QualityFieldId>[]
  /** absteigend nach n; Gleichstand: FLAG_IDS-Reihenfolge */
  flags: CountRow<FlagId>[]
  total: number
}

export type TileZone = 'good' | 'mid' | 'bad'

/** Schwellwert-Zone einer Kachel (Spec, Block 1). pct in Prozentpunkten. */
export function tileZone(pct: number, inverted = false): TileZone {
  if (inverted) return pct <= 5 ? 'good' : pct <= 20 ? 'mid' : 'bad'
  return pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'bad'
}

export function qualityData(books: Book[]): QualityData {
  const total = books.length
  const read = books.filter((b) => b.hasRead)
  const measured = books.filter((b) => FIELD_PREDICATES.dimsMeasured(b)).length
  const estimated = books.filter((b) => b.physicalEstimated).length
  const direct = books.filter((b) => b.acquiredYearSource === 'dateacquired').length
  const proxy = books.filter((b) => b.acquiredYearSource === 'entrydate').length

  const tiles: QualityTiles = {
    acquired: { direct, proxy, missing: total - direct - proxy, total },
    readYear: {
      withYear: read.filter((b) => b.readYearEffective !== null).length,
      tagOnly: read.filter((b) => b.readYearSource === 'tag').length,
      read: read.length,
    },
    bulk: { n: books.filter((b) => b.bulkImport).length, total },
    dims: { measured, estimated, missing: total - measured - estimated, total },
    rating: { n: books.filter((b) => b.rating !== null).length, total },
  }

  const coverage = QUALITY_FIELD_IDS.map((id) => ({ id, n: books.filter(FIELD_PREDICATES[id]).length }))
    .sort((a, z) => z.n - a.n || QUALITY_FIELD_IDS.indexOf(a.id) - QUALITY_FIELD_IDS.indexOf(z.id))
  const flags = FLAG_IDS.map((id) => ({ id, n: books.filter((b) => hasFlag(b, id)).length }))
    .sort((a, z) => z.n - a.n || FLAG_IDS.indexOf(a.id) - FLAG_IDS.indexOf(z.id))

  return { tiles, coverage, flags, total }
}

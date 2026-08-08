export type MediaType = 'book' | 'ebook' | 'film' | 'vinyl'

export interface Physical {
  heightMm: number | null
  thicknessMm: number | null
  lengthMm: number | null
  weightG: number | null
}

/** Ein Autor/Beitragender. `role` ist Freitext aus LibraryThing (z. B. "Übersetzer", "Illustrator") oder null. */
export interface Author {
  name: string
  sort: string
  role: string | null
}

/** Achtung: inkompatible Änderungen an Book/Stats erfordern ein Erhöhen von
 *  SCHEMA_VERSION in libraryStore.ts (im Browser gespeicherte Bibliotheken). */
export interface Book {
  id: string
  /** LibraryThing-Werkschlüssel: librarything.com/work/{workCode}/book/{id} */
  workCode: string | null
  title: string
  originalTitle: string | null
  authors: Author[]
  primaryAuthor: string | null
  tags: string[]
  tagsNorm: string[]
  collections: string[]
  genres: string[]
  series: string[]
  awards: string[]
  ddc: { code: string; top: number; topLabel: string } | null
  languages: string[]
  originalLanguages: string[]
  /** true, wenn die Originalsprache aus der Ausgabesprache übernommen wurde (Regel 12). */
  originalLanguagesInferred: boolean
  editionYear: number | null
  formats: string[]
  mediaType: MediaType
  pages: number | null
  volumes: number | null
  physical: Physical
  /** true, wenn Höhe/Dicke aus der Seitenzahl geschätzt wurden (Regel 11). */
  physicalEstimated: boolean
  rating: number | null
  acquiredDate: string | null
  acquiredYear: number | null
  entryDate: string | null
  entryYear: number | null
  bulkImport: boolean
  /** Regel 13: dateacquired, sonst entrydate als Proxy (außer bulkImport). */
  acquiredDateEffective: string | null
  acquiredYearEffective: number | null
  acquiredYearSource: 'dateacquired' | 'entrydate' | null
  startedDate: string | null
  readDate: string | null
  readYear: number | null
  yearTags: number[]
  readYearEffective: number | null
  readYearSource: 'dateread' | 'tag' | null
  readDays: number | null
  hasRead: boolean
  /** Regel 14: angefangen, nicht abgeschlossen (startedDate ohne Abschluss oder Tag 'unfinished'; „Currently reading" ausgenommen). */
  abandoned: boolean
  fromWhere: string | null
  price: { amount: number; currency: string } | null
  comment: string | null
  isbn: string | null
}

/** Facetten: [Wert, Anzahl], absteigend nach Anzahl. */
export type Facet = [string | number, number][]

export interface ReadDaysStats {
  median: number | null
  p90: number | null
  max: number | null
}

export interface Stats {
  generatedAt: string
  source: string | null
  total: number
  byMediaType: Facet
  read: number
  withAcquiredDate: number
  withAcquiredEffective: number
  withReadDate: number
  withReadYearEffective: number
  withRating: number
  bulkImported: number
  abandoned: number
  /** Zähler der Bereinigungsregeln (docs/datenprofil.md, Regeln 9–12). */
  dimsSorted: number
  dimsDiscarded: number
  dimsEstimated: number
  origLangInferred: number
  entitiesDecoded: number
  pagesTotal: number
  readDays: ReadDaysStats
  languages: Facet
  originalLanguages: Facet
  collections: Facet
  genres: Facet
  ddcTop: Facet
  formats: Facet
  tagsNorm: Facet
  authors: Facet
  series: Facet
  awards: Facet
  fromWhere: Facet
  acquiredPerYear: Facet
  readPerYear: Facet
  readPerYearEffective: Facet
}

export interface Library {
  stats: Stats
  books: Book[]
}

export type Filter =
  | { kind: 'tag'; value: string }
  | { kind: 'language'; value: string }
  | { kind: 'originalLanguage'; value: string }
  | { kind: 'ddcTop'; value: number }
  | { kind: 'mediaType'; value: MediaType }
  | { kind: 'collection'; value: string }
  | { kind: 'author'; value: string }
  | { kind: 'award'; value: string }
  | { kind: 'genre'; value: string }
  | { kind: 'flag'; value: string }
  | { kind: 'acquiredYear'; from: number; to: number }
  | { kind: 'readYear'; from: number; to: number }
  | { kind: 'editionYear'; from: number; to: number }
  | { kind: 'readStatus'; value: 'read' | 'unread' }

export type RangeKind = 'acquiredYear' | 'readYear' | 'editionYear'

export const VIEW_IDS = [
  'timeline',
  'knowledge',
  'tagTrends',
  'network',
  'languages',
  'years',
  'shelf',
  'pace',
  'canon',
  'genres',
  'quality',
] as const
export type ViewId = (typeof VIEW_IDS)[number]

export const DEFAULT_VIEW: ViewId = 'shelf'

import type { Book } from './types'

let seq = 0

export function mkBook(over: Partial<Book> = {}): Book {
  seq += 1
  const base: Book = {
    id: String(seq),
    workCode: null,
    title: `Buch ${seq}`,
    originalTitle: null,
    authors: [],
    primaryAuthor: null,
    tags: [],
    tagsNorm: [],
    collections: [],
    genres: [],
    series: [],
    awards: [],
    ddc: null,
    languages: [],
    originalLanguages: [],
    originalLanguagesInferred: false,
    editionYear: null,
    formats: [],
    mediaType: 'book',
    pages: null,
    volumes: null,
    physical: { heightMm: null, thicknessMm: null, lengthMm: null, weightG: null },
    physicalEstimated: false,
    rating: null,
    acquiredDate: null,
    acquiredYear: null,
    entryDate: null,
    entryYear: null,
    bulkImport: false,
    acquiredDateEffective: null,
    acquiredYearEffective: null,
    acquiredYearSource: null,
    startedDate: null,
    readDate: null,
    readYear: null,
    yearTags: [],
    readYearEffective: null,
    readYearSource: null,
    readDays: null,
    hasRead: false,
    fromWhere: null,
    price: null,
    comment: null,
    isbn: null,
    ...over,
  }
  // Tests setzen meist nur acquiredDate/acquiredYear — wir spiegeln NUR den
  // dateacquired-Zweig von Regel 13. Der entrydate-Fallback wird nicht
  // simuliert: wer ihn braucht, setzt die effektiven Felder explizit.
  if (over.acquiredYearEffective === undefined && over.acquiredDateEffective === undefined && over.acquiredYearSource === undefined) {
    base.acquiredDateEffective = base.acquiredDate
    base.acquiredYearEffective = base.acquiredYear
    base.acquiredYearSource = base.acquiredYear !== null ? 'dateacquired' : null
  }
  return base
}

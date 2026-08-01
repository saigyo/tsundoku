import type { Book } from '../types'

export type ShelfSort = 'acquired' | 'author' | 'height' | 'ddc'

export interface ShelfOpts {
  sort: ShelfSort
  rowWidth: number
  /** Standard 0.55 px/mm → 20-cm-Buch ≈ 110 px hoch. */
  pxPerMm?: number
  minW?: number
  rowGap?: number
}

export interface PlacedBook {
  book: Book
  x: number
  y: number
  w: number
  h: number
}

export interface ShelfLayoutResult {
  placed: PlacedBook[]
  totalHeight: number
  unmeasured: Book[]
  nonBooks: number
}

const cmp: Record<ShelfSort, (a: Book, b: Book) => number> = {
  acquired: (a, b) =>
    (a.acquiredDate ?? String(a.acquiredYear ?? '9999')).localeCompare(
      b.acquiredDate ?? String(b.acquiredYear ?? '9999'),
    ) || a.title.localeCompare(b.title, 'de'),
  author: (a, b) =>
    (a.primaryAuthor ?? '￿').localeCompare(b.primaryAuthor ?? '￿', 'de') ||
    a.title.localeCompare(b.title, 'de'),
  height: (a, b) =>
    (b.physical.heightMm ?? 0) - (a.physical.heightMm ?? 0) || a.title.localeCompare(b.title, 'de'),
  ddc: (a, b) =>
    (a.ddc?.top ?? 99) - (b.ddc?.top ?? 99) ||
    (a.primaryAuthor ?? '￿').localeCompare(b.primaryAuthor ?? '￿', 'de'),
}

export function shelfLayout(books: Book[], opts: ShelfOpts): ShelfLayoutResult {
  const pxPerMm = opts.pxPerMm ?? 0.55
  const minW = opts.minW ?? 2
  const rowGap = opts.rowGap ?? 14

  const onlyBooks = books.filter((b) => b.mediaType === 'book')
  const nonBooks = books.length - onlyBooks.length
  const measured = onlyBooks.filter(
    (b) => b.physical.heightMm !== null && b.physical.thicknessMm !== null,
  )
  const unmeasured = onlyBooks.filter(
    (b) => b.physical.heightMm === null || b.physical.thicknessMm === null,
  )

  const sorted = [...measured].sort(cmp[opts.sort])

  // Erste Passe: in Reihen einteilen; zweite Passe: y so setzen, dass die
  // Unterkanten einer Reihe auf der Regalkante stehen.
  interface Row { items: { book: Book; w: number; h: number; x: number }[]; maxH: number }
  const rows: Row[] = []
  let cur: Row = { items: [], maxH: 0 }
  let cx = 0
  for (const b of sorted) {
    const w = Math.max(minW, (b.physical.thicknessMm as number) * pxPerMm)
    const h = (b.physical.heightMm as number) * pxPerMm
    if (cx + w > opts.rowWidth && cur.items.length > 0) {
      rows.push(cur)
      cur = { items: [], maxH: 0 }
      cx = 0
    }
    cur.items.push({ book: b, w, h, x: cx })
    cur.maxH = Math.max(cur.maxH, h)
    cx += w
  }
  if (cur.items.length > 0) rows.push(cur)

  const placed: PlacedBook[] = []
  let baseline = 0
  for (const row of rows) {
    baseline += row.maxH
    for (const it of row.items) {
      placed.push({ book: it.book, x: it.x, y: baseline - it.h, w: it.w, h: it.h })
    }
    baseline += rowGap
  }

  return { placed, totalHeight: baseline, unmeasured, nonBooks }
}

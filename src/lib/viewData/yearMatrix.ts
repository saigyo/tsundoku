import type { Book } from '../types'

export interface YearMatrixData {
  cells: { ed: number; acq: number; count: number }[]
  edExtent: [number, number] | null
  acqExtent: [number, number] | null
  edMarginal: Map<number, number>
  acqMarginal: Map<number, number>
  /** Ausgaben vor editionFloor — sichtbar auszuweisen, nicht zu verstecken. */
  underflow: number
  covered: number
  maxCount: number
}

export function yearMatrix(books: Book[], opts?: { editionFloor?: number }): YearMatrixData {
  const floor = opts?.editionFloor ?? 1900
  const both = books.filter((b) => b.editionYear !== null && b.acquiredYear !== null)
  const inRange = both.filter((b) => (b.editionYear as number) >= floor)
  const underflow = both.length - inRange.length

  const counts = new Map<string, number>()
  const edMarginal = new Map<number, number>()
  const acqMarginal = new Map<number, number>()
  for (const b of inRange) {
    const ed = b.editionYear as number
    const acq = b.acquiredYear as number
    counts.set(`${ed}:${acq}`, (counts.get(`${ed}:${acq}`) ?? 0) + 1)
    edMarginal.set(ed, (edMarginal.get(ed) ?? 0) + 1)
    acqMarginal.set(acq, (acqMarginal.get(acq) ?? 0) + 1)
  }
  const cells = [...counts].map(([key, count]) => {
    const [ed, acq] = key.split(':').map(Number)
    return { ed, acq, count }
  })
  const eds = [...edMarginal.keys()]
  const acqs = [...acqMarginal.keys()]

  return {
    cells,
    edExtent: eds.length ? [Math.min(...eds), Math.max(...eds)] : null,
    acqExtent: acqs.length ? [Math.min(...acqs), Math.max(...acqs)] : null,
    edMarginal,
    acqMarginal,
    underflow,
    covered: both.length,
    maxCount: cells.reduce((m, c) => Math.max(m, c.count), 0),
  }
}

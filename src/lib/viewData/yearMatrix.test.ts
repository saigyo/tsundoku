import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { yearMatrix } from './yearMatrix'

const books = [
  mkBook({ editionYear: 1998, acquiredYear: 2004 }),
  mkBook({ editionYear: 1998, acquiredYear: 2004 }),
  mkBook({ editionYear: 2004, acquiredYear: 2004 }),
  mkBook({ editionYear: 1850, acquiredYear: 2004 }), // unter editionFloor
  mkBook({ editionYear: 2004, acquiredYear: null }),  // ohne Erwerbsjahr → nicht in der Matrix
]

describe('yearMatrix', () => {
  const d = yearMatrix(books, { editionFloor: 1900 })

  it('zählt Zellen (Ausgabejahr × Erwerbsjahr)', () => {
    expect(d.cells).toContainEqual({ ed: 1998, acq: 2004, count: 2 })
    expect(d.cells).toContainEqual({ ed: 2004, acq: 2004, count: 1 })
    expect(d.maxCount).toBe(2)
  })
  it('Ausgaben vor editionFloor landen gezählt im Underflow, nicht in der Matrix', () => {
    expect(d.underflow).toBe(1)
    expect(d.cells.find((c) => c.ed === 1850)).toBeUndefined()
  })
  it('Extents und Randverteilungen', () => {
    expect(d.edExtent).toEqual([1998, 2004])
    expect(d.acqExtent).toEqual([2004, 2004])
    expect(d.edMarginal.get(1998)).toBe(2)
    expect(d.acqMarginal.get(2004)).toBe(3)
  })
  it('covered = beide Jahre bekannt (Underflow zählt als covered)', () => {
    expect(d.covered).toBe(4)
  })
})

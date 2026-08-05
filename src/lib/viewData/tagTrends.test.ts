import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { tagRanking, tagTrendRows } from './tagTrends'

/** Buch mit Erwerbsjahr, Tags und optionalem effektivem Lesejahr. */
const b = (year: number | null, tags: string[], read: number | null = null) =>
  mkBook({ acquiredYear: year, readYearEffective: read, tagsNorm: tags })

describe('tagTrendRows', () => {
  it('schließt Jahres-, Status- und Reihen-Tags aus und beziffert sie', () => {
    const data = tagTrendRows(
      [b(2000, ['Japan', '1998', 'gelesen', 'RUB']), b(2001, ['Japan', '2004'])],
      'acquired',
    )
    expect(data.rows.map((r) => r.tag)).toEqual(['Japan'])
    expect(data.excluded).toEqual({ yearTags: 2, status: 1, seriesMarkers: 1 })
  })

  it('sortiert nach Gesamtzahl absteigend, bei Gleichstand alphabetisch', () => {
    const data = tagTrendRows(
      [b(2000, ['b-tag', 'a-tag', 'Japan']), b(2001, ['Japan'])],
      'acquired',
    )
    expect(data.rows.map((r) => r.tag)).toEqual(['Japan', 'a-tag', 'b-tag'])
  })

  it('richtet counts an einer lückenlosen Jahresachse aus', () => {
    const data = tagTrendRows([b(2000, ['Japan']), b(2003, ['Japan'])], 'acquired')
    expect(data.years).toEqual([2000, 2001, 2002, 2003])
    expect(data.totalsPerYear).toEqual([1, 0, 0, 1])
    expect(data.rows[0].counts).toEqual([1, 0, 0, 1])
  })

  it('zählt einen doppelt normalisierten Tag je Buch nur einmal', () => {
    const data = tagTrendRows([b(2000, ['Japan', 'Japan'])], 'acquired')
    expect(data.rows[0].total).toBe(1)
  })

  it('nutzt auf der Lektüre-Achse readYearEffective', () => {
    const data = tagTrendRows([b(2000, ['Japan'], 1995), b(2001, ['Japan'], null)], 'read')
    expect(data.usable).toBe(1)
    expect(data.years).toEqual([1995])
  })

  it('liefert bei leerer Achse leere Strukturen', () => {
    const data = tagTrendRows([b(null, ['Japan'])], 'acquired')
    expect(data.years).toEqual([])
    expect(data.rows).toEqual([])
    expect(data.usable).toBe(0)
  })
})

describe('tagRanking', () => {
  // 10 Bücher: 2000 → 3× {phase, klein} + 3× {Japan}; 2001 → 4× {Japan}.
  // Summen: phase 3, klein 3, Japan 7; usable 10.
  const books = [
    ...Array.from({ length: 3 }, () => b(2000, ['phase', 'klein'])),
    ...Array.from({ length: 3 }, () => b(2000, ['Japan'])),
    ...Array.from({ length: 4 }, () => b(2001, ['Japan'])),
  ]
  const data = tagTrendRows(books, 'acquired')

  it('berechnet den Lift als Anteils-Quotient', () => {
    const r = tagRanking(data, 2001, 2001)
    // Japan: (4/4) / (7/10) = 10/7 ≈ 1,43; phase/klein haben 0 im Abschnitt
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ tag: 'Japan', inSlice: 4, total: 7 })
    expect(r[0].lift).toBeCloseTo(10 / 7)
  })

  it('verwirft Tags unter dem Mindest-Support', () => {
    expect(tagRanking(data, 2001, 2001, { minSupport: 5 })).toEqual([])
  })

  it('verwirft lift ≤ 1, bricht Gleichstände alphabetisch und respektiert das Limit', () => {
    // 2000: phase/klein je (3/6)/(3/10) = 5/3; Japan (3/6)/(7/10) < 1 → raus
    expect(tagRanking(data, 2000, 2000).map((x) => x.tag)).toEqual(['klein', 'phase'])
    expect(tagRanking(data, 2000, 2000, { limit: 1 }).map((x) => x.tag)).toEqual(['klein'])
  })

  it('liefert außerhalb der Achse eine leere Liste', () => {
    expect(tagRanking(data, 1990, 1995)).toEqual([])
  })
})

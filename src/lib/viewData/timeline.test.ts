import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { timelineData } from './timeline'

const books = [
  mkBook({ acquiredYear: 2010 }),                                                            // nie gelesen
  mkBook({ acquiredYear: 2010, readYearEffective: 2012, readYearSource: 'dateread', hasRead: true }),
  mkBook({ acquiredYear: 2011, readYearEffective: 2011, readYearSource: 'tag', hasRead: true }),
  mkBook({ readYearEffective: 2012, readYearSource: 'dateread', hasRead: true }),            // ohne Erwerbsjahr
]

describe('timelineData', () => {
  const d = timelineData(books)

  it('durchgehende Jahresachse über beide Reihen', () => {
    expect(d.points.map((p) => p.year)).toEqual([2010, 2011, 2012])
  })
  it('zählt Erwerb und Lektüre nach Herkunft getrennt', () => {
    expect(d.points[0]).toEqual({ year: 2010, acquired: 2, readDated: 0, readTagged: 0 })
    expect(d.points[1]).toEqual({ year: 2011, acquired: 1, readDated: 0, readTagged: 1 })
    expect(d.points[2]).toEqual({ year: 2012, acquired: 0, readDated: 2, readTagged: 0 })
  })
  it('ungelesener Bestand: erworben ≤ Jahr und (nie gelesen oder später gelesen)', () => {
    // 2010: 2 erworben, eines davon wird erst 2012 gelesen, eines nie → 2 ungelesen
    // 2011: +1 erworben, aber im selben Jahr gelesen → weiterhin 2
    // 2012: das 2012er-Lesen betrifft ein 2010er-Buch → 1
    expect(d.unread).toEqual([
      { year: 2010, count: 2 },
      { year: 2011, count: 2 },
      { year: 2012, count: 1 },
    ])
  })
  it('Jahr der größten Schere (Erwerb minus Lektüre)', () => {
    expect(d.maxGapYear).toBe(2010)
  })
  it('Abdeckung', () => {
    expect(d.acquiredKnown).toBe(3)
    expect(d.readKnown).toBe(3)
    expect(d.readTaggedOnly).toBe(1)
  })
  it('leere Eingabe', () => {
    expect(timelineData([]).points).toEqual([])
  })
  it('zählt Proxy-Bücher (nur acquiredYearEffective gesetzt) im Erwerbsbalken', () => {
    const proxy = mkBook({
      acquiredYearEffective: 2010,
      acquiredDateEffective: '2010-04-01',
      acquiredYearSource: 'entrydate',
    })
    const data = timelineData([proxy])
    expect(data.acquiredKnown).toBe(1)
    expect(data.points.find((p) => p.year === 2010)?.acquired).toBe(1)
  })
})

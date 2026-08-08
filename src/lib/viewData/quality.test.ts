import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { qualityData, tileZone } from './quality'

describe('tileZone (Schwellwerte der Kacheln)', () => {
  it('Abdeckung: >=80 good, 50-79 mid, <50 bad', () => {
    expect(tileZone(80)).toBe('good')
    expect(tileZone(79)).toBe('mid')
    expect(tileZone(50)).toBe('mid')
    expect(tileZone(49)).toBe('bad')
  })
  it('invertiert (Massenimport): <=5 good, 5-20 mid, >20 bad', () => {
    expect(tileZone(5, true)).toBe('good')
    expect(tileZone(6, true)).toBe('mid')
    expect(tileZone(20, true)).toBe('mid')
    expect(tileZone(21, true)).toBe('bad')
  })
})

describe('qualityData', () => {
  it('Erwerbssignal-Kachel: direkt / Proxy / fehlend', () => {
    const books = [
      mkBook({ acquiredYear: 2010 }), // Fixture spiegelt -> source 'dateacquired'
      mkBook({ acquiredYearEffective: 2012, acquiredDateEffective: '2012-01-01', acquiredYearSource: 'entrydate' }),
      mkBook({}),
    ]
    expect(qualityData(books).tiles.acquired).toEqual({ direct: 1, proxy: 1, missing: 1, total: 3 })
  })
  it('Lesejahr-Kachel: Nenner sind die gelesenen', () => {
    const books = [
      mkBook({ hasRead: true, readYearEffective: 2001, readYearSource: 'dateread' }),
      mkBook({ hasRead: true, readYearEffective: 2002, readYearSource: 'tag' }),
      mkBook({ hasRead: true }), // gelesen ohne Jahr
      mkBook({}),                // ungelesen zählt nicht in den Nenner
    ]
    expect(qualityData(books).tiles.readYear).toEqual({ withYear: 2, tagOnly: 1, read: 3 })
  })
  it('Maße-Kachel: vermessen / geschätzt / ohne', () => {
    const books = [
      mkBook({ physical: { heightMm: 200, thicknessMm: 20, lengthMm: 130, weightG: null } }),
      mkBook({ physical: { heightMm: 200, thicknessMm: 20, lengthMm: null, weightG: null }, physicalEstimated: true }),
      mkBook({}),
    ]
    expect(qualityData(books).tiles.dims).toEqual({ measured: 1, estimated: 1, missing: 1, total: 3 })
  })
  it('Feldabdeckung absteigend sortiert, Flag-Zeilen mit FLAG_IDS-Tiebreaker', () => {
    const books = [
      mkBook({ ddc: { code: '100', top: 1, topLabel: 'Philosophie & Psychologie' }, pages: 200 }),
      mkBook({ pages: 100 }),
    ]
    const { coverage, flags } = qualityData(books)
    expect(coverage[0]).toEqual({ id: 'pages', n: 2 })
    expect(coverage[1]).toEqual({ id: 'ddc', n: 1 })
    // alle n gleich (0): Reihenfolge = FLAG_IDS
    expect(flags.map((f) => f.id)).toEqual([
      'bulkImport', 'physicalEstimated', 'origLangInferred', 'readYearTag', 'acquiredEntry', 'abandoned',
    ])
  })
})

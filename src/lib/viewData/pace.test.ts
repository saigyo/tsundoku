import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { paceData } from './pace'

// Sprachen im Generat sind englische Namen, keine ISO-Codes (siehe src/lib/languages.ts).
const books = [
  mkBook({ readDays: 4, pages: 320, languages: ['German'] }),
  mkBook({ readDays: 150, pages: 900, languages: ['Japanese'] }), // > 100 Tage → suspekt
  mkBook({ readDays: -3, pages: 200, languages: ['German'] }), // Tippfehler → verwerfen und zählen
  mkBook({ readDays: 10, pages: null, languages: ['German'] }), // ohne Seiten → kein Punkt, zählt in withDays
  mkBook({ readDays: 2, pages: 150, languages: ['Swedish'] }), // seltene Sprache → Facette 'andere'
  mkBook({ pages: 300 }), // ohne readDays
]

describe('paceData', () => {
  const d = paceData(books)

  it('Punkte brauchen readDays ≥ 0 und Seitenzahl', () => {
    expect(d.points).toHaveLength(3)
  })
  it('negative Lesedauern werden verworfen und gezählt', () => {
    expect(d.discardedNegative).toBe(1)
  })
  it('withDays zählt alle mit gültiger Lesedauer (auch ohne Seiten)', () => {
    expect(d.withDays).toBe(4)
  })
  it('über 100 Tage gilt als „offen", nicht als Tempo', () => {
    expect(d.points.find((p) => p.days === 150)?.suspect).toBe(true)
    expect(d.points.find((p) => p.days === 4)?.suspect).toBe(false)
  })
  it('Facetten nach Erstsprache, seltene als andere', () => {
    const langs = d.facets.map((f) => f.lang)
    expect(langs).toContain('German')
    expect(langs).toContain('Japanese')
    expect(d.facets.find((f) => f.lang === 'andere')?.points).toHaveLength(1)
  })
})

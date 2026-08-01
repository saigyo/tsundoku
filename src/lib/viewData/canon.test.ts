import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { canonRows } from './canon'

// Test nutzt eine eigene Mini-Synonymik über die echte Tabelle hinweg:
// wir testen mit Listen, die NICHT in AWARD_SYNONYMS stehen, plus einem Paar daraus.
const books = [
  mkBook({ awards: ['Liste A'], hasRead: true }),
  mkBook({ awards: ['Liste A', 'Liste B'] }),
  mkBook({ awards: ['Liste A', 'Liste A'] }), // Duplikat im selben Buch zählt einfach
  mkBook({ awards: ['Liste B'], hasRead: true }),
  mkBook({ awards: [] }),
]

describe('canonRows', () => {
  const d = canonRows(books, 20)

  it('zählt besessen und gelesen je Liste', () => {
    expect(d.rows).toContainEqual({ list: 'Liste A', owned: 3, read: 1 })
    expect(d.rows).toContainEqual({ list: 'Liste B', owned: 2, read: 1 })
  })
  it('sortiert absteigend nach Besitz und begrenzt auf topN', () => {
    expect(d.rows[0].list).toBe('Liste A')
    expect(canonRows(books, 1).rows).toHaveLength(1)
  })
  it('withAwards = Bücher mit mindestens einer Liste', () => {
    expect(d.withAwards).toBe(4)
  })
})

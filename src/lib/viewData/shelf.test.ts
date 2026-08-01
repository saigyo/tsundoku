import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { shelfLayout } from './shelf'

const phys = (heightMm: number, thicknessMm: number) => ({
  heightMm, thicknessMm, lengthMm: null, weightG: null,
})
const books = [
  mkBook({ physical: phys(200, 20), acquiredYear: 2001, primaryAuthor: 'B', title: 'Beta' }),
  mkBook({ physical: phys(180, 30), acquiredYear: 2000, primaryAuthor: 'A', title: 'Alpha' }),
  mkBook({ physical: phys(220, 1), acquiredYear: 2002, primaryAuthor: 'C', title: 'Gamma' }), // sehr dünn
  mkBook({ title: 'Ohne Maße' }),                                    // heightMm null → unmeasured
  mkBook({ mediaType: 'vinyl', physical: phys(310, 5) }),            // kein Buch → nonBooks
]

describe('shelfLayout', () => {
  it('nur Bücher mit Maßen werden platziert, Rest getrennt ausgewiesen', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed).toHaveLength(3)
    expect(r.unmeasured.map((b) => b.title)).toEqual(['Ohne Maße'])
    expect(r.nonBooks).toBe(1)
  })
  it('Maßstab: Breite = Dicke, Höhe = Buchhöhe, Mindestbreite greift', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1, minW: 2 })
    const gamma = r.placed.find((p) => p.book.title === 'Gamma')!
    expect(gamma.w).toBe(2)      // 1 mm → min 2 px
    expect(gamma.h).toBe(220)
    const alpha = r.placed.find((p) => p.book.title === 'Alpha')!
    expect(alpha.w).toBe(30)
  })
  it('Sortierung acquired ordnet nach Erwerb', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed.map((p) => p.book.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })
  it('Sortierung height ordnet absteigend nach Höhe', () => {
    const r = shelfLayout(books, { sort: 'height', rowWidth: 1000, pxPerMm: 1 })
    expect(r.placed.map((p) => p.book.title)).toEqual(['Gamma', 'Beta', 'Alpha'])
  })
  it('Reihenumbruch: Bücher stehen auf der Regalkante (gleiche Unterkante je Reihe)', () => {
    const r = shelfLayout(books, { sort: 'acquired', rowWidth: 40, pxPerMm: 1 })
    // Reihe 1: Alpha (30) + Beta (20) passt nicht → Beta bricht um
    const alpha = r.placed.find((p) => p.book.title === 'Alpha')!
    const beta = r.placed.find((p) => p.book.title === 'Beta')!
    expect(alpha.x).toBe(0)
    expect(beta.x).toBe(0)
    expect(beta.y).toBeGreaterThan(alpha.y)
    // Unterkante = y + h ist innerhalb einer Reihe konstant
    const rows = new Map<number, number>()
    for (const p of r.placed) rows.set(p.y + p.h, (rows.get(p.y + p.h) ?? 0) + 1)
    expect([...rows.values()].reduce((a, b) => a + b, 0)).toBe(3)
  })
})

import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { tagGraph } from './tagNetwork'

const books = [
  mkBook({ tagsNorm: ['Japan', 'Roman', '1998', 'gelesen'] }),
  mkBook({ tagsNorm: ['Japan', 'Roman', 'RUB'] }),
  mkBook({ tagsNorm: ['Japan', 'Philosophie'] }),
  mkBook({ tagsNorm: ['Philosophie'] }),
]

describe('tagGraph', () => {
  const g = tagGraph(books, { minCount: 2 })

  it('schließt Jahres-Tags, Statusmarker und Reihenkürzel aus und zählt sie', () => {
    expect(g.excluded).toEqual({ yearTags: 1, status: 1, seriesMarkers: 1 })
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['Japan', 'Philosophie', 'Roman'])
    expect(g.totalTags).toBe(3)
  })
  it('Knotengröße = Titelanzahl', () => {
    expect(g.nodes.find((n) => n.id === 'Japan')?.count).toBe(3)
  })
  it('Kanten mit gemeinsamer Anzahl und Jaccard', () => {
    const jr = g.links.find((l) => l.source === 'Japan' && l.target === 'Roman')
    expect(jr?.shared).toBe(2)
    // |Japan ∪ Roman| = 3 + 2 − 2 = 3 → Jaccard 2/3
    expect(jr?.jaccard).toBeCloseTo(2 / 3)
  })
  it('minCount filtert Knoten und ihre Kanten', () => {
    const g3 = tagGraph(books, { minCount: 3 })
    expect(g3.nodes.map((n) => n.id)).toEqual(['Japan'])
    expect(g3.links).toEqual([])
  })
  it('maxLinksPerNode begrenzt auf die stärksten Kanten je Knoten', () => {
    const g1 = tagGraph(books, { minCount: 2, maxLinksPerNode: 1 })
    for (const n of g1.nodes) {
      const deg = g1.links.filter((l) => l.source === n.id || l.target === n.id).length
      expect(deg).toBeLessThanOrEqual(2) // eigene Top-1 plus als Top-1 eines anderen
    }
  })
})

describe('tagGraph mit Leerzeichen im Tag-Namen', () => {
  // Tags wie „japanische Literatur" enthalten Leerzeichen; der Pair-Key darf
  // beim Aufbau/Split nicht auf ' ' trennen, sonst werden source/target verstümmelt.
  const spacedBooks = [
    mkBook({ tagsNorm: ['Japan', 'japanische Literatur'] }),
    mkBook({ tagsNorm: ['Japan', 'japanische Literatur'] }),
  ]

  it('erhält den vollständigen Tag-Namen in source/target trotz Leerzeichen', () => {
    const g = tagGraph(spacedBooks, { minCount: 2 })
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['Japan', 'japanische Literatur'])
    expect(g.links).toHaveLength(1)
    const [l] = g.links
    expect(new Set([l.source, l.target])).toEqual(new Set(['Japan', 'japanische Literatur']))
    expect(l.shared).toBe(2)
    expect(l.jaccard).toBeCloseTo(1)
  })
})

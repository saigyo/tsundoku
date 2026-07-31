import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { languageFlows } from './languageFlows'

const books = [
  ...Array.from({ length: 12 }, () => mkBook({ originalLanguages: ['Japanese'], languages: ['German'] })),
  ...Array.from({ length: 11 }, () => mkBook({ originalLanguages: ['Japanese'], languages: ['Japanese'] })),
  ...Array.from({ length: 10 }, () => mkBook({ originalLanguages: [], languages: ['German'] })),
  ...Array.from({ length: 3 }, () => mkBook({ originalLanguages: ['Swedish'], languages: ['German'] })), // < minCount → 'andere'
  mkBook({ originalLanguages: ['Japanese'], languages: [] }), // ohne Ausgabesprache → nicht im Fluss
]

describe('languageFlows', () => {
  const d = languageFlows(books, { minCount: 10 })

  it('Hauptströme mit Werten', () => {
    expect(d.links).toContainEqual({ source: 'o:Japanese', target: 'e:German', value: 12 })
    expect(d.links).toContainEqual({ source: 'o:Japanese', target: 'e:Japanese', value: 11 })
  })
  it('fehlende Originalsprache ist ein eigener Strom „unbekannt", nicht „identisch"', () => {
    expect(d.links).toContainEqual({ source: 'o:unbekannt', target: 'e:German', value: 10 })
    expect(d.unknownOrig).toBe(10) // nur Bücher im Fluss (mit Ausgabesprache) zählen
  })
  it('seltene Sprachen (< minCount) werden zu „andere" gebündelt', () => {
    expect(d.links).toContainEqual({ source: 'o:andere', target: 'e:German', value: 3 })
    expect(d.nodes.find((n) => n.id === 'o:Swedish')).toBeUndefined()
  })
  it('Knoten tragen Seitensummen', () => {
    expect(d.nodes.find((n) => n.id === 'e:German')?.total).toBe(25)
  })
  it('Bücher ohne Ausgabesprache fallen aus dem Fluss und aus covered', () => {
    expect(d.covered).toBe(36)
  })
})

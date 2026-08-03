import { describe, expect, it } from 'vitest'
import { facetCounts } from './facetCounts'
import { mkBook } from './fixtures'

const books = [
  mkBook({ hasRead: true, mediaType: 'book', collections: ['A', 'B'] }),
  mkBook({ hasRead: false, mediaType: 'book', collections: ['A'] }),
  mkBook({ hasRead: true, mediaType: 'ebook', collections: [] }),
  mkBook({ hasRead: false, mediaType: 'film', collections: ['B'] }),
]

describe('facetCounts', () => {
  it('zählt ohne Filter die Gesamtmengen', () => {
    const c = facetCounts(books, [])
    expect(c.read).toBe(2)
    expect(c.unread).toBe(2)
    expect(c.media.get('book')).toBe(2)
    expect(c.media.get('ebook')).toBe(1)
    expect(c.media.get('film')).toBe(1)
    expect(c.media.get('vinyl')).toBeUndefined()
    expect(c.collections.get('A')).toBe(2)
    expect(c.collections.get('B')).toBe(2)
  })

  it('ignoriert Filter der eigenen Dimension (Status), wendet ihn auf fremde an', () => {
    const c = facetCounts(books, [{ kind: 'readStatus', value: 'read' }])
    // Status-Zahlen: eigener readStatus-Filter zählt nicht mit
    expect(c.read).toBe(2)
    expect(c.unread).toBe(2)
    // Medium-Zahlen: readStatus wirkt (nur Gelesene)
    expect(c.media.get('book')).toBe(1)
    expect(c.media.get('ebook')).toBe(1)
    expect(c.media.get('film')).toBeUndefined()
    // Sammlungs-Zahlen: readStatus wirkt
    expect(c.collections.get('A')).toBe(1)
    expect(c.collections.get('B')).toBe(1)
  })

  it('kombiniert: eigene Dimension raus, alle fremden bleiben', () => {
    const c = facetCounts(books, [
      { kind: 'mediaType', value: 'book' },
      { kind: 'readStatus', value: 'unread' },
    ])
    // Medium zählt ohne mediaType-Filter, aber nur Ungelesene
    expect(c.media.get('book')).toBe(1)
    expect(c.media.get('film')).toBe(1)
    expect(c.media.get('ebook')).toBeUndefined()
    // Status zählt ohne readStatus-Filter, aber nur Medium book
    expect(c.read).toBe(1)
    expect(c.unread).toBe(1)
  })

  it('zählt ein Buch je Sammlung genau einmal (Mehrfach-Zugehörigkeit)', () => {
    const c = facetCounts(books, [{ kind: 'collection', value: 'A' }])
    // eigener collection-Filter ausgeschlossen -> volle Sammlungszahlen
    expect(c.collections.get('A')).toBe(2)
    expect(c.collections.get('B')).toBe(2)
    // fremde Dimensionen: collection-Filter wirkt (A = Bücher 1+2)
    expect(c.read).toBe(1)
    expect(c.unread).toBe(1)
    expect(c.media.get('book')).toBe(2)
  })
})

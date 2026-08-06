import { describe, expect, it } from 'vitest'
import { mkBook } from './fixtures'
import { displayGenres, genreMatches, GENRE_FICTION, GENRE_NONFICTION, NO_GENRE } from './genres'

describe('genreMatches', () => {
  it('Achsenwert trifft Dach, General und beide', () => {
    expect(genreMatches(mkBook({ genres: ['Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['General Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['Fiction', 'General Fiction'] }), GENRE_FICTION)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['General Nonfiction'] }), GENRE_NONFICTION)).toBe(true)
  })
  it('Achsenwert trifft nicht über die Achse hinweg', () => {
    expect(genreMatches(mkBook({ genres: ['General Fiction'] }), GENRE_NONFICTION)).toBe(false)
  })
  it('spezifischer Wert und No Genre treffen direkt', () => {
    expect(genreMatches(mkBook({ genres: ['Comics', 'Nonfiction'] }), 'Comics')).toBe(true)
    expect(genreMatches(mkBook({ genres: [NO_GENRE] }), NO_GENRE)).toBe(true)
    expect(genreMatches(mkBook({ genres: ['Comics'] }), 'Poetry')).toBe(false)
  })
})

describe('displayGenres', () => {
  it('dedupliziert Dach + General zu einem Achsenlabel', () => {
    expect(displayGenres(mkBook({ genres: ['Nonfiction', 'General Nonfiction', 'Philosophy'] }))).toEqual([
      'Nonfiction',
      'Philosophy',
    ])
  })
  it('Achse vor spezifischen Werten, Datenreihenfolge bleibt', () => {
    expect(displayGenres(mkBook({ genres: ['History', 'Nonfiction', 'Philosophy'] }))).toEqual([
      'Nonfiction',
      'History',
      'Philosophy',
    ])
  })
  it('No Genre bleibt sichtbar', () => {
    expect(displayGenres(mkBook({ genres: [NO_GENRE] }))).toEqual([NO_GENRE])
  })
})

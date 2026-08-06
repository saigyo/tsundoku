import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { genreRows } from './genres'

const books = [
  mkBook({ genres: ['Nonfiction', 'General Nonfiction', 'Philosophy'], hasRead: true }),
  mkBook({ genres: ['General Nonfiction'] }), // nur General: zählt zur Achse, keine Listenzeile
  mkBook({ genres: ['Fiction', 'Comics'], hasRead: true }),
  mkBook({ genres: ['Comics'] }), // spezifisch ohne Dach: Listenzeile, keine Achse
  mkBook({ genres: ['No Genre'] }),
]

describe('genreRows', () => {
  const d = genreRows(books)

  it('Achse zählt Dach- und General-only-Bücher', () => {
    expect(d.axis).toEqual([
      { genre: 'Fiction', owned: 1, read: 1 },
      { genre: 'Nonfiction', owned: 2, read: 1 },
    ])
  })
  it('Listenzeilen ohne Dach/General/No Genre, absteigend nach Bestand', () => {
    expect(d.rows).toEqual([
      { genre: 'Comics', owned: 2, read: 1 },
      { genre: 'Philosophy', owned: 1, read: 1 },
    ])
  })
  it('No Genre als eigene Zeile', () => {
    expect(d.noGenre).toEqual({ genre: 'No Genre', owned: 1, read: 0 })
  })
  it('covered = Titel mit mindestens einem Wert ≠ No Genre', () => {
    expect(d.covered).toBe(4)
  })
})

import { GENRE_FICTION, GENRE_NONFICTION, genreMatches, NO_GENRE, UMBRELLA_VALUES } from '../genres'
import type { Book } from '../types'

export interface GenreRow {
  genre: string
  owned: number
  read: number
}

export interface GenreData {
  axis: GenreRow[] // Fiction, Nonfiction — feste Reihenfolge
  rows: GenreRow[] // spezifische Genres, absteigend nach Bestand
  noGenre: GenreRow // feste letzte Zeile der View
  covered: number // Titel mit mindestens einem Wert ≠ No Genre
}

export function genreRows(books: Book[]): GenreData {
  const axis = [GENRE_FICTION, GENRE_NONFICTION].map((genre) => {
    let owned = 0
    let read = 0
    for (const b of books) {
      if (!genreMatches(b, genre)) continue
      owned += 1
      if (b.hasRead) read += 1
    }
    return { genre, owned, read }
  })

  const spec = new Map<string, { owned: number; read: number }>()
  const noGenre = { genre: NO_GENRE, owned: 0, read: 0 }
  let covered = 0
  for (const b of books) {
    if (b.genres.some((g) => g !== NO_GENRE)) covered += 1
    for (const g of new Set(b.genres)) {
      if (g === NO_GENRE) {
        noGenre.owned += 1
        if (b.hasRead) noGenre.read += 1
        continue
      }
      if (UMBRELLA_VALUES.has(g)) continue
      const e = spec.get(g) ?? { owned: 0, read: 0 }
      e.owned += 1
      if (b.hasRead) e.read += 1
      spec.set(g, e)
    }
  }

  const rows = [...spec]
    .map(([genre, v]) => ({ genre, ...v }))
    .sort((a, z) => z.owned - a.owned || a.genre.localeCompare(z.genre))
  return { axis, rows, noGenre, covered }
}

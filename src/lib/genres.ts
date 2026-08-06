import type { Messages } from '../i18n/messages'
import type { Book } from './types'

export const GENRE_FICTION = 'Fiction'
export const GENRE_NONFICTION = 'Nonfiction'
export const NO_GENRE = 'No Genre'

/** Dach- und General-Werte je Achse: „General X" ist im Datenbestand
 *  praktisch Teilmenge von X (754/759 bzw. 1260/1266) und markiert
 *  „ohne Spezialgenre" — es geht im Dach auf (Spec, Entscheidung 2). */
const AXIS_MEMBERS: Record<string, readonly string[]> = {
  [GENRE_FICTION]: ['Fiction', 'General Fiction'],
  [GENRE_NONFICTION]: ['Nonfiction', 'General Nonfiction'],
}

/** Werte, die nie als spezifische Genre-Zeile erscheinen. */
export const UMBRELLA_VALUES: ReadonlySet<string> = new Set([
  'Fiction',
  'General Fiction',
  'Nonfiction',
  'General Nonfiction',
])

/** Filter- und Anzeige-Semantik an einer Stelle: Achsenwerte treffen
 *  Dach ODER General, alles andere ist direkte Mitgliedschaft. */
export function genreMatches(b: Book, value: string): boolean {
  const members = AXIS_MEMBERS[value]
  if (members !== undefined) return members.some((g) => b.genres.includes(g))
  return b.genres.includes(value)
}

/** Anzeige im BookDetail: pro Achse höchstens ein Eintrag, dann die
 *  spezifischen Werte in Datenreihenfolge, ggf. No Genre am Platz. */
export function displayGenres(b: Book): string[] {
  const out: string[] = []
  if (genreMatches(b, GENRE_FICTION)) out.push(GENRE_FICTION)
  if (genreMatches(b, GENRE_NONFICTION)) out.push(GENRE_NONFICTION)
  out.push(...b.genres.filter((g) => !UMBRELLA_VALUES.has(g)))
  return out
}

/** Übersetztes Label mit Fallback auf den Rohwert (unbekannte künftige
 *  Genres bleiben lesbar statt zu verschwinden). */
export function genreLabel(value: string, m: Messages): string {
  return (m.genreNames as Record<string, string>)[value] ?? value
}

/** Vollständiges LibraryThing-Vokabular des Exports (2026-08-06) —
 *  erzwingt per Typsystem denselben Schlüsselsatz in allen Bundles. */
export const GENRE_KEYS = [
  'Fiction',
  'General Fiction',
  'Nonfiction',
  'General Nonfiction',
  'No Genre',
  'Anthropology',
  'Art & Design',
  'Biography & Memoir',
  'Business',
  "Children's Books",
  'Comics',
  'Economics',
  'Fantasy',
  'Food & Cooking',
  'Health & Wellness',
  'Historical Fiction',
  'History',
  'Home & Garden',
  'Horror',
  'Hunting and Fishing',
  'Kids',
  'LGBTQ+',
  'Literature Studies and Criticism',
  'Music',
  'Mystery',
  'Philosophy',
  'Picture Books',
  'Poetry',
  'Politics, Government, Law and Public Policy',
  'Recent Fiction',
  'Reference',
  'Religion & Spirituality',
  'Romance',
  'Science & Nature',
  'Science Fiction',
  'Sexuality and Gender Studies',
  'Sociology',
  'Sports and Leisure',
  'Suspense & Thriller',
  'Technology',
  'Teen',
  'Travel',
  'Tween',
  'Young Adult',
] as const
export type GenreKey = (typeof GENRE_KEYS)[number]

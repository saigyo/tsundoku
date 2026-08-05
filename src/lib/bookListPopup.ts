import type { Book } from './types'

/**
 * Chronologisch nach Achsendatum (ISO-Strings `YYYY-MM-DD`, Stringvergleich
 * genügt); Titel ohne Tagesdatum ans Ende, untereinander alphabetisch
 * (Spec „Interaktives Titel-Popup", Entscheidung 7). Liefert eine neue Liste.
 */
export function sortBooksByDate(books: Book[], dateOf: (b: Book) => string | null): Book[] {
  return [...books].sort((a, z) => {
    const da = dateOf(a)
    const dz = dateOf(z)
    if (da !== null && dz !== null) return da < dz ? -1 : da > dz ? 1 : 0
    if (da !== null) return -1
    if (dz !== null) return 1
    return a.title.localeCompare(z.title)
  })
}

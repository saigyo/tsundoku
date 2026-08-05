import { describe, expect, it } from 'vitest'
import { sortBooksByDate } from './bookListPopup'
import type { Book } from './types'

/** Minimal-Buch: die Sortierung liest nur title und das dateOf-Feld. */
const book = (title: string, acquiredDate: string | null): Book =>
  ({ title, acquiredDate }) as Book

const dateOf = (b: Book) => b.acquiredDate

describe('sortBooksByDate', () => {
  it('sortiert datierte Titel chronologisch (ISO-Stringordnung)', () => {
    const out = sortBooksByDate(
      [book('B', '2009-11-27'), book('A', '2009-01-12'), book('C', '2009-02-03')],
      dateOf,
    )
    expect(out.map((b) => b.title)).toEqual(['A', 'C', 'B'])
  })

  it('stellt undatierte Titel ans Ende, untereinander alphabetisch', () => {
    const out = sortBooksByDate(
      [book('Zebra', null), book('Mitte', '2009-06-01'), book('Anfang', null)],
      dateOf,
    )
    expect(out.map((b) => b.title)).toEqual(['Mitte', 'Anfang', 'Zebra'])
  })

  it('mutiert die Eingabe nicht', () => {
    const input = [book('B', '2010-01-01'), book('A', '2009-01-01')]
    sortBooksByDate(input, dateOf)
    expect(input.map((b) => b.title)).toEqual(['B', 'A'])
  })

  it('leere Liste bleibt leer', () => {
    expect(sortBooksByDate([], dateOf)).toEqual([])
  })
})

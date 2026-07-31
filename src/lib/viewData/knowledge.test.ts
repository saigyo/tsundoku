import { describe, expect, it } from 'vitest'
import { mkBook } from '../fixtures'
import { ddcYearMatrix } from './knowledge'

const ddc = (top: number) => ({ code: `${top}00`, top, topLabel: 'x' })
const books = [
  mkBook({ acquiredYear: 2000, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2000, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2000, ddc: ddc(1) }),
  mkBook({ acquiredYear: 2002, ddc: ddc(8) }),
  mkBook({ acquiredYear: 2001, ddc: null }),      // zählt nicht in die Matrix
  mkBook({ acquiredYear: null, ddc: ddc(8) }),    // zählt nicht in die Matrix
]

describe('ddcYearMatrix', () => {
  it('Matrix über durchgehende Jahre, nur vorhandene Klassen', () => {
    const d = ddcYearMatrix(books, { smooth: false })
    expect(d.years).toEqual([2000, 2001, 2002])
    expect(d.classes).toEqual([1, 8])
    expect(d.rows[0]).toEqual({ 1: 1, 8: 2 })
    expect(d.rows[1]).toEqual({ 1: 0, 8: 0 })
    expect(d.rows[2]).toEqual({ 1: 0, 8: 1 })
  })
  it('gleitender Dreijahresschnitt, zentriert, Ränder mit verfügbaren Nachbarn', () => {
    const d = ddcYearMatrix(books, { smooth: true })
    // Klasse 8 roh: [2, 0, 1] → geglättet: [1, 1, 0.5]
    expect(d.rows.map((r) => r[8])).toEqual([1, 1, 0.5])
  })
  it('Abdeckung: covered = mit DDC und Erwerbsjahr', () => {
    const d = ddcYearMatrix(books, { smooth: false })
    expect(d.covered).toBe(4)
    expect(d.withAcquired).toBe(5)
  })
})

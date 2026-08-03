import { describe, expect, it } from 'vitest'
import { de } from '../../i18n/de'
import { mkBook } from '../fixtures'
import { shelfLegend } from './shelfLegend'

// Stub statt echter d3-Skala: macht den Swatch-Abgriff (Dekaden-Mittelpunkt) prüfbar.
const scale = (y: number) => `scale(${y})`

describe('shelfLegend', () => {
  it('ddc: Klasse mit ddcTop-Filter, fehlende DDC passiv', () => {
    const books = [
      mkBook({ ddc: { code: '100', top: 1, topLabel: 'Philosophie' } }),
      mkBook({ ddc: { code: '150', top: 1, topLabel: 'Philosophie' } }),
      mkBook({ ddc: null }),
    ]
    const entries = shelfLegend('ddc', books, books, scale, de)
    expect(entries[0].label).toBe(de.ddc.short[1])
    expect(entries[0].count).toBe(2)
    expect(entries[0].filter).toEqual({ kind: 'ddcTop', value: 1 })
    const passive = entries.find((e) => e.label === de.views.shelf.noInfo)
    expect(passive?.count).toBe(1)
    expect(passive?.filter).toBeNull()
  })

  it('language: roher LT-Sprachname als Filterwert, Label übersetzt, ohne Sprache passiv', () => {
    // Die Daten führen LibraryThing-Namen ('Japanese'), keine ISO-Codes —
    // der Filterwert muss der Rohwert sein (matches() vergleicht includes).
    const books = [
      mkBook({ languages: ['Japanese'] }),
      mkBook({ languages: ['Japanese', 'German'] }),
      mkBook({ languages: [] }),
    ]
    const entries = shelfLegend('language', books, books, scale, de)
    const ja = entries.find((e) => e.filter !== null)
    expect(ja?.label).toBe('Japanisch') // via langLabel/Intl.DisplayNames
    expect(ja?.count).toBe(2) // gruppiert nach languages[0]
    expect(ja?.filter).toEqual({ kind: 'language', value: 'Japanese' })
    expect(entries.find((e) => e.label === de.views.shelf.noInfo)?.filter).toBeNull()
  })

  it('readStatus: read/unread als Filterwerte', () => {
    const books = [mkBook({ hasRead: true }), mkBook({ hasRead: false }), mkBook({ hasRead: false })]
    const entries = shelfLegend('readStatus', books, books, scale, de)
    expect(entries[0].label).toBe(de.views.shelf.legendUnread)
    expect(entries[0].filter).toEqual({ kind: 'readStatus', value: 'unread' })
    expect(entries[1].filter).toEqual({ kind: 'readStatus', value: 'read' })
  })

  it('acquiredYear: Dekaden-Range, Swatch am Mittelpunkt, ohne Jahr passiv', () => {
    const books = [
      mkBook({ acquiredYear: 1994 }),
      mkBook({ acquiredYear: 1991 }),
      mkBook({ acquiredYear: null }),
    ]
    const entries = shelfLegend('acquiredYear', books, books, scale, de)
    const dec = entries.find((e) => e.label === de.views.shelf.decade(1990))
    expect(dec?.count).toBe(2)
    expect(dec?.filter).toEqual({ kind: 'acquiredYear', from: 1990, to: 1999 })
    expect(dec?.color).toBe('scale(1995)')
    expect(entries.find((e) => e.label === de.views.shelf.noAcqYear)?.filter).toBeNull()
  })

  it('sortiert absteigend nach Anzahl', () => {
    const books = [
      mkBook({ ddc: null }),
      mkBook({ ddc: null }),
      mkBook({ ddc: { code: '300', top: 3, topLabel: 'Soziologie' } }),
    ]
    const entries = shelfLegend('ddc', books, books, scale, de)
    expect(entries.map((e) => e.count)).toEqual([2, 1])
  })

  it('behält Kategorien mit Anzahl 0 sichtbar und klickbar (Population vs. Zählmenge)', () => {
    const phil = mkBook({ ddc: { code: '100', top: 1, topLabel: 'Philosophie' } })
    const soz = mkBook({ ddc: { code: '300', top: 3, topLabel: 'Soziologie' } })
    const entries = shelfLegend('ddc', [phil, soz], [soz], scale, de)
    const zero = entries.find((e) => e.label === de.ddc.short[1])
    expect(zero?.count).toBe(0)
    expect(zero?.filter).toEqual({ kind: 'ddcTop', value: 1 })
    expect(entries[0].label).toBe(de.ddc.short[3]) // Sortierung: Zahlen zuerst
  })
})

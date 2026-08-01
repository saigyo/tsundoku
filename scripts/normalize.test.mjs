import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { toPages, toMm, toGrams, normTag, mediaType, fixPermutedDimensions, normalize } from './normalize.mjs'

// Regeln aus docs/datenprofil.md, Abschnitt „Bereinigungsregeln"

describe('toPages (Regel 2: semikolonsepariert)', () => {
  it('summiert arabische Teile', () => {
    expect(toPages('500; 442; 258')).toBe(1200)
  })
  it('ignoriert römischen Vorspann', () => {
    expect(toPages('xvi; 342')).toBe(342)
  })
  it('verwirft Ergebnisse über 20.000', () => {
    expect(toPages('999999')).toBeNull()
  })
  it('fehlender Wert bleibt null', () => {
    expect(toPages(null)).toBeNull()
    expect(toPages('')).toBeNull()
  })
})

describe('toMm / toGrams (Regel 3: imperiale Einheiten, Einheit aus dem String)', () => {
  it('Zoll nach mm', () => {
    expect(toMm('8 inches')).toBe(203)
  })
  it('cm-Ausreißer werden als cm gelesen', () => {
    expect(toMm('22 cm')).toBe(220)
  })
  it('Pfund nach Gramm', () => {
    expect(toGrams('1 lb')).toBe(454)
  })
  it('kg-Ausreißer werden als kg gelesen', () => {
    expect(toGrams('1.2 kg')).toBe(1200)
  })
})

describe('normTag (Regel 4: DE/EN-Aliase)', () => {
  it('führt englische Variante auf kanonischen Tag zurück', () => {
    // konkretes Mapping vor dem Schreiben in scripts/tag-aliases.json nachgeschlagen:
    // "japanese literature" / "japanische literatur" -> "japanische Literatur"
    expect(normTag('Japanese literature')).toBe(normTag('japanische Literatur'))
  })
})

describe('fixPermutedDimensions (Regel 9: permutierte height/thickness/length)', () => {
  it('lässt unauffällige Maße unangetastet (thickness <= height)', () => {
    expect(fixPermutedDimensions(210, 22, 137)).toEqual({
      heightMm: 210,
      thicknessMm: 22,
      lengthMm: 137,
      correction: null,
    })
  })
  it('rotiert height/thickness/length, wenn length als Dicke plausibel ist', () => {
    // realer Fall aus dem Export: height 231, thickness 325, length 12
    expect(fixPermutedDimensions(231, 325, 12)).toEqual({
      heightMm: 325,
      thicknessMm: 12,
      lengthMm: 231,
      correction: 'rotated',
    })
  })
  it('verwirft thickness, wenn length selbst nicht als Dicke plausibel ist', () => {
    expect(fixPermutedDimensions(17, 207, 152)).toEqual({
      heightMm: 17,
      thicknessMm: null,
      lengthMm: 152,
      correction: 'discarded',
    })
  })
  it('verwirft thickness, wenn length fehlt', () => {
    expect(fixPermutedDimensions(138, 213, null)).toEqual({
      heightMm: 138,
      thicknessMm: null,
      lengthMm: null,
      correction: 'discarded',
    })
  })
  it('lässt fehlende Maße unangetastet', () => {
    expect(fixPermutedDimensions(null, null, null)).toEqual({
      heightMm: null,
      thicknessMm: null,
      lengthMm: null,
      correction: null,
    })
  })
})

describe('mediaType (Regel 5)', () => {
  it('erkennt Vinyl über die Sammlung', () => {
    expect(mediaType(['Tonaufnahme, Schallplatte'], ['Vinyl records'])).toBe('vinyl')
  })
  it('Buch als Default', () => {
    expect(mediaType(['Paperback'], ['Your library'])).toBe('book')
  })
})

// Hinweis: bewusst kein `new URL(..., import.meta.url)` — Vite/Vitest behandelt
// dieses Muster als Asset-URL-Sonderfall und loest es gegen den Dev-Server auf
// (http://localhost:.../@fs/...) statt gegen das Dateisystem, was existsSync/
// readFileSync in Node unter Vitest fehlschlagen laesst.
const HERE = dirname(fileURLToPath(import.meta.url))
const EXPORT_PATH = resolve(HERE, '../librarything_kaixo_202607210219.json')

describe.skipIf(!existsSync(EXPORT_PATH))('Goldene Kennzahlen am realen Export', () => {
  const raw = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'))
  const { books } = normalize(raw)

  it('4865 Einträge', () => {
    expect(books.length).toBe(4865)
  })
  it('Medien-Split', () => {
    const count = (m) => books.filter((b) => b.mediaType === m).length
    expect(count('book')).toBe(4527)
    expect(count('ebook')).toBe(179)
    expect(count('film')).toBe(87)
    expect(count('vinyl')).toBe(72)
  })
  it('1334 gelesen, Lesejahre ab 1988', () => {
    const read = books.filter((b) => b.hasRead)
    expect(read.length).toBe(1334)
    const years = books.map((b) => b.readYearEffective).filter((y) => y !== null)
    expect(years.length).toBe(1334)
    expect(Math.min(...years)).toBe(1988)
  })
  it('Seiten gesamt 1.359.074', () => {
    expect(books.reduce((s, b) => s + (b.pages ?? 0), 0)).toBe(1359074)
  })
  it('935 mit dateread, Rest aus Jahres-Tags', () => {
    expect(books.filter((b) => b.readYearSource === 'dateread').length).toBe(935)
  })
})

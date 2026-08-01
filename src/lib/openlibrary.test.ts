import { describe, expect, it } from 'vitest'
import { bookUrl, coverUrl, normalizeIsbn } from './openlibrary'

describe('normalizeIsbn', () => {
  it('lässt saubere ISBN-10 und ISBN-13 durch', () => {
    expect(normalizeIsbn('0195121236')).toBe('0195121236')
    expect(normalizeIsbn('9784904454015')).toBe('9784904454015')
  })
  it('entfernt Bindestriche und Leerzeichen', () => {
    expect(normalizeIsbn('978-3-86832-485-3')).toBe('9783868324853')
    expect(normalizeIsbn('3 499 22662 2')).toBe('3499226622')
  })
  it('hebt das Prüfzeichen x an', () => {
    expect(normalizeIsbn('080442957x')).toBe('080442957X')
  })
  it('weist andere Längen zurück', () => {
    // 12 Stellen — abgeschnittene ISBN, real im Datenbestand
    expect(normalizeIsbn('978-4-904454-01')).toBeNull()
    expect(normalizeIsbn('12345')).toBeNull()
    expect(normalizeIsbn('')).toBeNull()
  })
  it('weist Buchstaben außer dem Prüfzeichen zurück', () => {
    expect(normalizeIsbn('B00X4WHP5E')).toBeNull() // ASIN, keine ISBN
    expect(normalizeIsbn('123456789Y')).toBeNull()
  })
})

describe('coverUrl / bookUrl', () => {
  it('baut die M-Cover-URL mit default=false', () => {
    expect(coverUrl('978-3-86832-485-3')).toBe(
      'https://covers.openlibrary.org/b/isbn/9783868324853-M.jpg?default=false',
    )
  })
  it('baut die Buchseiten-URL', () => {
    expect(bookUrl('0195121236')).toBe('https://openlibrary.org/isbn/0195121236')
  })
  it('reicht ungültige ISBNs als null durch', () => {
    expect(coverUrl('978-4-904454-01')).toBeNull()
    expect(bookUrl('nope')).toBeNull()
  })
})

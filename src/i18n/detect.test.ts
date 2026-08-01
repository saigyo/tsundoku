import { describe, expect, it } from 'vitest'
import { detectLocale } from './detect'

describe('detectLocale', () => {
  it('nimmt die gespeicherte Wahl vor der Browsersprache', () => {
    expect(detectLocale('ja', ['de-DE', 'de'])).toBe('ja')
  })
  it('ignoriert ungültige gespeicherte Werte', () => {
    expect(detectLocale('tlh', ['fr-FR'])).toBe('fr')
    expect(detectLocale('', ['fr-FR'])).toBe('fr')
  })
  it('matcht Browsersprachen per Prefix in Reihenfolge', () => {
    expect(detectLocale(null, ['de-AT', 'en-US'])).toBe('de')
    expect(detectLocale(null, ['pt-BR', 'es-419', 'en'])).toBe('es')
    expect(detectLocale(null, ['ja'])).toBe('ja')
  })
  it('fällt ohne Treffer auf en zurück', () => {
    expect(detectLocale(null, ['pt-BR', 'zh-CN'])).toBe('en')
    expect(detectLocale(null, [])).toBe('en')
  })
})

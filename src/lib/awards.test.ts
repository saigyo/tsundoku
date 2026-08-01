import { describe, expect, it } from 'vitest'
import { AWARD_SYNONYMS, canonicalAward } from './awards'

describe('canonicalAward', () => {
  it('führt Übersetzungen derselben Liste zusammen', () => {
    // Die konkreten Schlüssel stammen aus Step 1; dieser Test fixiert das Prinzip
    // an einem realen Paar. Beispiel (anpassen an echte Werte):
    const [synonym, canonical] = Object.entries(AWARD_SYNONYMS)[0] ?? []
    expect(synonym).toBeDefined()
    expect(canonicalAward(synonym as string)).toBe(canonical)
  })
  it('lässt unbekannte Listen unverändert', () => {
    expect(canonicalAward('Ein ganz eigener Preis')).toBe('Ein ganz eigener Preis')
  })
  it('führt alle vier bekannten 1001-Übersetzungen auf die englische Kanonliste zusammen', () => {
    const canonical = '1001 Books You Must Read Before You Die'
    expect(canonicalAward('1001 boeken die je gelezen moet hebben!')).toBe(canonical)
    expect(canonicalAward('1001 böcker du måste läsa innan du dör')).toBe(canonical)
    expect(canonicalAward('1001 Bücher, die Sie lesen sollten, bevor das Leben vorbei ist')).toBe(canonical)
    expect(canonicalAward("Les 1001 livres qu'il faut avoir lus dans sa vie")).toBe(canonical)
  })
  it('lässt verwandte, aber inhaltlich andere 1001-Listen getrennt (Comics, Kinderbücher)', () => {
    expect(canonicalAward('1001 Comics You Must Read Before You Die')).toBe(
      '1001 Comics You Must Read Before You Die',
    )
    expect(canonicalAward("1001 Children's Books You Must Read Before You Grow Up")).toBe(
      "1001 Children's Books You Must Read Before You Grow Up",
    )
  })
})

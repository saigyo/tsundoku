import { describe, expect, it } from 'vitest'
import { de } from '../i18n/de'
import { AWARD_SYNONYMS } from '../lib/awards'
import { mkBook } from '../lib/fixtures'
import { filterBooks, filterKey, filterLabel, sameFilter, useFilterStore } from './filters'

const japan = mkBook({ tagsNorm: ['Japan'], languages: ['ja'], hasRead: true, readYearEffective: 2014 })
const philo = mkBook({
  tagsNorm: ['Philosophie'],
  languages: ['de'],
  ddc: { code: '193', top: 1, topLabel: 'Philosophie & Psychologie' },
  acquiredYear: 2010,
})
const roman = mkBook({
  tagsNorm: ['Japan', 'Roman'],
  languages: ['de'],
  originalLanguages: ['ja'],
  acquiredYear: 2015,
  editionYear: 2012,
  authors: [{ name: 'Haruki Murakami', sort: 'Murakami, Haruki', role: null }],
  primaryAuthor: 'Haruki Murakami',
})
const all = [japan, philo, roman]

describe('filterBooks', () => {
  it('leere Filtermenge liefert dieselbe Referenz', () => {
    expect(filterBooks(all, [])).toBe(all)
  })
  it('ODER innerhalb einer Dimension', () => {
    expect(
      filterBooks(all, [
        { kind: 'language', value: 'ja' },
        { kind: 'language', value: 'de' },
      ]),
    ).toEqual([japan, philo, roman])
  })
  it('Ausnahme Tags: UND innerhalb der Dimension (Buch trägt alle gewählten Tags)', () => {
    expect(
      filterBooks(all, [
        { kind: 'tag', value: 'Japan' },
        { kind: 'tag', value: 'Roman' },
      ]),
    ).toEqual([roman])
    expect(
      filterBooks(all, [
        { kind: 'tag', value: 'Philosophie' },
        { kind: 'tag', value: 'Roman' },
      ]),
    ).toEqual([])
  })
  it('UND über Dimensionen', () => {
    expect(
      filterBooks(all, [
        { kind: 'tag', value: 'Japan' },
        { kind: 'language', value: 'de' },
      ]),
    ).toEqual([roman])
  })
  it('Bereichsfilter schließt null aus und prüft Grenzen inklusiv', () => {
    expect(filterBooks(all, [{ kind: 'acquiredYear', from: 2010, to: 2015 }])).toEqual([philo, roman])
    expect(filterBooks(all, [{ kind: 'acquiredYear', from: 2011, to: 2014 }])).toEqual([])
  })
  it('readYear nutzt readYearEffective', () => {
    expect(filterBooks(all, [{ kind: 'readYear', from: 2014, to: 2014 }])).toEqual([japan])
  })
  it('readStatus unread heißt hasRead === false', () => {
    expect(filterBooks(all, [{ kind: 'readStatus', value: 'unread' }])).toEqual([philo, roman])
  })
  it('ddcTop, originalLanguage, editionYear', () => {
    expect(filterBooks(all, [{ kind: 'ddcTop', value: 1 }])).toEqual([philo])
    expect(filterBooks(all, [{ kind: 'originalLanguage', value: 'ja' }])).toEqual([roman])
    expect(filterBooks(all, [{ kind: 'editionYear', from: 2012, to: 2012 }])).toEqual([roman])
  })
  it('author matcht über authors[].name oder primaryAuthor (Author-Objekte)', () => {
    expect(filterBooks(all, [{ kind: 'author', value: 'Haruki Murakami' }])).toEqual([roman])
  })
  it('mediaType matcht auf b.mediaType', () => {
    const film = mkBook({ mediaType: 'film' })
    const book = mkBook({ mediaType: 'book' })
    expect(filterBooks([film, book], [{ kind: 'mediaType', value: 'film' }])).toEqual([film])
  })
  it('collection matcht auf b.collections', () => {
    const withCollection = mkBook({ collections: ['Bibliothek Ost'] })
    const withoutCollection = mkBook({ collections: [] })
    expect(
      filterBooks([withCollection, withoutCollection], [{ kind: 'collection', value: 'Bibliothek Ost' }]),
    ).toEqual([withCollection])
  })
  it('award matcht via canonicalAward: Identität ohne Synonym-Eintrag', () => {
    const withAward = mkBook({ awards: ['Hugo Award'] })
    const withoutAward = mkBook({ awards: [] })
    expect(filterBooks([withAward, withoutAward], [{ kind: 'award', value: 'Hugo Award' }])).toEqual([withAward])
  })
  it('award matcht via canonicalAward: Synonym wird auf den Kanon-Namen aufgelöst', () => {
    AWARD_SYNONYMS['Hugo Award (Übersetzung)'] = 'Hugo Award'
    try {
      const rawSynonym = mkBook({ awards: ['Hugo Award (Übersetzung)'] })
      const other = mkBook({ awards: ['Nebula Award'] })
      // Filterwert ist der Kanon-Name; der Buchdatensatz trägt die rohe Synonym-Schreibweise.
      expect(filterBooks([rawSynonym, other], [{ kind: 'award', value: 'Hugo Award' }])).toEqual([rawSynonym])
    } finally {
      delete AWARD_SYNONYMS['Hugo Award (Übersetzung)']
    }
  })
})

describe('sameFilter', () => {
  it('vergleicht kind+value bzw. kind+Bereich', () => {
    expect(sameFilter({ kind: 'tag', value: 'Japan' }, { kind: 'tag', value: 'Japan' })).toBe(true)
    expect(sameFilter({ kind: 'tag', value: 'Japan' }, { kind: 'collection', value: 'Japan' })).toBe(false)
    expect(sameFilter({ kind: 'readYear', from: 1, to: 2 }, { kind: 'readYear', from: 1, to: 3 })).toBe(false)
  })
})

describe('filterLabel', () => {
  it('baut deutsche Labels', () => {
    expect(filterLabel({ kind: 'tag', value: 'Japan' }, de)).toBe('Tag: Japan')
    expect(filterLabel({ kind: 'ddcTop', value: 8 }, de)).toBe('Wissensgebiet: Literatur')
    expect(filterLabel({ kind: 'acquiredYear', from: 2010, to: 2015 }, de)).toBe('Erworben: 2010–2015')
    expect(filterLabel({ kind: 'readStatus', value: 'unread' }, de)).toBe('Status: ungelesen')
    expect(filterLabel({ kind: 'language', value: 'Japanese' }, de)).toBe('Sprache: Japanisch')
  })
})

describe('filterKey', () => {
  it('ist stabil und locale-unabhängig', () => {
    expect(filterKey({ kind: 'tag', value: 'Japan' })).toBe('tag:Japan')
    expect(filterKey({ kind: 'acquiredYear', from: 2010, to: 2015 })).toBe('acquiredYear:2010-2015')
    expect(filterKey({ kind: 'language', value: 'Japanese' })).toBe('language:Japanese')
  })
})

describe('useFilterStore', () => {
  it('addFilter dedupliziert, toggleFilter entfernt wieder', () => {
    const s = useFilterStore.getState()
    s.clearFilters()
    s.addFilter({ kind: 'tag', value: 'Japan' })
    s.addFilter({ kind: 'tag', value: 'Japan' })
    expect(useFilterStore.getState().filters).toHaveLength(1)
    s.toggleFilter({ kind: 'tag', value: 'Japan' })
    expect(useFilterStore.getState().filters).toHaveLength(0)
  })
  it('setRange ersetzt bestehenden Bereich derselben Dimension', () => {
    const s = useFilterStore.getState()
    s.clearFilters()
    s.setRange('acquiredYear', 2000, 2010)
    s.setRange('acquiredYear', 2005, 2012)
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'acquiredYear', from: 2005, to: 2012 }])
  })
})

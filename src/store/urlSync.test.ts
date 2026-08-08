import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_VIEW, type Filter } from '../lib/types'
import { useFilterStore } from './filters'
import { queryToState, startUrlSync, stateToQuery } from './urlSync'

const full: Filter[] = [
  { kind: 'tag', value: 'Japan' },
  { kind: 'tag', value: 'Philosophie, deutsche' },
  { kind: 'language', value: 'ja' },
  { kind: 'originalLanguage', value: 'ja' },
  { kind: 'ddcTop', value: 8 },
  { kind: 'mediaType', value: 'vinyl' },
  { kind: 'collection', value: 'Your library' },
  { kind: 'author', value: '村上春樹' },
  { kind: 'award', value: '1001 Books You Must Read Before You Die' },
  { kind: 'acquiredYear', from: 2010, to: 2015 },
  { kind: 'readYear', from: 1988, to: 2020 },
  { kind: 'editionYear', from: 1998, to: 1998 },
  { kind: 'readStatus', value: 'unread' },
]

describe('Roundtrip', () => {
  it('Filter → Query → Filter verlustfrei (Reihenfolge egal)', () => {
    const q = stateToQuery('network', full)
    const back = queryToState(q)
    expect(back.view).toBe('network')
    expect(back.filters).toHaveLength(full.length)
    for (const f of full) expect(back.filters).toContainEqual(f)
  })
  it('Default-View und leere Filter ergeben leeren Query', () => {
    expect(stateToQuery(DEFAULT_VIEW, [])).toBe('')
  })
})

describe('Genre-Filter', () => {
  it('genre überlebt die URL-Runde', () => {
    const q = stateToQuery('shelf', [{ kind: 'genre', value: 'Comics' }])
    expect(queryToState(q).filters).toEqual([{ kind: 'genre', value: 'Comics' }])
  })
})

describe('Flag-Filter', () => {
  it('flag-Filter überlebt den URL-Roundtrip', () => {
    const filters: Filter[] = [{ kind: 'flag', value: 'abandoned' }]
    expect(queryToState(stateToQuery(DEFAULT_VIEW, filters)).filters).toEqual(filters)
  })
  it('unbekannter flag-Wert wird verworfen', () => {
    expect(queryToState('?flag=nonsense').filters).toEqual([])
  })
})

describe('Defekte Query-Strings degradieren stumm', () => {
  it('unbekannte Parameter und kaputte Werte werden ignoriert', () => {
    const st = queryToState('?view=nope&bogus=1&ddc=zwölf&acq=abc&read=2020-1988&status=maybe&tag=Japan')
    expect(st.view).toBe(DEFAULT_VIEW)
    expect(st.filters).toEqual([{ kind: 'tag', value: 'Japan' }])
  })
})

describe('History-Verdrahtung', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    useFilterStore.setState({ filters: [], view: DEFAULT_VIEW })
  })

  it('Store-Änderung schreibt pushState, popstate liest zurück', () => {
    const stop = startUrlSync()
    useFilterStore.getState().addFilter({ kind: 'tag', value: 'Japan' })
    expect(location.search).toBe('?tag=Japan')

    history.replaceState(null, '', '/?tag=Berlin')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'tag', value: 'Berlin' }])
    stop()
  })

  it('startUrlSync initialisiert den Store aus der URL', () => {
    history.replaceState(null, '', '/?view=knowledge&status=read')
    const stop = startUrlSync()
    expect(useFilterStore.getState().view).toBe('knowledge')
    expect(useFilterStore.getState().filters).toEqual([{ kind: 'readStatus', value: 'read' }])
    stop()
  })
})

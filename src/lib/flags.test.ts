import { describe, expect, it } from 'vitest'
import { mkBook } from './fixtures'
import { FLAG_IDS, hasFlag } from './flags'

describe('hasFlag', () => {
  it('trifft jedes der sechs Flags über sein Buchfeld', () => {
    expect(hasFlag(mkBook({ bulkImport: true }), 'bulkImport')).toBe(true)
    expect(hasFlag(mkBook({ physicalEstimated: true }), 'physicalEstimated')).toBe(true)
    expect(hasFlag(mkBook({ originalLanguagesInferred: true }), 'origLangInferred')).toBe(true)
    expect(hasFlag(mkBook({ readYearSource: 'tag' }), 'readYearTag')).toBe(true)
    expect(hasFlag(mkBook({ acquiredYearSource: 'entrydate' }), 'acquiredEntry')).toBe(true)
    expect(hasFlag(mkBook({ abandoned: true }), 'abandoned')).toBe(true)
  })
  it('Default-Buch trägt kein Flag', () => {
    for (const id of FLAG_IDS) expect(hasFlag(mkBook(), id)).toBe(false)
  })
  it('unbekannte Id -> false (URL-Eingaben)', () => {
    expect(hasFlag(mkBook(), 'nonsense')).toBe(false)
    expect(hasFlag(mkBook(), 'constructor')).toBe(false)
    expect(hasFlag(mkBook(), '__proto__')).toBe(false)
  })
})

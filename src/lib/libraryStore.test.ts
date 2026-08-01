import { describe, expect, it } from 'vitest'
import { checkStored, SCHEMA_VERSION } from './libraryStore'

const validLibrary = { stats: { total: 1 }, books: [{ id: '1' }] }

describe('checkStored (Formatprüfung der gespeicherten Bibliothek)', () => {
  it('leerer Speicher -> none', () => {
    expect(checkStored(undefined).state).toBe('none')
    expect(checkStored(null).state).toBe('none')
  })

  it('aktuelle Version mit plausibler Struktur -> ok', () => {
    const rec = { schemaVersion: SCHEMA_VERSION, savedAt: 'x', sourceName: 'y', library: validLibrary }
    const result = checkStored(rec)
    expect(result.state).toBe('ok')
    if (result.state === 'ok') expect(result.record.library.books).toHaveLength(1)
  })

  it('andere Schema-Version -> incompatible (Neu-Upload-Hinweis)', () => {
    expect(checkStored({ schemaVersion: SCHEMA_VERSION + 1, library: validLibrary }).state).toBe('incompatible')
    expect(checkStored({ library: validLibrary }).state).toBe('incompatible')
  })

  it('kaputte Struktur -> incompatible', () => {
    expect(checkStored('quatsch').state).toBe('incompatible')
    expect(checkStored({ schemaVersion: SCHEMA_VERSION }).state).toBe('incompatible')
    expect(checkStored({ schemaVersion: SCHEMA_VERSION, library: { books: 'nope', stats: {} } }).state).toBe('incompatible')
    expect(checkStored({ schemaVersion: SCHEMA_VERSION, library: { books: [], stats: null } }).state).toBe('incompatible')
  })
})

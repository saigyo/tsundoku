import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadLibrary, LibraryMissingError } from './loadLibrary'

const lib = { stats: {}, books: [] }

afterEach(() => vi.unstubAllGlobals())

describe('loadLibrary', () => {
  it('liefert die geparste Bibliothek', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(lib), { status: 200 }),
    ))
    await expect(loadLibrary()).resolves.toEqual(lib)
  })

  it('wirft LibraryMissingError bei 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(loadLibrary()).rejects.toBeInstanceOf(LibraryMissingError)
  })

  it('wirft bei anderen HTTP-Fehlern mit Statuscode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(loadLibrary()).rejects.toThrow('500')
  })
})

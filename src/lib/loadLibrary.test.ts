import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadLibrary, LibraryMissingError } from './loadLibrary'

const lib = { stats: {}, books: [] }

afterEach(() => vi.unstubAllGlobals())

describe('loadLibrary', () => {
  it('liefert die geparste Bibliothek', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(lib), { status: 200, headers: { 'content-type': 'application/json' } }),
    ))
    await expect(loadLibrary()).resolves.toEqual(lib)
  })

  it('SPA-Fallback (index.html mit Status 200) gilt als fehlende Datei', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    ))
    await expect(loadLibrary()).rejects.toBeInstanceOf(LibraryMissingError)
  })

  it('wirft LibraryMissingError bei 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(loadLibrary()).rejects.toBeInstanceOf(LibraryMissingError)
  })

  it('fragt ohne ausgelieferte library.json gar nicht erst an', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadLibrary(false)).rejects.toBeInstanceOf(LibraryMissingError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('wirft bei anderen HTTP-Fehlern mit Statuscode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(loadLibrary()).rejects.toThrow('500')
  })
})

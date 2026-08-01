import type { Library } from './types'

export class LibraryMissingError extends Error {
  constructor() {
    super('public/data/library.json fehlt')
    this.name = 'LibraryMissingError'
  }
}

export async function loadLibrary(): Promise<Library> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/library.json`)
  if (res.status === 404) throw new LibraryMissingError()
  if (!res.ok) throw new Error(`Laden fehlgeschlagen: HTTP ${res.status}`)
  // Der Vite-Dev-Server beantwortet fehlende Pfade per SPA-Fallback mit
  // index.html und Status 200 — das ist ebenfalls "Datei fehlt".
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new LibraryMissingError()
  return (await res.json()) as Library
}

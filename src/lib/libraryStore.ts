import type { Library } from './types'

/**
 * Persistenz der hochgeladenen Bibliothek in IndexedDB. Bewusst nicht
 * localStorage: dessen Quote (~5 MB) ist kleiner als eine normalisierte
 * Bibliothek mittlerer Größe (~6,4 MB bei 4.865 Einträgen).
 */

/** Bei inkompatiblen Änderungen am normalisierten Format (Book/Stats) erhöhen —
 *  gespeicherte Daten älterer Versionen führen dann zum Neu-Upload-Hinweis. */
export const SCHEMA_VERSION = 1

/** Obergrenze für hochgeladene Bibliotheken. Die Views halten alles im
 *  Speicher und das Regal zeichnet jeden Rücken einzeln; bis ~4.900 Einträgen
 *  gemessen, 10.000 lässt Luft. Größere LibraryThing-Bibliotheken (bis
 *  100.000 Bücher) lassen sich gefiltert exportieren. */
export const MAX_BOOKS = 10_000

/** Vorabprüfung der Dateigröße (~2 KB/Buch im Roh-Export): verhindert, dass
 *  ein Riesen-Export den Parser sprengt, bevor wir Einträge zählen können. */
export const MAX_RAW_BYTES = 50 * 1024 * 1024

export interface StoredLibrary {
  schemaVersion: number
  savedAt: string
  sourceName: string
  library: Library
}

export type StoredResult =
  | { state: 'ok'; record: StoredLibrary }
  | { state: 'none' }
  | { state: 'incompatible' }

/** Reine Formatprüfung des gespeicherten Werts (getestet; IDB-Hülle bleibt dünn). */
export function checkStored(value: unknown): StoredResult {
  if (value === null || value === undefined) return { state: 'none' }
  if (typeof value !== 'object') return { state: 'incompatible' }
  const rec = value as Partial<StoredLibrary>
  if (rec.schemaVersion !== SCHEMA_VERSION) return { state: 'incompatible' }
  const lib = rec.library
  if (!lib || !Array.isArray(lib.books) || lib.stats === null || typeof lib.stats !== 'object') {
    return { state: 'incompatible' }
  }
  // Stichprobe statt Tiefenprüfung: ein manipulierter/teilkaputter Datensatz
  // soll zum Neu-Upload-Hinweis führen, nicht zum Render-Crash.
  const sample = lib.books[0]
  if (lib.books.length > 0 && (sample === null || typeof sample !== 'object' || !Array.isArray(sample.tagsNorm))) {
    return { state: 'incompatible' }
  }
  return { state: 'ok', record: rec as StoredLibrary }
}

const DB_NAME = 'tsundoku'
const STORE = 'library'
const KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB nicht verfügbar'))
  })
}

export async function saveLibrary(library: Library, sourceName: string): Promise<void> {
  const db = await openDb()
  try {
    const record: StoredLibrary = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      sourceName,
      library,
    }
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      t.objectStore(STORE).put(record, KEY)
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error ?? new Error('Speichern fehlgeschlagen'))
      t.onabort = () => reject(t.error ?? new Error('Speichern abgebrochen'))
    })
  } finally {
    db.close()
  }
}

export async function loadStoredLibrary(): Promise<StoredResult> {
  if (typeof indexedDB === 'undefined') return { state: 'none' }
  try {
    const db = await openDb()
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Lesen fehlgeschlagen'))
      })
      return checkStored(value)
    } finally {
      db.close()
    }
  } catch {
    // Defekte/blockierte DB ist kein Fehler für den Nutzer — dann eben Upload.
    return { state: 'none' }
  }
}

export async function clearStoredLibrary(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      t.objectStore(STORE).delete(KEY)
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error ?? new Error('Löschen fehlgeschlagen'))
    })
  } finally {
    db.close()
  }
}

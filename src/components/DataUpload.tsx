import { useRef, useState } from 'react'
import { normalize } from '../../scripts/normalize-core.mjs'
import { fmtInt } from '../lib/format'
import { MAX_BOOKS, MAX_RAW_BYTES, saveLibrary } from '../lib/libraryStore'
import type { Library } from '../lib/types'
import styles from './DataUpload.module.css'

type UploadState =
  | { state: 'idle' }
  | { state: 'working' }
  | { state: 'error'; message: string }
  | { state: 'report'; library: Library; sourceName: string }

/**
 * Einstiegsseite ohne library.json: nimmt einen LibraryThing-Export entgegen,
 * normalisiert ihn im Browser (gleicher Code wie die CLI) und zeigt die
 * Kennzahlen der Normalisierung, bevor die Daten in die App gehen. Die Datei
 * verlässt den Browser nicht; die normalisierten Daten bleiben in IndexedDB,
 * damit ein Reload nicht erneut nach der Datei fragt.
 */
export function DataUpload({
  onLoaded,
  onCancel,
  notice,
}: {
  onLoaded: (library: Library) => void
  /** Gesetzt, wenn bereits eine Bibliothek geladen ist (Wechsel-Dialog). */
  onCancel?: () => void
  /** z. B. Hinweis, dass gespeicherte Daten einer alten Version verworfen wurden. */
  notice?: string
}) {
  const [up, setUp] = useState<UploadState>({ state: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    if (file.size > MAX_RAW_BYTES) {
      setUp({
        state: 'error',
        message: `Datei ist ${fmtInt(Math.round(file.size / 1e6))} MB groß — Obergrenze ${fmtInt(MAX_RAW_BYTES / 1e6)} MB. LibraryThing erlaubt gefilterte Exporte (z. B. eine Sammlung).`,
      })
      return
    }
    setUp({ state: 'working' })
    file
      .text()
      .then((text) => {
        const raw: unknown = JSON.parse(text)
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error('kein LibraryThing-Export (erwartet: JSON-Objekt mit Buch-IDs als Schlüsseln)')
        }
        const library = normalize(raw as Record<string, unknown>, file.name)
        if (library.books.length === 0) throw new Error('der Export enthält keine Einträge')
        if (library.books.length > MAX_BOOKS) {
          throw new Error(
            `der Export enthält ${fmtInt(library.books.length)} Einträge — mehr als die Obergrenze von ${fmtInt(MAX_BOOKS)}. ` +
              'Die Ansichten halten alles im Speicher; bitte einen gefilterten Export wählen (LibraryThing kann z. B. nach Sammlung exportieren).',
          )
        }
        setUp({ state: 'report', library, sourceName: file.name })
      })
      .catch((e: unknown) =>
        setUp({
          state: 'error',
          message: e instanceof SyntaxError ? 'Datei ist kein gültiges JSON.' : e instanceof Error ? e.message : String(e),
        }),
      )
  }

  const accept = (library: Library, sourceName: string) => {
    // Persistenz ist Komfort, keine Voraussetzung: schlägt das Speichern fehl
    // (Quota, Private Mode), läuft die Sitzung mit den Daten im Speicher weiter.
    saveLibrary(library, sourceName)
      .catch((e: unknown) => console.warn('Bibliothek konnte nicht gespeichert werden:', e))
      .finally(() => onLoaded(library))
  }

  if (up.state === 'report') {
    const { stats, books } = up.library
    const rawTagCount = new Set(books.flatMap((b) => b.tags)).size
    const readYears = stats.readPerYearEffective.map(([y]) => Number(y))
    const rows: [string, string][] = [
      ['Einträge', fmtInt(stats.total)],
      ['Medien', stats.byMediaType.map(([m, n]) => `${m} ${fmtInt(n)}`).join(', ')],
      ['Gelesen', `${fmtInt(stats.read)} (Lesejahr bekannt: ${fmtInt(stats.withReadYearEffective)}, davon ${fmtInt(stats.withReadDate)} tagesgenau${readYears.length ? `, ab ${Math.min(...readYears)}` : ''})`],
      ['Seiten gesamt', fmtInt(stats.pagesTotal)],
      ['Lesedauer Median/p90/max', `${stats.readDays.median}/${stats.readDays.p90}/${stats.readDays.max} Tage`],
      ['Tags', `${fmtInt(stats.tagsNorm.length)} normalisiert (roh: ${fmtInt(rawTagCount)})`],
      ['Maße permutiert', `${fmtInt(stats.dimsSorted)} korrigiert, ${fmtInt(stats.dimsDiscarded)} verworfen (Regel 9)`],
      ['Maße geschätzt', `${fmtInt(stats.dimsEstimated)} Bücher aus der Seitenzahl (Regel 11)`],
      ['Originalsprache übernommen', `${fmtInt(stats.origLangInferred)} Bücher aus der Ausgabesprache (Regel 12)`],
      ['HTML-Entities dekodiert', `${fmtInt(stats.entitiesDecoded)} Felder (Regel 10)`],
      ['Massenimport-Flag', fmtInt(stats.bulkImported)],
    ]
    return (
      <div className={styles.box}>
        <h2>Normalisierung abgeschlossen</h2>
        <p className={styles.note}>
          Alle Bereinigungsregeln sind in <code>docs/datenprofil.md</code> dokumentiert; verworfene
          oder geschätzte Werte werden gezählt, nicht versteckt.
        </p>
        <dl className={styles.report}>
          {rows.map(([k, v]) => (
            <div key={k} className={styles.row}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <button className={styles.primary} onClick={() => accept(up.library, up.sourceName)}>
          Zur Anwendung
        </button>
        <button className={styles.secondary} onClick={() => setUp({ state: 'idle' })}>
          Andere Datei wählen
        </button>
      </div>
    )
  }

  return (
    <div className={styles.box}>
      <h2>Bibliothek laden</h2>
      {notice && <p className={styles.notice}>{notice}</p>}
      <p>
        Exportiere deine LibraryThing-Bibliothek auf{' '}
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        im Format <strong>JSON</strong> und lade die Datei hier — sie wird direkt im Browser
        normalisiert und <strong>verlässt deinen Rechner nicht</strong>.
      </p>
      <div
        className={dragOver ? styles.dropzoneActive : styles.dropzone}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {up.state === 'working' ? (
          <p>Wird normalisiert …</p>
        ) : (
          <>
            <p>Export-Datei hierher ziehen oder</p>
            <button onClick={() => inputRef.current?.click()}>Datei auswählen</button>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </>
        )}
      </div>
      {up.state === 'error' && <p className={styles.error}>Fehler: {up.message}</p>}
      {onCancel && (
        <button className={styles.secondary} onClick={onCancel}>
          Zurück zur geladenen Bibliothek
        </button>
      )}
      <p className={styles.note}>
        Für den lokalen Entwicklungsbetrieb geht es auch ohne Upload:{' '}
        <code>node scripts/normalize.mjs &lt;export.json&gt;</code> erzeugt{' '}
        <code>public/data/library.json</code>, die beim Start automatisch geladen wird.
      </p>
    </div>
  )
}

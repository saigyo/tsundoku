import { useRef, useState } from 'react'
import { normalize } from '../../scripts/normalize-core.mjs'
import { useI18n } from '../i18n/LocaleContext'
import { MAX_BOOKS, MAX_RAW_BYTES, saveLibrary } from '../lib/libraryStore'
import type { Library, MediaType } from '../lib/types'
import styles from './DataUpload.module.css'

type UploadState =
  | { state: 'idle' }
  | { state: 'working' }
  // message wird beim Wurf in der aktuell aktiven Sprache erzeugt und danach
  // nicht neu übersetzt — ein Sprachwechsel während einer Fehleranzeige
  // ändert diesen Text erst beim nächsten Upload-Versuch.
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
  const { m, fmtNum } = useI18n()
  const [up, setUp] = useState<UploadState>({ state: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    if (up.state === 'working') return // kein zweiter Drop während der Verarbeitung
    if (file.size > MAX_RAW_BYTES) {
      setUp({
        state: 'error',
        message: m.upload.errTooLarge(fmtNum(Math.round(file.size / 1e6)), fmtNum(MAX_RAW_BYTES / 1e6)),
      })
      return
    }
    setUp({ state: 'working' })
    file
      .text()
      .then((text) => {
        const raw: unknown = JSON.parse(text)
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error(m.upload.errNotAnExport)
        }
        // Obergrenze VOR normalize() prüfen: Millionen Mini-Records unter 50 MB
        // würden sonst erst vollständig materialisiert (OOM/Freeze), bevor die
        // Fehlermeldung je erscheinen könnte. Zählung per for-in mit Early-Exit
        // statt Object.keys, das selbst ein Millionen-Array materialisieren würde.
        let recordCount = 0
        for (const _key in raw) {
          if (++recordCount > MAX_BOOKS) break
        }
        if (recordCount > MAX_BOOKS) {
          throw new Error(m.upload.errTooMany(fmtNum(MAX_BOOKS)))
        }
        const library = normalize(raw as Record<string, unknown>, file.name)
        if (library.books.length === 0) {
          throw new Error(m.upload.errNoBooks)
        }
        setUp({ state: 'report', library, sourceName: file.name })
      })
      .catch((e: unknown) =>
        setUp({
          state: 'error',
          message: e instanceof SyntaxError ? m.upload.errInvalidJson : e instanceof Error ? e.message : String(e),
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
      [m.report.entries, fmtNum(stats.total)],
      [m.report.media, stats.byMediaType.map(([t, n]) => `${m.media[t as MediaType]} ${fmtNum(n)}`).join(', ')],
      [m.report.read, m.report.readValue(
        fmtNum(stats.read),
        fmtNum(stats.withReadYearEffective),
        fmtNum(stats.withReadDate),
        readYears.length ? Math.min(...readYears) : null,
      )],
      [m.report.pagesTotal, fmtNum(stats.pagesTotal)],
      ...(stats.readDays.median !== null
        ? ([[m.report.readDays, m.report.readDaysValue(stats.readDays.median, stats.readDays.p90!, stats.readDays.max!)]] as [string, string][])
        : []),
      [m.report.tags, m.report.tagsValue(fmtNum(stats.tagsNorm.length), fmtNum(rawTagCount))],
      [m.report.dimsSwapped, m.report.dimsSwappedValue(fmtNum(stats.dimsSorted), fmtNum(stats.dimsDiscarded))],
      [m.report.dimsEstimated, m.report.dimsEstimatedValue(fmtNum(stats.dimsEstimated))],
      [m.report.origLangInferred, m.report.origLangInferredValue(fmtNum(stats.origLangInferred))],
      [m.report.entitiesDecoded, m.report.entitiesDecodedValue(fmtNum(stats.entitiesDecoded))],
      [m.report.bulkImport, m.report.bulkImportValue(fmtNum(stats.bulkImported))],
    ]
    return (
      <div className={styles.box}>
        <h2>{m.report.title}</h2>
        <p className={styles.note}>{m.report.note}</p>
        <dl className={styles.report}>
          {rows.map(([k, v]) => (
            <div key={k} className={styles.row}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <button className={styles.primary} onClick={() => accept(up.library, up.sourceName)}>
          {m.report.toLibrary}
        </button>
        <button className={styles.secondary} onClick={() => setUp({ state: 'idle' })}>
          {m.report.otherFile}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.box}>
      <p className={styles.intro}>{m.upload.intro}</p>
      <h2>{m.upload.title}</h2>
      {notice && <p className={styles.notice}>{notice}</p>}
      <p>{m.upload.ltIntro}</p>
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
          <p>{m.upload.working}</p>
        ) : (
          <>
            <p>{m.upload.dropHere}</p>
            <button onClick={() => inputRef.current?.click()}>{m.upload.chooseFile}</button>
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
      {up.state === 'error' && (
        <p className={styles.error}>
          {m.upload.errorPrefix} {up.message}
        </p>
      )}
      {onCancel && (
        <button className={styles.secondary} onClick={onCancel}>
          {m.upload.backToLoaded}
        </button>
      )}
    </div>
  )
}

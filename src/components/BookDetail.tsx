import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { langLabel } from '../lib/languages'
import { bookUrl, coverUrl, normalizeIsbn } from '../lib/openlibrary'
import type { Book, Filter } from '../lib/types'
import { useCoversStore } from '../store/covers'
import { filterLabel, sameFilter, useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { m, fmtNum } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (book && !el.open) el.showModal()
    if (!book && el.open) el.close()
  }, [book])

  if (!book) return <dialog ref={ref} />

  // Cover und Link nur bei gültiger ISBN; die ISBN-Zeile in rows zeigt weiter den Rohwert.
  const isbn = book.isbn === null ? null : normalizeIsbn(book.isbn)
  const olUrl = isbn === null ? null : bookUrl(isbn)

  const chip = (f: Filter, label: string) => {
    const active = filters.some((g) => sameFilter(g, f))
    return (
      <button
        key={label}
        className={active ? styles.tagActive : styles.tag}
        onClick={() => toggleFilter(f)}
        aria-pressed={active}
        aria-label={m.detail.toggleFilterAria(filterLabel(f, m))}
      >
        {label}
      </button>
    )
  }
  const chips = (nodes: ReactNode[]) =>
    nodes.length ? <span className={styles.tags}>{nodes}</span> : null

  const rows: [string, ReactNode][] = [
    [m.detail.original, book.originalTitle],
    [m.detail.editionYear, book.editionYear === null ? null : String(book.editionYear)],
    [m.detail.language, chips(book.languages.map((l) => chip({ kind: 'language', value: l }, langLabel(l, m))))],
    [
      m.detail.originalLanguage,
      chips(book.originalLanguages.map((l) => chip({ kind: 'originalLanguage', value: l }, langLabel(l, m)))),
    ],
    [m.detail.pages, book.pages === null ? null : fmtNum(book.pages)],
    [m.detail.ddc, book.ddc ? chip({ kind: 'ddcTop', value: book.ddc.top }, m.ddc.labels[book.ddc.top]) : null],
    [m.detail.acquired, book.acquiredDate ?? (book.acquiredYear !== null ? String(book.acquiredYear) : null)],
    [m.detail.read, book.readDate ?? (book.readYearEffective !== null ? m.detail.readTagged(book.readYearEffective) : null)],
    [m.detail.rating, book.rating !== null ? `★ ${fmtNum(book.rating)}` : null],
    [m.detail.boughtAt, book.fromWhere],
    [m.detail.series, book.series.join(', ') || null],
    [m.detail.isbn, book.isbn],
    [m.detail.tags, chips(book.tagsNorm.map((t) => chip({ kind: 'tag', value: t }, t)))],
  ]

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label={book.title}>
      <div className={styles.body}>
        <div className={styles.bodyText}>
          <h3 className={styles.title}>{book.title}</h3>
          <p className={styles.authors}>
            {/* Anzeige-Deduplizierung: dieselbe Person kann im Export mehrfach
                gelistet sein (etwa als Übersetzer und Herausgeber). Die Chips
                filtern per Name — ein zweiter gleichnamiger Chip wäre redundant
                und kollidierte als React-Key. Die Daten bleiben unverändert. */}
            {book.authors
              .filter((a, i, all) => all.findIndex((b) => b.name === a.name) === i)
              .map((a) => {
              const active = filters.some((f) => f.kind === 'author' && f.value === a.name)
              return (
                <button
                  key={a.name}
                  className={active ? styles.authorActive : styles.author}
                  onClick={() => toggleFilter({ kind: 'author', value: a.name })}
                  aria-pressed={active}
                  aria-label={m.detail.filterByAuthorAria(a.name)}
                >
                  {a.name}
                </button>
              )
            })}
          </p>
          <dl className={styles.rows}>
            {rows
              .filter(([, v]) => v !== null)
              .map(([k, v]) => (
                <div key={k} className={styles.row}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {(book.workCode !== null || olUrl !== null) && (
            <p className={styles.ltLink}>
              {book.workCode !== null && (
                <a
                  href={`https://www.librarything.com/work/${book.workCode}/book/${book.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {m.detail.viewOnLt}
                </a>
              )}
              {book.workCode !== null && olUrl !== null && <span aria-hidden="true"> · </span>}
              {olUrl !== null && (
                <a href={olUrl} target="_blank" rel="noopener noreferrer">
                  {m.detail.viewOnOl}
                </a>
              )}
            </p>
          )}
        </div>
        {isbn !== null && <Cover key={book.id} isbn={isbn} title={book.title} />}
      </div>
      <button className={styles.close} onClick={onClose}>
        {m.detail.close}
      </button>
    </dialog>
  )
}

/** Cover-Block mit drei Zuständen: Opt-in-Platzhalter, Bild, „Kein Cover"
 *  (404 via onError). Wird mit key={book.id} eingesetzt, damit der
 *  Fehlerzustand beim Wechsel zum nächsten Buch zurückgesetzt wird. */
function Cover({ isbn, title }: { isbn: string; title: string }) {
  const { m } = useI18n()
  const enabled = useCoversStore((s) => s.enabled)
  const setEnabled = useCoversStore((s) => s.setEnabled)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(false)
  if (!enabled) {
    return (
      <div className={styles.cover}>
        <button className={styles.coverLoad} onClick={() => setEnabled(true)}>
          {m.detail.coverLoad}
        </button>
        <p className={styles.coverNote}>{m.detail.coverNote}</p>
      </div>
    )
  }
  if (failed) {
    return (
      <div className={styles.cover}>
        <span className={styles.coverNone}>{m.detail.coverNone}</span>
      </div>
    )
  }
  return (
    <div className={styles.cover}>
      {/* isbn kommt bereits normalisiert vom Aufrufer, coverUrl kann nicht null sein */}
      <button className={styles.coverZoomButton} onClick={() => setZoom(true)} aria-label={m.detail.coverZoomAria}>
        <img
          className={styles.coverImg}
          src={coverUrl(isbn)!}
          alt={m.detail.coverAlt(title)}
          onError={() => setFailed(true)}
        />
      </button>
      {zoom && <CoverZoom isbn={isbn} title={title} onClose={() => setZoom(false)} />}
    </div>
  )
}

/** Zoom-Overlay mit dem L-Cover — so verlinkt es auch die OpenLibrary-Seite
 *  selbst. Esc und Klick schließen; fehlt die L-Version (404), fällt die
 *  Anzeige auf das bereits geladene M-Cover zurück. */
function CoverZoom({ isbn, title, onClose }: { isbn: string; title: string; onClose: () => void }) {
  const { m } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => ref.current?.showModal(), [])
  return (
    <dialog
      ref={ref}
      className={styles.zoomDialog}
      onClose={(e) => {
        // Reacts synthetisches close-Event steigt zum äußeren <dialog> auf
        // und würde dort das ganze Buch-Popup schließen (Esc im Zoom).
        e.stopPropagation()
        onClose()
      }}
      onClick={onClose}
      aria-label={m.detail.coverAlt(title)}
    >
      <img
        className={styles.zoomImg}
        src={coverUrl(isbn, failed ? 'M' : 'L')!}
        alt={m.detail.coverAlt(title)}
        onError={() => setFailed(true)}
      />
    </dialog>
  )
}

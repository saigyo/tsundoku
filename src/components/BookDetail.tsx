import { useEffect, useRef, type ReactNode } from 'react'
import { de } from '../i18n/de'
import { fmtInt } from '../lib/format'
import { langLabel } from '../lib/languages'
import type { Book, Filter } from '../lib/types'
import { filterLabel, sameFilter, useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
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

  const chip = (f: Filter, label: string) => {
    const active = filters.some((g) => sameFilter(g, f))
    return (
      <button
        key={label}
        className={active ? styles.tagActive : styles.tag}
        onClick={() => toggleFilter(f)}
        aria-pressed={active}
        aria-label={`Filter ${filterLabel(f)} umschalten`}
      >
        {label}
      </button>
    )
  }
  const chips = (nodes: ReactNode[]) =>
    nodes.length ? <span className={styles.tags}>{nodes}</span> : null

  const rows: [string, ReactNode][] = [
    ['Original', book.originalTitle],
    ['Jahr dieser Ausgabe', book.editionYear === null ? null : String(book.editionYear)],
    ['Sprache', chips(book.languages.map((l) => chip({ kind: 'language', value: l }, langLabel(l, de))))],
    [
      'Originalsprache',
      chips(book.originalLanguages.map((l) => chip({ kind: 'originalLanguage', value: l }, langLabel(l, de)))),
    ],
    ['Seiten', book.pages === null ? null : fmtInt(book.pages)],
    ['Wissensgebiet', book.ddc ? chip({ kind: 'ddcTop', value: book.ddc.top }, book.ddc.topLabel) : null],
    ['Erworben', book.acquiredDate ?? (book.acquiredYear !== null ? String(book.acquiredYear) : null)],
    ['Gelesen', book.readDate ?? (book.readYearEffective !== null ? `${book.readYearEffective} (Jahres-Tag)` : null)],
    ['Bewertung', book.rating !== null ? `★ ${book.rating.toLocaleString('de-DE')}` : null],
    ['Gekauft bei', book.fromWhere],
    ['Reihe', book.series.join(', ') || null],
    ['ISBN', book.isbn],
    ['Tags', chips(book.tagsNorm.map((t) => chip({ kind: 'tag', value: t }, t)))],
  ]

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label={book.title}>
      <h3 className={styles.title}>{book.title}</h3>
      <p className={styles.authors}>
        {book.authors.map((a) => {
          const active = filters.some((f) => f.kind === 'author' && f.value === a.name)
          return (
            <button
              key={a.name}
              className={active ? styles.authorActive : styles.author}
              onClick={() => toggleFilter({ kind: 'author', value: a.name })}
              aria-pressed={active}
              aria-label={`Nach ${a.name} filtern`}
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
      {book.workCode !== null && (
        <p className={styles.ltLink}>
          <a
            href={`https://www.librarything.com/work/${book.workCode}/book/${book.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Auf LibraryThing ansehen ↗
          </a>
        </p>
      )}
      <button className={styles.close} onClick={onClose}>
        Schließen
      </button>
    </dialog>
  )
}

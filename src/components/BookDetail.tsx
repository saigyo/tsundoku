import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { langLabel } from '../lib/languages'
import type { Book, Filter } from '../lib/types'
import { filterLabel, sameFilter, useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { m, fmtInt } = useI18n()
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
    [m.detail.pages, book.pages === null ? null : fmtInt(book.pages)],
    [m.detail.ddc, book.ddc ? chip({ kind: 'ddcTop', value: book.ddc.top }, m.ddc.labels[book.ddc.top]) : null],
    [m.detail.acquired, book.acquiredDate ?? (book.acquiredYear !== null ? String(book.acquiredYear) : null)],
    [m.detail.read, book.readDate ?? (book.readYearEffective !== null ? m.detail.readTagged(book.readYearEffective) : null)],
    [m.detail.rating, book.rating !== null ? `★ ${fmtInt(book.rating)}` : null],
    [m.detail.boughtAt, book.fromWhere],
    [m.detail.series, book.series.join(', ') || null],
    [m.detail.isbn, book.isbn],
    [m.detail.tags, chips(book.tagsNorm.map((t) => chip({ kind: 'tag', value: t }, t)))],
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
      {book.workCode !== null && (
        <p className={styles.ltLink}>
          <a
            href={`https://www.librarything.com/work/${book.workCode}/book/${book.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {m.detail.viewOnLt}
          </a>
        </p>
      )}
      <button className={styles.close} onClick={onClose}>
        {m.detail.close}
      </button>
    </dialog>
  )
}

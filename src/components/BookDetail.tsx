import { useEffect, useRef } from 'react'
import { fmtInt } from '../lib/format'
import type { Book } from '../lib/types'
import { useFilterStore } from '../store/filters'
import styles from './BookDetail.module.css'

export function BookDetail({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const addFilter = useFilterStore((s) => s.addFilter)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (book && !el.open) el.showModal()
    if (!book && el.open) el.close()
  }, [book])

  if (!book) return <dialog ref={ref} />

  const rows: [string, string | null][] = [
    ['Original', book.originalTitle],
    ['Jahr dieser Ausgabe', book.editionYear === null ? null : String(book.editionYear)],
    ['Sprache', book.languages.join(', ') || null],
    ['Originalsprache', book.originalLanguages.join(', ') || null],
    ['Seiten', book.pages === null ? null : fmtInt(book.pages)],
    ['Wissensgebiet', book.ddc?.topLabel ?? null],
    ['Erworben', book.acquiredDate ?? (book.acquiredYear !== null ? String(book.acquiredYear) : null)],
    ['Gelesen', book.readDate ?? (book.readYearEffective !== null ? `${book.readYearEffective} (Jahres-Tag)` : null)],
    ['Bewertung', book.rating !== null ? `★ ${book.rating.toLocaleString('de-DE')}` : null],
    ['Gekauft bei', book.fromWhere],
    ['Reihe', book.series.join(', ') || null],
    ['Tags', book.tagsNorm.join(', ') || null],
    ['ISBN', book.isbn],
  ]

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-label={book.title}>
      <h3 className={styles.title}>{book.title}</h3>
      <p className={styles.authors}>
        {book.authors.map((a) => (
          <button
            key={a.name}
            className={styles.author}
            onClick={() => {
              addFilter({ kind: 'author', value: a.name })
              onClose()
            }}
            aria-label={`Nach ${a.name} filtern`}
          >
            {a.name}
          </button>
        ))}
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

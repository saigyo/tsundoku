import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import type { Book } from '../lib/types'
import styles from './BookListPopup.module.css'

/**
 * Interaktives, nicht-modales Titel-Popup: fest am Jahres-/Zellanker,
 * betretbar, Titelzeilen öffnen die Buch-Detailansicht. Positionierung wie
 * Tooltip (horizontales Umspringen am Fensterrand, useLayoutEffect misst
 * vor dem Paint), zusätzlich vertikale Klemmung in den Viewport (Spec DoD 8).
 */
export function BookListPopup({
  x,
  y,
  header,
  ariaContext,
  books,
  dateOf,
  onSelect,
  onPointerEnter,
  onPointerLeave,
  popupRef,
}: {
  x: number
  y: number
  header: ReactNode
  ariaContext: string
  books: Book[] // bereits sortiert (sortBooksByDate)
  dateOf: (b: Book) => string | null
  onSelect: (b: Book) => void
  onPointerEnter: () => void
  onPointerLeave: () => void
  popupRef: RefObject<HTMLDivElement | null>
}) {
  const { m, fmtNum, locale } = useI18n()
  const listRef = useRef<HTMLUListElement>(null)
  const [shift, setShift] = useState({ dx: 12, dy: 12 })
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = popupRef.current
    if (el === null) return
    const parent = el.offsetParent?.getBoundingClientRect()
    const left = (parent?.left ?? 0) + x
    const top = (parent?.top ?? 0) + y
    const dx = left + 12 + el.offsetWidth > window.innerWidth - 8 ? -el.offsetWidth - 12 : 12
    // Vertikal klemmen statt abschneiden: notfalls über den Anker schieben.
    const dy = Math.min(12, window.innerHeight - 8 - top - el.offsetHeight)
    setShift({ dx, dy })
    const list = listRef.current
    if (list !== null) setOverflows(list.scrollHeight > list.clientHeight)
    // overflows in den Deps: die nachgerückte Fußzeile ändert die Höhe,
    // die Klemmung wird danach einmal neu gemessen.
  }, [x, y, books, overflows, popupRef])

  // ISO-Datum lokal parsen — new Date('YYYY-MM-DD') wäre UTC-Mitternacht
  // und kippte in Zeitzonen westlich von UTC auf den Vortag.
  const fmtDay = (iso: string) => {
    const [yy, mm, dd] = iso.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(
      new Date(yy, mm - 1, dd),
    )
  }

  return (
    <div
      ref={popupRef}
      className={styles.pop}
      style={{ transform: `translate(${x + shift.dx}px, ${y + shift.dy}px)` }}
      role="dialog"
      aria-label={m.bookListPopup.listAria(ariaContext)}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <header className={styles.header}>{header}</header>
      <ul ref={listRef} className={styles.list}>
        {books.map((b) => {
          const d = dateOf(b)
          return (
            <li key={b.id}>
              <button
                className={styles.row}
                onClick={() => onSelect(b)}
                aria-label={m.bookListPopup.openDetailAria(b.title)}
              >
                <span className={styles.date}>{d === null ? '—' : fmtDay(d)}</span>
                <span className={styles.rowTitle}>{b.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {overflows && (
        <div className={styles.foot} aria-hidden="true">
          {m.bookListPopup.scrollHint(fmtNum(books.length))}
        </div>
      )}
    </div>
  )
}

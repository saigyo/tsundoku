import { useEffect, useMemo, useRef, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { BookListPopup } from '../components/BookListPopup'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { canonicalAward } from '../lib/awards'
import { sortBooksByDate } from '../lib/bookListPopup'
import type { Book } from '../lib/types'
import { useBookListPopup } from '../lib/useBookListPopup'
import { useLibraryData } from '../lib/DataContext'
import { canonRows } from '../lib/viewData/canon'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './CanonCheck.module.css'

// Nur per Jahres-Tag als gelesen markierte Titel haben kein readDate — ihr
// Jahr ist trotzdem bekannt und zählt; das nackte „YYYY" sortiert per
// ISO-Stringvergleich vor die datierten Titel desselben Jahres.
const readDateOrTagYear = (b: Book) =>
  b.readDate ?? (b.readYearEffective !== null ? String(b.readYearEffective) : null)

export function CanonCheck() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const addFilter = useFilterStore((s) => s.addFilter)
  const [topN, setTopN] = useState(20)
  const data = useMemo(() => canonRows(filtered, topN), [filtered, topN])
  const wrapRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Book | null>(null)
  // Interaktives Titel-Popup wie in Erwerb & Lektüre / Tag-Trends (Spec
  // „Interaktives Titel-Popup"): Hover über einer Kanon-Zeile listet deren
  // Titel; der Zeilen-Klick bleibt der Award-Filter.
  const { popup, popupRef, hoverAnchor, leaveChart, popupEnter, popupLeave, pin, close } =
    useBookListPopup<{ list: string }>((a, b) => a.list === b.list, selected !== null)

  // Datumsspalte = Lesejahr: die View fragt „besessen vs. gelesen", also
  // stehen die gelesenen Titel chronologisch vorn, Ungelesene („—") folgen
  // alphabetisch. Vor den Early-Returns (Rules of Hooks).
  const popupBooks = useMemo(() => {
    if (popup === null) return []
    return sortBooksByDate(
      filtered.filter((b) => b.awards.some((a) => canonicalAward(a) === popup.anchor.list)),
      readDateOrTagYear,
    )
  }, [popup, filtered])

  // Filterwechsel kann die Liste leeren, ohne dass ein pointerleave feuert.
  useEffect(() => {
    if (popup !== null && popupBooks.length === 0) close()
  }, [popup, popupBooks, close])

  if (filtered.length === 0) return <EmptyState />
  if (data.rows.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        {m.views.canon.noData}
      </CoverageNote>
    )
  }

  const max = data.rows[0].owned
  const hasUnreadFilter = filters.some((f) => sameFilter(f, { kind: 'readStatus', value: 'unread' }))
  const isActive = (list: string) => filters.some((f) => sameFilter(f, { kind: 'award', value: list }))

  // Kopfzeile aus dem Popup-Inhalt selbst statt aus data.rows: nach einem
  // topN- oder Filterwechsel kann die Zeile verschwunden sein, die Bücher
  // des stehenden Popups aber nicht.
  const popupCounts = m.views.canon.counts(
    fmtNum(popupBooks.length),
    fmtNum(popupBooks.filter((b) => b.hasRead).length),
  )

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>{m.views.canon.title}</h2>
        <CoverageNote covered={data.withAwards} total={filtered.length}>
          {m.views.canon.coverage}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          {m.views.canon.showLists}{' '}
          <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
            {[10, 20, 40].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {!hasUnreadFilter && (
          <button
            className={styles.action}
            onClick={() => addFilter({ kind: 'readStatus', value: 'unread' })}
          >
            {m.views.canon.onlyUnread}
          </button>
        )}
      </div>

      <ol className={styles.rows} onPointerLeave={leaveChart}>
        {data.rows.map((r) => (
          <li key={r.list}>
            <button
              className={styles.row}
              aria-pressed={isActive(r.list)}
              onClick={() => toggleFilter({ kind: 'award', value: r.list })}
              onPointerMove={(e) => {
                // Anker am Zeiger wie in der Heatmap: die Zeilen sind flach,
                // eine Zeilenmitte läge zu weit vom Zeiger entfernt.
                const rect = wrapRef.current?.getBoundingClientRect()
                if (rect === undefined) return
                hoverAnchor({ list: r.list }, e.clientX - rect.left, e.clientY - rect.top)
              }}
            >
              <span className={styles.listName}>{r.list}</span>
              <span className={styles.barTrack}>
                <span className={styles.barOwned} style={{ width: `${(r.owned / max) * 100}%` }}>
                  <span
                    className={styles.barRead}
                    style={{ width: `${r.owned === 0 ? 0 : (r.read / r.owned) * 100}%` }}
                  />
                </span>
              </span>
              <span className={styles.counts}>
                {m.views.canon.counts(fmtNum(r.owned), fmtNum(r.read))}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {popup && popupBooks.length > 0 && (
        <BookListPopup
          x={popup.x}
          y={popup.y}
          popupRef={popupRef}
          header={
            <>
              <strong>{popup.anchor.list}</strong>: {popupCounts}
            </>
          }
          ariaContext={`${popup.anchor.list}: ${popupCounts}`}
          books={popupBooks}
          dateOf={readDateOrTagYear}
          dateGranularity="year"
          onSelect={(b) => {
            pin()
            setSelected(b)
          }}
          onPointerEnter={popupEnter}
          onPointerLeave={popupLeave}
        />
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

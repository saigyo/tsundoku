import { useEffect, useMemo, useRef, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { BookListPopup } from '../components/BookListPopup'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { readDateOrTagYear, sortBooksByDate } from '../lib/bookListPopup'
import { GENRE_FICTION, GENRE_NONFICTION, genreLabel, genreMatches, NO_GENRE } from '../lib/genres'
import type { Book } from '../lib/types'
import { useBookListPopup } from '../lib/useBookListPopup'
import { useLibraryData } from '../lib/DataContext'
import { genreRows, type GenreRow } from '../lib/viewData/genres'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './Genres.module.css'

type SortMode = 'owned' | 'rate'

// Popup nur „in der Nähe" von Inhalt auslösen: Label und Zählung treffen
// direkt; am Balken gilt eine seitliche Toleranz, weil kurze Balken sonst
// kaum treffbar wären. Der übrige Leerraum der 1fr-Spur bleibt still —
// sonst erschiene beim Überfahren der Seite ständig ein Popup ohne
// erkennbaren Zeilenbezug.
const BAR_PROXIMITY_PX = 32
function nearRowContent(e: React.PointerEvent<HTMLButtonElement>): boolean {
  const target = e.target instanceof Element ? e.target : null
  if (target !== null && target.closest(`.${styles.listName}, .${styles.counts}`) !== null) return true
  const bar = e.currentTarget.querySelector(`.${styles.barOwned}`)
  if (bar === null) return false
  const r = bar.getBoundingClientRect()
  return e.clientX >= r.left - BAR_PROXIMITY_PX && e.clientX <= r.right + BAR_PROXIMITY_PX
}

export function Genres() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [sort, setSort] = useState<SortMode>('owned')
  const data = useMemo(() => genreRows(filtered), [filtered])
  const wrapRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Book | null>(null)
  // Titel-Popup wie im Kanonabgleich (Spec „Interaktives Titel-Popup"):
  // Hover listet die Titel des Genres, der Zeilen-Klick bleibt der Filter.
  const { popup, popupRef, hoverAnchor, leaveChart, popupEnter, popupLeave, pin, close } =
    useBookListPopup<{ genre: string }>((a, b) => a.genre === b.genre, selected !== null)

  const popupBooks = useMemo(() => {
    if (popup === null) return []
    return sortBooksByDate(
      filtered.filter((b) => genreMatches(b, popup.anchor.genre)),
      readDateOrTagYear,
    )
  }, [popup, filtered])

  // Filterwechsel kann die Liste leeren, ohne dass ein pointerleave feuert.
  useEffect(() => {
    if (popup !== null && popupBooks.length === 0) close()
  }, [popup, popupBooks, close])

  // Quoten-Sortierung in der View, die Grundreihenfolge (Bestand) bleibt
  // im Datenmodul stabil. Sekundärschlüssel Bestand.
  const sortedRows = useMemo(() => {
    if (sort === 'owned') return data.rows
    return [...data.rows].sort(
      (a, z) => z.read / z.owned - a.read / a.owned || z.owned - a.owned,
    )
  }, [data, sort])

  if (filtered.length === 0) return <EmptyState />

  const axisMax = Math.max(...data.axis.map((r) => r.owned), 1)
  const listMax = Math.max(...data.rows.map((r) => r.owned), data.noGenre.owned, 1)
  // Achsenlücke für die Abdeckungsnotiz: nur spezifische Genres, kein
  // Dach/General, kein No Genre (Befund, keine stille Korrektur).
  const noAxis = filtered.filter(
    (b) =>
      !genreMatches(b, GENRE_FICTION) &&
      !genreMatches(b, GENRE_NONFICTION) &&
      !b.genres.includes(NO_GENRE),
  ).length
  const isActive = (g: string) => filters.some((f) => sameFilter(f, { kind: 'genre', value: g }))
  const pct = (r: GenreRow) => (r.owned === 0 ? 0 : Math.round((100 * r.read) / r.owned))

  const row = (r: GenreRow, max: number) => (
    <li key={r.genre}>
      <button
        className={styles.row}
        aria-pressed={isActive(r.genre)}
        onClick={() => toggleFilter({ kind: 'genre', value: r.genre })}
        onPointerMove={(e) => {
          // Anker am Zeiger wie in der Heatmap: die Zeilen sind flach.
          const rect = wrapRef.current?.getBoundingClientRect()
          if (rect === undefined || r.owned === 0 || !nearRowContent(e)) return
          hoverAnchor({ genre: r.genre }, e.clientX - rect.left, e.clientY - rect.top)
        }}
      >
        <span className={styles.listName}>{genreLabel(r.genre, m)}</span>
        <span className={styles.barTrack}>
          <span className={styles.barOwned} style={{ width: `${(r.owned / max) * 100}%` }}>
            <span
              className={styles.barRead}
              style={{ width: `${r.owned === 0 ? 0 : (r.read / r.owned) * 100}%` }}
            />
          </span>
        </span>
        <span className={styles.counts}>
          {/* 0/0 ist keine Quote — ohne Prozentteil (Spec, Entscheidung 6) */}
          {r.owned === 0 ? m.views.canon.counts(fmtNum(r.owned), fmtNum(r.read)) : m.views.genres.counts(fmtNum(r.owned), fmtNum(r.read), fmtNum(pct(r)))}
        </span>
      </button>
    </li>
  )

  const popupCounts =
    popup === null
      ? ''
      : m.views.genres.counts(
          fmtNum(popupBooks.length),
          fmtNum(popupBooks.filter((b) => b.hasRead).length),
          fmtNum(
            popupBooks.length === 0
              ? 0
              : Math.round((100 * popupBooks.filter((b) => b.hasRead).length) / popupBooks.length),
          ),
        )

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>{m.views.genres.title}</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          {m.views.genres.coverage(fmtNum(data.noGenre.owned), fmtNum(noAxis))}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <span>{m.views.genres.sortLabel}</span>
        <button
          className={styles.action}
          aria-pressed={sort === 'owned'}
          onClick={() => setSort('owned')}
        >
          {m.views.genres.sortByOwned}
        </button>
        <button
          className={styles.action}
          aria-pressed={sort === 'rate'}
          onClick={() => setSort('rate')}
        >
          {m.views.genres.sortByRate}
        </button>
      </div>

      {/* Achse: Dach+General zusammengelegt, eigener Maßstab — die
          Summenbalken sind überlappende Mitgliedschaften, keine Anteile. */}
      <ol className={styles.axis} onPointerLeave={leaveChart}>
        {data.axis.map((r) => row(r, axisMax))}
      </ol>

      <ol className={styles.rows} onPointerLeave={leaveChart}>
        {sortedRows.map((r) => row(r, listMax))}
        {data.noGenre.owned > 0 && row(data.noGenre, listMax)}
      </ol>

      {popup && popupBooks.length > 0 && (
        <BookListPopup
          x={popup.x}
          y={popup.y}
          popupRef={popupRef}
          header={
            <>
              <strong>{genreLabel(popup.anchor.genre, m)}</strong>: {popupCounts}
            </>
          }
          ariaContext={`${genreLabel(popup.anchor.genre, m)}: ${popupCounts}`}
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

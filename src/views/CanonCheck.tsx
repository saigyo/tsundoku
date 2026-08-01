import { useMemo, useState } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { canonRows } from '../lib/viewData/canon'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './CanonCheck.module.css'

export function CanonCheck() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const addFilter = useFilterStore((s) => s.addFilter)
  const [topN, setTopN] = useState(20)
  const data = useMemo(() => canonRows(filtered, topN), [filtered, topN])

  if (filtered.length === 0) return <EmptyState />
  if (data.rows.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter stehen auf einer Auszeichnungs- oder Kanonliste.
      </CoverageNote>
    )
  }

  const max = data.rows[0].owned
  const hasUnreadFilter = filters.some((f) => sameFilter(f, { kind: 'readStatus', value: 'unread' }))
  const isActive = (list: string) => filters.some((f) => sameFilter(f, { kind: 'award', value: list }))

  return (
    <div>
      <header className={styles.head}>
        <h2>Kanonabgleich</h2>
        <CoverageNote covered={data.withAwards} total={filtered.length}>
          stehen auf mindestens einer Liste. Angaben sind „im Bestand", nicht „von der
          Liste erledigt" — der Listenumfang ist aus dem Export nicht bekannt.
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Listen anzeigen:{' '}
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
            Nur Ungelesene → Leseliste
          </button>
        )}
      </div>

      <ol className={styles.rows}>
        {data.rows.map((r) => (
          <li key={r.list}>
            <button
              className={styles.row}
              aria-pressed={isActive(r.list)}
              onClick={() => toggleFilter({ kind: 'award', value: r.list })}
              title={r.list}
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
                {fmtInt(r.owned)} im Bestand · {fmtInt(r.read)} gelesen
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

import { useMemo } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { flagLabel } from '../lib/flags'
import { qualityData, tileZone, type TileZone } from '../lib/viewData/quality'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './DataQuality.module.css'

export function DataQuality() {
  const { m, fmtNum, locale } = useI18n()
  const { books, stats, filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const data = useMemo(() => qualityData(filtered), [filtered])
  // Block 4 ist global: rohe Tag-Zahl aus dem GESAMT-Bestand, wie im
  // Import-Bericht (DataUpload) — stats hält nur die normalisierte Facette.
  const rawTagCount = useMemo(() => new Set(books.flatMap((b) => b.tags)).size, [books])
  // Kacheln (Block 1) zeigen eine Nachkommastelle (Spec: 79,6 / 97,0 / …) —
  // fmtNum rundet auf ganze Zahlen, deshalb eigenes Format mit fixer
  // Nachkommastelle im aktuellen Locale.
  const fmtPct1 = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale],
  )

  if (filtered.length === 0) return <EmptyState />

  const q = m.views.quality
  const t = data.tiles
  // Balkenzeilen (Block 2/3) runden weiterhin auf ganze Prozent.
  const pctOf = (n: number, den: number) => (den === 0 ? null : Math.round((100 * n) / den))
  // Kacheln: exakter (ungerundeter) Bruch — sowohl für die Zonen-Zuordnung
  // als auch für die Anzeige. Ein gerundeter Wert dürfte die Zone nicht
  // kippen (79,6 % ist kon/mid, nicht rikyū/good) — diese View darf keine
  // bessere Datenqualität suggerieren als vorliegt.
  const exactPctOf = (n: number, den: number) => (den === 0 ? null : (100 * n) / den)
  const ZONE_CLASS: Record<TileZone, string> = {
    good: styles.zoneGood,
    mid: styles.zoneMid,
    bad: styles.zoneBad,
  }

  // Kachel: großer Prozentwert, Label, Untersatz. Färbung nur Tönung —
  // die Zahl steht immer dabei (Farbe nie alleiniger Träger). Nenner 0
  // (z. B. keine gelesenen Titel nach Filter) -> „—" ohne Zone.
  const tile = (id: string, label: string, n: number, den: number, sub: string, inverted = false) => {
    const pct = exactPctOf(n, den)
    const zone = pct === null ? null : tileZone(pct, inverted)
    return (
      <div key={id} className={`${styles.tile} ${zone !== null ? ZONE_CLASS[zone] : ''}`}>
        <div className={styles.tileValue}>{pct === null ? '—' : q.pct(fmtPct1.format(pct))}</div>
        <div className={styles.tileLabel}>{label}</div>
        <div className={styles.tileSub}>{sub}</div>
      </div>
    )
  }

  const rowCounts = (n: number) =>
    q.rowCounts(fmtNum(n), fmtNum(data.total), fmtNum(pctOf(n, data.total) ?? 0))
  const barWidth = (n: number) => `${data.total === 0 ? 0 : (n / data.total) * 100}%`
  const isActive = (value: string) => filters.some((f) => sameFilter(f, { kind: 'flag', value }))

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h2>{q.title}</h2>
      </header>

      <div className={styles.tiles}>
        {tile('acquired', q.tiles.acquired, t.acquired.direct + t.acquired.proxy, t.acquired.total,
          q.tiles.acquiredParts(fmtNum(t.acquired.direct), fmtNum(t.acquired.proxy), fmtNum(t.acquired.missing)))}
        {tile('readYear', q.tiles.readYear, t.readYear.withYear, t.readYear.read,
          q.tiles.readYearParts(fmtNum(t.readYear.tagOnly)))}
        {tile('bulk', q.tiles.bulk, t.bulk.n, t.bulk.total, q.tiles.bulkNote, true)}
        {tile('dims', q.tiles.dims, t.dims.measured, t.dims.total,
          q.tiles.dimsParts(fmtNum(t.dims.estimated), fmtNum(t.dims.missing)))}
        {tile('rating', q.tiles.rating, t.rating.n, t.rating.total,
          q.tiles.ratingParts(fmtNum(t.rating.n)))}
      </div>

      <h3 className={styles.blockTitle}>{q.coverageTitle}</h3>
      {/* Reine Anzeige ohne Klick-Semantik; die Hover-Tönung gibt es trotzdem —
          sie hält die Zeile bei kurzen Balken optisch zusammen (Spec-Nachtrag). */}
      <ol className={styles.rows}>
        {data.coverage.map((r) => (
          <li key={r.id} className={styles.staticRow}>
            <span className={styles.listName}>{q.fields[r.id]}</span>
            <span className={styles.barTrack}>
              <span className={styles.barOwned} style={{ width: barWidth(r.n) }} />
            </span>
            <span className={styles.counts}>{rowCounts(r.n)}</span>
          </li>
        ))}
      </ol>

      <h3 className={styles.blockTitle}>{q.flagsTitle}</h3>
      <ol className={styles.rows}>
        {data.flags.map((r) => (
          <li key={r.id}>
            <button
              className={styles.row}
              aria-pressed={isActive(r.id)}
              onClick={() => toggleFilter({ kind: 'flag', value: r.id })}
            >
              <span className={styles.listName}>{flagLabel(r.id, m)}</span>
              <span className={styles.barTrack}>
                <span className={styles.barOwned} style={{ width: barWidth(r.n) }} />
              </span>
              <span className={styles.counts}>{rowCounts(r.n)}</span>
            </button>
          </li>
        ))}
      </ol>

      <h3 className={styles.blockTitle}>{q.globalTitle}</h3>
      {/* Bewusst global (stats vom Import) — reagiert nicht auf Filter. */}
      <dl className={styles.global}>
        <div><dt>{q.global.entities}</dt><dd>{fmtNum(stats.entitiesDecoded)}</dd></div>
        <div><dt>{q.global.dimsSorted}</dt><dd>{fmtNum(stats.dimsSorted)}</dd></div>
        <div><dt>{q.global.dimsDiscarded}</dt><dd>{fmtNum(stats.dimsDiscarded)}</dd></div>
        <div><dt>{q.global.dimsEstimated}</dt><dd>{fmtNum(stats.dimsEstimated)}</dd></div>
        <div><dt>{q.global.origLang}</dt><dd>{fmtNum(stats.origLangInferred)}</dd></div>
        <div><dt>{q.global.tags}</dt><dd>{q.global.tagsValue(fmtNum(rawTagCount), fmtNum(stats.tagsNorm.length))}</dd></div>
      </dl>
    </div>
  )
}

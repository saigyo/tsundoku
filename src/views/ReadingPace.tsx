import { scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { isActivationKey } from '../lib/keyboard'
import { langLabel } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { paceData, type PacePoint } from '../lib/viewData/pace'
import styles from './ReadingPace.module.css'

const M = { top: 12, right: 16, bottom: 40, left: 48 }
const RATES = [10, 50, 100] // Seiten pro Tag

export function ReadingPace() {
  const { filtered } = useLibraryData()
  const [facet, setFacet] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => paceData(filtered), [filtered])

  if (filtered.length === 0) return <EmptyState />
  if (data.points.length === 0) {
    return (
      <CoverageNote covered={data.withDays} total={filtered.length}>
        im aktuellen Filter haben Start- und Enddatum (davon <Num>{fmtInt(data.points.length)}</Num> auch
        eine Seitenzahl).
      </CoverageNote>
    )
  }

  const maxPages = Math.max(...data.points.map((p) => p.pages))
  const maxDays = Math.max(...data.points.map((p) => p.days), 1)
  const panels: { lang: string | null; points: PacePoint[] }[] = facet
    ? data.facets.map((f) => ({ lang: f.lang, points: f.points }))
    : [{ lang: null, points: data.points }]
  const panelW = facet ? Math.max(260, Math.floor(width / Math.min(panels.length, 2)) - 16) : width
  const panelH = facet ? 320 : 440

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Lesetempo</h2>
        <CoverageNote covered={data.points.length} total={filtered.length}>
          haben Lesedauer und Seitenzahl — überproportional die bewusst getrackten.{' '}
          {data.discardedNegative > 0 && (
            <><Num>{fmtInt(data.discardedNegative)}</Num> negative Dauern verworfen.</>
          )}
        </CoverageNote>
      </header>
      <label className={styles.facetToggle}>
        <input type="checkbox" checked={facet} onChange={(e) => setFacet(e.target.checked)} />{' '}
        nach Sprache facettieren
      </label>

      <div className={facet ? styles.grid : undefined}>
        {panels.map((panel) => {
          const innerW = panelW - M.left - M.right
          const innerH = panelH - M.top - M.bottom
          const x = scaleSqrt().domain([0, maxPages]).range([0, innerW]).nice()
          const y = scaleSqrt().domain([0, maxDays]).range([innerH, 0]).nice()
          return (
            <figure key={panel.lang ?? 'alle'} className={styles.panel}>
              {panel.lang && (
                <figcaption className={styles.caption}>
                  {langLabel(panel.lang)} · {fmtInt(panel.points.length)}
                </figcaption>
              )}
              <svg
                width={panelW}
                height={panelH}
                role="img"
                aria-label={`Seiten gegen Lesedauer${panel.lang ? `, ${langLabel(panel.lang)}` : ''}`}
              >
                <g transform={`translate(${M.left},${M.top})`}>
                  {RATES.map((rate) => {
                    // Linie tage = seiten / rate, gezeichnet als Polylinie in der Wurzelskala
                    const pts = x
                      .ticks(40)
                      .filter((p) => p / rate <= y.domain()[1])
                      .map((p) => `${x(p)},${y(p / rate)}`)
                    return (
                      <g key={rate}>
                        <polyline points={pts.join(' ')} fill="none" stroke="var(--ink-15)" />
                        <text
                          x={innerW - 4}
                          y={y(Math.min(maxPages / rate, y.domain()[1])) - 4}
                          textAnchor="end"
                          className={styles.rateLabel}
                        >
                          {rate} S./Tag
                        </text>
                      </g>
                    )
                  })}
                  {panel.points.map((p) => (
                    <circle
                      key={p.book.id}
                      cx={x(p.pages)}
                      cy={y(p.days)}
                      r={3.5}
                      className={p.suspect ? styles.dotSuspect : styles.dot}
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.book.title}: ${fmtInt(p.pages)} Seiten in ${fmtInt(p.days)} Tagen`}
                      onClick={() => setSelected(p.book)}
                      onKeyDown={(e) => {
                        if (isActivationKey(e)) {
                          e.preventDefault()
                          setSelected(p.book)
                        }
                      }}
                    >
                      <title>{`${p.book.title} — ${fmtInt(p.pages)} S. / ${fmtInt(p.days)} Tage${p.suspect ? ' (über 100 Tage: offen, ob durchgehend gelesen)' : ''}`}</title>
                    </circle>
                  ))}
                  <AxisBottom y={innerH + 4} ticks={x.ticks(6).map((v) => ({ x: x(v), label: fmtInt(v) }))} />
                  <AxisLeft x={-4} ticks={y.ticks(6).map((v) => ({ y: y(v), label: fmtInt(v) }))} />
                  <text x={innerW / 2} y={innerH + 34} textAnchor="middle" className={styles.axisTitle}>
                    Seiten
                  </text>
                  <text
                    transform={`translate(${-36},${innerH / 2}) rotate(-90)`}
                    textAnchor="middle"
                    className={styles.axisTitle}
                  >
                    Tage
                  </text>
                </g>
              </svg>
            </figure>
          )
        })}
      </div>
      <p className={styles.note}>
        Hohle Punkte: über 100 Tage — offen, ob durchgehend gelesen; nicht als Tempo interpretieren.
      </p>
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

import { scaleLinear } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { useMeasure } from '../lib/useMeasure'
import type { RangeKind } from '../lib/types'
import { axisYear, tagRanking, tagTrendRows, type TagRow, type TrendAxis } from '../lib/viewData/tagTrends'
import { sameFilter, useFilterStore } from '../store/filters'
import styles from './TagTrends.module.css'

const LINES_N = 12
const HEAT_N = 30
const MAX_PINS = 8
const MIN_SUPPORT = 3
const ROW_H = 18
const LINES_H = 320
const M = { top: 8, right: 8, bottom: 26, left: 40 }

/** Kategoriale Linienfarben in Palettennähe; Zuordnung nach sichtbarem Index —
 *  stabil, solange sich die sichtbare Tag-Menge nicht ändert (Spec). */
const TREND_COLORS = [
  '#223a70', '#9e3d3b', '#7a8b4a', '#8a6fae', '#b07d2f', '#3f7d6e',
  '#a4535f', '#54609c', '#867049', '#5b8a9e', '#75584d', '#4a6741',
]

type Mode = 'lines' | 'heat'

export function TagTrends() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const setRange = useFilterStore((s) => s.setRange)
  const [axis, setAxis] = useState<TrendAxis>('acquired')
  const [mode, setMode] = useState<Mode>('lines')
  const [formFrom, setFormFrom] = useState(0)
  const [formTo, setFormTo] = useState(0)
  const [pinned, setPinned] = useState<string[]>([])
  const [hover, setHover] = useState<{ tag: string; year: number; px: number; py: number } | null>(null)
  const [hoverTag, setHoverTag] = useState<string | null>(null)
  const [selRaw, setSelRaw] = useState<{ from: number; to: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null)
  const dragMoved = useRef(false)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const data = useMemo(() => tagTrendRows(filtered, axis), [filtered, axis])

  // Abschnitt: view-lokal (nie setRange — sonst kollabiert die Vergleichsbasis
  // auf den Abschnitt selbst). Roh-Auswahl wird auf die Achse geklemmt;
  // ungültig/leer fällt auf die letzten fünf Jahre zurück.
  const sel = useMemo(() => {
    const ys = data.years
    if (ys.length === 0) return null
    const last = ys[ys.length - 1]
    const fallback = { from: Math.max(ys[0], last - 4), to: last }
    if (selRaw === null) return fallback
    const from = Math.max(ys[0], selRaw.from)
    const to = Math.min(last, selRaw.to)
    return from > to ? fallback : { from, to }
  }, [data.years, selRaw])

  // Das von/bis-Formular ist der globale Gegenspieler zum view-lokalen
  // Abschnitt: Es filtert wirklich (setRange auf der Achsen-Dimension).
  // Aktiver Filter belegt die Felder vor, sonst die volle Achsenspanne
  // (Muster aus AcquisitionReading).
  const axisKind: RangeKind = axis === 'acquired' ? 'acquiredYear' : 'readYear'
  useEffect(() => {
    const r = filters.find((f) => f.kind === axisKind)
    if (r && 'from' in r) {
      setFormFrom(r.from)
      setFormTo(r.to)
    } else if (data.years.length > 0) {
      setFormFrom(data.years[0])
      setFormTo(data.years[data.years.length - 1])
    }
  }, [axisKind, filters, data.years])

  // Sichtbare Zeilen: Top-N des Modus plus gepinnte, in der Sortierung des
  // Gesamtrankings (total desc, dann alphabetisch) — beide Modi identisch.
  const visible = useMemo(() => {
    const top = data.rows.slice(0, mode === 'lines' ? LINES_N : HEAT_N)
    const extra = data.rows.filter((r) => pinned.includes(r.tag) && !top.includes(r))
    return [...top, ...extra].sort((a, z) => z.total - a.total || a.tag.localeCompare(z.tag))
  }, [data.rows, mode, pinned])

  const ranking = useMemo(
    () => (sel === null ? [] : tagRanking(data, sel.from, sel.to, { minSupport: MIN_SUPPORT })),
    [data, sel],
  )

  // Verwaister Hover: Moduswechsel, Pin-Entfernung oder Filterwechsel können
  // die gehoverte Zeile entfernen — und ein Achsen-/Filterwechsel das Jahr
  // oder dessen Zählung — ohne dass ihr pointerleave feuert. Auch eine auf
  // 0 gefallene Kombination löst den Hover: leere Zellen tragen keinen
  // Tooltip (Spec), das gilt ebenso für stehengebliebene.
  useEffect(() => {
    if (hover !== null) {
      const row = visible.find((r) => r.tag === hover.tag)
      if (!row || !data.years.includes(hover.year) || row.counts[hover.year - data.years[0]] === 0)
        setHover(null)
    }
    if (hoverTag !== null && !visible.some((r) => r.tag === hoverTag)) setHoverTag(null)
  }, [visible, data.years, hover, hoverTag])

  // Während des Brushs: Textselektion global aus, Escape bricht ab
  // (Muster aus Timeline/Wissenslandkarte).
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    document.body.style.userSelect = 'none'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.userSelect = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [dragging])

  if (filtered.length === 0) return <EmptyState />
  if (data.years.length === 0 || sel === null) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        {m.views.tagTrends.noData}
      </CoverageNote>
    )
  }

  const t = m.views.tagTrends
  const innerW = Math.max(200, width - M.left - M.right)
  const cellW = innerW / data.years.length
  const xc = (i: number) => i * cellW + cellW / 2
  const yearAt = (px: number) =>
    data.years[Math.max(0, Math.min(data.years.length - 1, Math.floor(px / cellW)))]
  const height = mode === 'lines' ? LINES_H : M.top + visible.length * ROW_H + M.bottom
  const maxCount = Math.max(1, ...visible.flatMap((r) => r.counts))
  const y = scaleLinear().domain([0, maxCount]).range([LINES_H - M.bottom, M.top]).nice()
  const mkLine = line<number>()
    .x((_, i) => xc(i))
    .y((c) => y(c))
    .curve(curveMonotoneX)

  const factorAt = (row: TagRow, yearIdx: number): number => {
    const total = data.totalsPerYear[yearIdx]
    if (total === 0 || row.total === 0) return 1
    return row.counts[yearIdx] / total / (row.total / data.usable)
  }
  const fmtFactor = (f: number) => fmtNum(Math.round(f * 10) / 10)

  const localX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return Math.max(0, Math.min(innerW, clientX - (rect?.left ?? 0) - M.left))
  }
  const tipPos = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    return { px: e.clientX - (rect?.left ?? 0), py: e.clientY - (rect?.top ?? 0) }
  }

  const effHover = hover?.tag ?? hoverTag
  const hoverBooks =
    hover === null
      ? []
      : filtered
          .filter((b) => axisYear(b, axis) === hover.year && b.tagsNorm.includes(hover.tag))
          .map((b) => b.title)
  const hoverRow = hover === null ? null : (visible.find((r) => r.tag === hover.tag) ?? null)

  const tickEvery = Math.max(1, Math.ceil(data.years.length / Math.floor(innerW / 60)))
  const xTicks = data.years
    .filter((yr) => yr % tickEvery === 0)
    .map((yr) => ({ x: xc(data.years.indexOf(yr)), label: String(yr) }))
  const maxLift = ranking.length === 0 ? 1 : ranking[0].lift

  const selRect = (() => {
    const i0 = data.years.indexOf(sel.from)
    const i1 = data.years.indexOf(sel.to)
    return { x: i0 * cellW, w: (i1 - i0 + 1) * cellW }
  })()

  const cellFill = (row: TagRow, i: number): string | null => {
    if (row.counts[i] === 0) return null
    const clamped = Math.max(-1, Math.min(1, Math.log2(factorAt(row, i)) / 2))
    // Neutralzone: nahe lift 1,0 weder Enji noch Kon — belegte Zellen bleiben
    // durch den neutralen Tusche-Ton von leeren unterscheidbar (Spec: Papier
    // = neutral; der Deckkraft-Floor der Farbseiten markiert echte Abweichung).
    if (Math.abs(clamped) < 0.05) return 'rgba(28, 27, 25, 0.08)'
    // Enji = überrepräsentiert, Kon = unterrepräsentiert; |t| skaliert die Deckkraft.
    return clamped >= 0
      ? `rgba(158, 61, 59, ${0.12 + 0.68 * clamped})`
      : `rgba(34, 58, 112, ${0.12 + 0.68 * -clamped})`
  }

  return (
    <div>
      <header className={styles.head}>
        <h2>{t.title}</h2>
        <CoverageNote covered={data.usable} total={filtered.length}>
          {(axis === 'acquired' ? t.coverageAcquired : t.coverageRead)(
            <Num>{fmtNum(filtered.length - data.usable)}</Num>,
            <Num>{fmtNum(data.excluded.yearTags)}</Num>,
            <Num>{fmtNum(data.excluded.status)}</Num>,
            <Num>{fmtNum(data.excluded.seriesMarkers)}</Num>,
          )}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <span className={styles.ctl}>
          {t.axisAria}
          <ToggleSwitch
            value={axis}
            options={[
              { value: 'acquired', label: t.axisAcquired },
              { value: 'read', label: t.axisRead },
            ]}
            onChange={setAxis}
            ariaLabel={t.axisAria}
          />
        </span>
        <span className={styles.ctl}>
          {t.modeAria}
          <ToggleSwitch
            value={mode}
            options={[
              { value: 'lines', label: t.modeLines },
              { value: 'heat', label: t.modeHeatmap },
            ]}
            onChange={setMode}
            ariaLabel={t.modeAria}
          />
        </span>
        <form
          className={styles.rangeForm}
          onSubmit={(e) => {
            e.preventDefault()
            if (formFrom >= 1900 && formTo >= formFrom) setRange(axisKind, formFrom, formTo)
          }}
        >
          <label>
            {m.rangeForm.from}{' '}
            <input
              type="number"
              value={formFrom}
              onChange={(e) => setFormFrom(Number(e.target.value))}
              min={1900}
              max={2100}
            />
          </label>
          <label>
            {m.rangeForm.to}{' '}
            <input
              type="number"
              value={formTo}
              onChange={(e) => setFormTo(Number(e.target.value))}
              min={1900}
              max={2100}
            />
          </label>
          <button type="submit">{m.rangeForm.submit}</button>
        </form>
      </div>

      <div className={styles.panel}>
        <ul className={styles.labels} aria-label={t.labelsAria} style={{ paddingTop: M.top }}>
          {visible.map((r, i) => {
            const active = filters.some((g) => sameFilter(g, { kind: 'tag', value: r.tag }))
            const cls = active ? styles.labelBtnActive : effHover === r.tag ? styles.labelBtnHover : styles.labelBtn
            return (
              <li key={r.tag}>
                <button
                  className={cls}
                  aria-pressed={active}
                  title={t.tagButtonTitle(r.tag, fmtNum(r.total))}
                  onClick={() => toggleFilter({ kind: 'tag', value: r.tag })}
                  onPointerEnter={() => setHoverTag(r.tag)}
                  onPointerLeave={() => setHoverTag(null)}
                >
                  {mode === 'lines' && (
                    <i style={{ background: TREND_COLORS[i % TREND_COLORS.length] }} />
                  )}
                  <span className={styles.labelText}>{r.tag}</span>
                  <span className={styles.labelCount}>{fmtNum(r.total)}</span>
                </button>
                {/* Unpin direkt am Marker: Die Rangliste ist flüchtig (Abschnitt,
                    Filter) — fällt ein gepinntes Tag dort heraus, bleibt der Pin
                    sonst unlösbar. Eigener Button, weil Buttons nicht schachteln;
                    ungepinnte Zeilen tragen einen Platzhalter gleicher Breite,
                    damit die Anzahlen aller Zeilen fluchten. */}
                {pinned.includes(r.tag) ? (
                  <button
                    className={styles.labelUnpin}
                    aria-label={t.unpinAria(r.tag)}
                    title={t.unpinAria(r.tag)}
                    onClick={() => setPinned((p) => p.filter((x) => x !== r.tag))}
                    onPointerEnter={() => setHoverTag(r.tag)}
                    onPointerLeave={() => setHoverTag(null)}
                  >
                    📌
                  </button>
                ) : (
                  <span className={styles.pinSlot} aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>

        <div className={styles.chartWrap} ref={wrapRef}>
          <svg
            width={Math.max(200, width)}
            height={height}
            role="img"
            aria-label={t.svgAria}
            className={styles.brushArea}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              dragMoved.current = false
              const px = localX(e.clientX)
              setDrag({ x0: px, x1: px })
            }}
            onPointerMove={(e) => {
              if (!drag) return
              const px = localX(e.clientX)
              if (!dragMoved.current && Math.abs(px - drag.x0) > 3) {
                dragMoved.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
              }
              setDrag((d) => (d ? { ...d, x1: px } : d))
            }}
            onPointerUp={() => {
              if (drag) {
                // Zug = Bereich, Klick = Einzeljahr; beides bleibt view-lokal.
                const a = yearAt(Math.min(drag.x0, drag.x1))
                const b = yearAt(Math.max(drag.x0, drag.x1))
                setSelRaw(dragMoved.current ? { from: a, to: b } : { from: b, to: b })
              }
              dragMoved.current = false
              setDrag(null)
            }}
          >
            <g transform={`translate(${M.left},0)`}>
              <rect
                x={selRect.x}
                y={M.top}
                width={selRect.w}
                height={height - M.top - M.bottom}
                fill="var(--kon)"
                opacity={0.1}
              />
              {mode === 'lines' ? (
                <>
                  <AxisLeft x={0} ticks={y.ticks(5).map((v) => ({ y: y(v), label: fmtNum(v) }))} />
                  {visible.map((r, i) => {
                    const d = mkLine(r.counts) ?? ''
                    const dim = effHover !== null && effHover !== r.tag
                    return (
                      <g key={r.tag}>
                        <path
                          d={d}
                          fill="none"
                          stroke={TREND_COLORS[i % TREND_COLORS.length]}
                          strokeWidth={1.8}
                          opacity={dim ? 0.25 : 0.9}
                        />
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={12}
                          onPointerMove={(e) => {
                            const yr = yearAt(localX(e.clientX))
                            setHover({ tag: r.tag, year: yr, ...tipPos(e) })
                          }}
                          onPointerLeave={() => setHover(null)}
                        />
                      </g>
                    )
                  })}
                </>
              ) : (
                visible.map((r, ri) => (
                  <g key={r.tag}>
                    {effHover === r.tag && (
                      <rect
                        x={0}
                        y={M.top + ri * ROW_H}
                        width={innerW}
                        height={ROW_H}
                        fill="var(--ink-08)"
                        pointerEvents="none"
                      />
                    )}
                    {data.years.map((yr, i) => {
                      const fill = cellFill(r, i)
                      if (fill === null) return null
                      return (
                        <rect
                          key={yr}
                          x={i * cellW + 0.5}
                          y={M.top + ri * ROW_H + 1}
                          width={Math.max(0.5, cellW - 1)}
                          height={ROW_H - 2}
                          fill={fill}
                          onPointerMove={(e) => setHover({ tag: r.tag, year: yr, ...tipPos(e) })}
                          onPointerLeave={() => setHover(null)}
                        />
                      )
                    })}
                  </g>
                ))
              )}
              {(() => {
                const left = Math.min(...(drag && dragMoved.current ? [drag.x0, drag.x1] : [selRect.x]))
                const right = drag && dragMoved.current ? Math.max(drag.x0, drag.x1) : selRect.x + selRect.w
                const a = drag && dragMoved.current ? yearAt(left) : sel.from
                const b = drag && dragMoved.current ? yearAt(right) : sel.to
                return (
                  <g>
                    {drag && dragMoved.current && (
                      <rect
                        x={left}
                        y={M.top}
                        width={right - left}
                        height={height - M.top - M.bottom}
                        fill="var(--kon)"
                        opacity={0.15}
                      />
                    )}
                    <text x={left - 4} y={M.top + 12} textAnchor="end" className={styles.annotation}>
                      {a}
                    </text>
                    {b !== a && (
                      <text x={right + 4} y={M.top + 12} textAnchor="start" className={styles.annotation}>
                        {b}
                      </text>
                    )}
                  </g>
                )
              })()}
              <AxisBottom ticks={xTicks} y={height - M.bottom + 2} />
            </g>
          </svg>
          {hover && !drag && hoverRow && (
            <Tooltip x={hover.px} y={hover.py}>
              {t.tooltip(
                hover.tag,
                hover.year,
                fmtNum(hoverBooks.length),
                fmtFactor(factorAt(hoverRow, hover.year - data.years[0])),
              )}
              {hoverBooks.length > 0 && (
                <ul className={styles.tipList}>
                  {/* Index als Key: derselbe Titel kann doppelt vorkommen
                      (z. B. Buch + E-Book), die Liste wird je Hover neu
                      aufgebaut und nie umsortiert. */}
                  {hoverBooks.slice(0, 10).map((title, i) => (
                    <li key={i}>{title}</li>
                  ))}
                  {hoverBooks.length > 10 && <li>{t.andMore(fmtNum(hoverBooks.length - 10))}</li>}
                </ul>
              )}
            </Tooltip>
          )}
        </div>
      </div>
      <p className={styles.hint}>{t.hint}</p>

      <section className={styles.ranking}>
        <h3>
          {t.rankingTitle(sel.from, sel.to)}
          <span className={styles.rankingHint}>{t.rankingHint(fmtNum(MIN_SUPPORT))}</span>
        </h3>
        {ranking.length === 0 ? (
          <p className={styles.rankingEmpty}>{t.rankingEmpty}</p>
        ) : (
          <ol className={styles.rankingList}>
            {ranking.map((r) => {
              const active = filters.some((g) => sameFilter(g, { kind: 'tag', value: r.tag }))
              const isPinned = pinned.includes(r.tag)
              const pinFull = !isPinned && pinned.length >= MAX_PINS
              return (
                <li key={r.tag}>
                  <button
                    className={active ? styles.rankTagActive : styles.rankTag}
                    aria-pressed={active}
                    title={t.tagButtonTitle(r.tag, fmtNum(r.total))}
                    onClick={() => toggleFilter({ kind: 'tag', value: r.tag })}
                  >
                    {r.tag}
                  </button>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.bar} style={{ width: `${(r.lift / maxLift) * 100}%` }} />
                  </span>
                  <span className={styles.factor}>{t.factor(fmtFactor(r.lift))}</span>
                  <span className={styles.rankCount}>
                    {t.rankingCount(fmtNum(r.inSlice), fmtNum(r.total))}
                  </span>
                  <button
                    className={isPinned ? styles.pinActive : styles.pin}
                    aria-pressed={isPinned}
                    aria-label={isPinned ? t.unpinAria(r.tag) : t.pinAria(r.tag)}
                    aria-disabled={pinFull || undefined}
                    title={pinFull ? t.pinLimitTitle : undefined}
                    onClick={() => {
                      if (pinFull) return
                      setPinned((p) => (isPinned ? p.filter((x) => x !== r.tag) : [...p, r.tag]))
                    }}
                  >
                    📌
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

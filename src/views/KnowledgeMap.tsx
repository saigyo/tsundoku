import { scaleLinear, scalePoint } from 'd3-scale'
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetWiggle, stackOrderInsideOut, type Series } from 'd3-shape'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AxisBottom } from '../components/Axis'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS, DDC_LABELS } from '../lib/ddc'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { ddcYearMatrix } from '../lib/viewData/knowledge'
import { useFilterStore } from '../store/filters'
import styles from './KnowledgeMap.module.css'

const H = 420
const M = { top: 8, right: 16, bottom: 28, left: 16 }

export function KnowledgeMap() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const setRange = useFilterStore((s) => s.setRange)
  const [mode, setMode] = useState<'absolute' | 'share'>('absolute')
  const [smooth, setSmooth] = useState(false)
  const [hoverClass, setHoverClass] = useState<number | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null)
  const dragMoved = useRef(false)
  const suppressClick = useRef(false)

  // Während des Brushs: Textselektion global aus (die Maus verlässt das SVG,
  // sonst markiert der Browser die Seite) und Escape bricht ohne Filter ab.
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
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => ddcYearMatrix(filtered, { smooth }), [filtered, smooth])

  if (filtered.length === 0) return <EmptyState />
  if (data.years.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben DDC-Code und Erwerbsjahr.
      </CoverageNote>
    )
  }

  const innerW = Math.max(200, width - M.left - M.right)
  const x = scalePoint<number>().domain(data.years).range([0, innerW])
  const stacked: Series<Record<number, number>, number>[] = stack<Record<number, number>, number>()
    .keys(data.classes)
    .offset(mode === 'share' ? stackOffsetExpand : stackOffsetWiggle)
    .order(stackOrderInsideOut)(data.rows)
  const yMin = Math.min(...stacked.flatMap((s) => s.map((d) => d[0])))
  const yMax = Math.max(...stacked.flatMap((s) => s.map((d) => d[1])))
  const y = scaleLinear().domain([yMin, yMax]).range([H - M.bottom, M.top])
  const mkArea = area<[number, number]>()
    .x((_, i) => x(data.years[i]) ?? 0)
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveMonotoneX)

  const yearAt = (px: number) => {
    const n = data.years.length
    if (n === 1) return data.years[0]
    const i = Math.max(0, Math.min(n - 1, Math.round((px / innerW) * (n - 1))))
    return data.years[i]
  }
  const localX = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(innerW, e.clientX - rect.left - M.left))
  }

  const tickEvery = Math.max(1, Math.ceil(data.years.length / Math.floor(innerW / 60)))
  const xTicks = data.years
    .filter((yr) => yr % tickEvery === 0)
    .map((yr) => ({ x: x(yr) ?? 0, label: String(yr) }))

  const classCounts = new Map(
    data.classes.map((c) => [c, data.rows.reduce((s, r) => s + r[c], 0)]),
  )

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Wissenslandkarte</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben DDC-Code und Erwerbsjahr (<Num>{fmtInt(data.withAcquired - data.covered)}</Num> mit
          Erwerbsjahr, aber ohne DDC).
        </CoverageNote>
      </header>

      <div className={styles.controls} role="group" aria-label="Darstellung">
        <label>
          <input type="radio" name="mode" checked={mode === 'absolute'} onChange={() => setMode('absolute')} /> absolut
        </label>
        <label>
          <input type="radio" name="mode" checked={mode === 'share'} onChange={() => setMode('share')} /> Anteile
        </label>
        <label>
          <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> Dreijahresschnitt
        </label>
      </div>

      <svg
        width={width}
        height={H}
        role="img"
        aria-label="DDC-Hauptklassen über Erwerbsjahre"
        className={styles.brushArea}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          dragMoved.current = false
          setDrag({ x0: localX(e), x1: localX(e) })
        }}
        onPointerMove={(e) => {
          if (!drag) return
          const px = localX(e)
          if (!dragMoved.current && Math.abs(px - drag.x0) > 3) {
            dragMoved.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          setDrag((d) => (d ? { ...d, x1: px } : d))
        }}
        onPointerUp={() => {
          // Nur echte Züge filtern den Zeitraum; ein bloßer Klick bleibt der
          // Klassen-Klick auf dem Strom darunter.
          if (drag && dragMoved.current) {
            setRange('acquiredYear', yearAt(Math.min(drag.x0, drag.x1)), yearAt(Math.max(drag.x0, drag.x1)))
          }
          suppressClick.current = dragMoved.current
          dragMoved.current = false
          setDrag(null)
        }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.stopPropagation()
            suppressClick.current = false
          }
        }}
      >
        <g transform={`translate(${M.left},0)`}>
          {stacked.map((s) => (
            <path
              key={s.key}
              d={mkArea(s as unknown as [number, number][]) ?? ''}
              fill={DDC_COLORS[s.key]}
              opacity={hoverClass === null || hoverClass === s.key ? 0.9 : 0.25}
              onPointerEnter={() => setHoverClass(s.key)}
              onPointerLeave={() => setHoverClass(null)}
              onClick={() => toggleFilter({ kind: 'ddcTop', value: s.key })}
            >
              <title>{`${s.key} ${DDC_LABELS[s.key]}: ${fmtInt(Math.round(classCounts.get(s.key) ?? 0))} Titel`}</title>
            </path>
          ))}
          {drag && dragMoved.current && (() => {
            const left = Math.min(drag.x0, drag.x1)
            const right = Math.max(drag.x0, drag.x1)
            return (
              <g>
                <rect x={left} y={M.top} width={right - left} height={H - M.top - M.bottom} fill="var(--kon)" opacity={0.15} />
                <text x={left - 4} y={M.top + 14} textAnchor="end" className={styles.annotation}>
                  {yearAt(left)}
                </text>
                <text x={right + 4} y={M.top + 14} textAnchor="start" className={styles.annotation}>
                  {yearAt(right)}
                </text>
              </g>
            )
          })()}
          <AxisBottom ticks={xTicks} y={H - M.bottom + 2} />
        </g>
      </svg>
      <p className={styles.hint}>
        Zeitraum wählen: horizontal über das Diagramm ziehen filtert nach Erwerbsjahr, Esc bricht die
        Auswahl ab; ein Klick auf einen Strom filtert nach dem Wissensgebiet.
      </p>

      <ul className={styles.legend}>
        {data.classes.map((c) => (
          <li key={c}>
            <button
              className={styles.legendItem}
              onClick={() => toggleFilter({ kind: 'ddcTop', value: c })}
              onPointerEnter={() => setHoverClass(c)}
              onPointerLeave={() => setHoverClass(null)}
            >
              <i style={{ background: DDC_COLORS[c] }} />
              <span className={styles.legendNum}>{c}00</span> {DDC_LABELS[c]}
              <span className={styles.legendCount}>{fmtInt(Math.round(classCounts.get(c) ?? 0))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

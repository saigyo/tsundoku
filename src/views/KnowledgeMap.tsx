import { scaleLinear, scalePoint } from 'd3-scale'
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetWiggle, stackOrderInsideOut, type Series } from 'd3-shape'
import { useMemo, useState } from 'react'
import { AxisBottom } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
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
  const [mode, setMode] = useState<'absolute' | 'share'>('absolute')
  const [smooth, setSmooth] = useState(false)
  const [hoverClass, setHoverClass] = useState<number | null>(null)
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
          haben DDC-Code und Erwerbsjahr ({fmtInt(data.withAcquired - data.covered)} mit
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

      <svg width={width} height={H} role="img" aria-label="DDC-Hauptklassen über Erwerbsjahre">
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
          <AxisBottom ticks={xTicks} y={H - M.bottom + 2} />
        </g>
      </svg>

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

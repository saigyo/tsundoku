import { area, curveMonotoneX } from 'd3-shape'
import { scaleBand, scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { timelineData } from '../lib/viewData/timeline'
import { useFilterStore } from '../store/filters'
import styles from './AcquisitionReading.module.css'

const H = 340
const H2 = 130
const M = { top: 12, right: 16, bottom: 28, left: 48 }

export function AcquisitionReading() {
  const { filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const addFilter = useFilterStore((s) => s.addFilter)
  const data = useMemo(() => timelineData(filtered), [filtered])
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<{ year: number; px: number; py: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number; dim: 'acquiredYear' | 'readYear' } | null>(null)

  if (filtered.length === 0) return <EmptyState />
  if (data.points.length === 0) {
    return (
      <div>
        <CoverageNote covered={0} total={filtered.length}>
          im aktuellen Filter haben ein Erwerbs- oder Lesejahr.
        </CoverageNote>
      </div>
    )
  }

  const innerW = Math.max(200, width - M.left - M.right)
  const years = data.points.map((p) => p.year)
  const x = scaleBand<number>().domain(years).range([0, innerW]).paddingInner(0.15)
  const maxUp = Math.max(...data.points.map((p) => p.acquired), 1)
  const maxDown = Math.max(...data.points.map((p) => p.readDated + p.readTagged), 1)
  const y = scaleLinear().domain([-maxDown, maxUp]).range([H - M.bottom, M.top]).nice()
  const y2 = scaleLinear()
    .domain([0, Math.max(...data.unread.map((u) => u.count), 1)])
    .range([H2 - 24, 8])
    .nice()
  const bw = x.bandwidth()

  const yearAt = (px: number) => {
    const i = Math.max(0, Math.min(years.length - 1, Math.floor((px / innerW) * years.length)))
    return years[i]
  }
  const localX = (e: React.PointerEvent<SVGRectElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left

  const unreadArea = area<{ year: number; count: number }>()
    .x((u) => (x(u.year) ?? 0) + bw / 2)
    .y0(y2(0))
    .y1((u) => y2(u.count))
    .curve(curveMonotoneX)

  const hoverTitles =
    hover === null
      ? []
      : filtered.filter((b) => b.acquiredYear === hover.year).map((b) => b.title)

  const tickEvery = Math.ceil(years.length / Math.floor(innerW / 60))
  const xTicks = years
    .filter((yr) => yr % Math.max(1, tickEvery) === 0)
    .map((yr) => ({ x: (x(yr) ?? 0) + bw / 2, label: String(yr) }))

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Erwerb und Lektüre</h2>
        <CoverageNote covered={data.acquiredKnown} total={filtered.length}>
          haben ein Erwerbsjahr; {fmtInt(data.readKnown)} ein Lesejahr, davon{' '}
          {fmtInt(data.readTaggedOnly)} nur über Jahres-Tags.
        </CoverageNote>
      </header>

      <svg width={width} height={H} className={styles.chart} role="img" aria-label="Erwerb (nach oben) und Lektüre (nach unten) pro Jahr">
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--enji)" opacity="0.25" />
            <line y2="4" stroke="var(--enji)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <g transform={`translate(${M.left},0)`}>
          <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--ink-45)" />
          {data.points.map((p) => {
            const xp = x(p.year) ?? 0
            const readTotal = p.readDated + p.readTagged
            return (
              <g key={p.year}>
                <rect x={xp} y={y(p.acquired)} width={bw} height={y(0) - y(p.acquired)} fill="var(--kon)" />
                <rect x={xp} y={y(0)} width={bw} height={y(-p.readDated) - y(0)} fill="var(--enji)" />
                <rect x={xp} y={y(-p.readDated)} width={bw} height={y(-readTotal) - y(-p.readDated)} fill="url(#hatch)" />
              </g>
            )
          })}
          {data.maxGapYear !== null && (
            <g transform={`translate(${(x(data.maxGapYear) ?? 0) + bw / 2},${M.top})`}>
              <line y2={y(0) - M.top} stroke="var(--sumi)" strokeDasharray="2 3" />
              <text y={-2} textAnchor="middle" className={styles.annotation}>
                größte Schere: {data.maxGapYear}
              </text>
            </g>
          )}
          {drag && (() => {
            const left = Math.min(drag.x0, drag.x1)
            const right = Math.max(drag.x0, drag.x1)
            const a = yearAt(left)
            const b = yearAt(right)
            const color = drag.dim === 'acquiredYear' ? 'var(--kon)' : 'var(--enji)'
            return (
              <g>
                <rect x={left} y={M.top} width={right - left} height={H - M.top - M.bottom} fill={color} opacity={0.15} />
                <text x={left - 4} y={M.top + 14} textAnchor="end" className={styles.annotation}>
                  {a}
                </text>
                {b !== a && (
                  <text x={right + 4} y={M.top + 14} textAnchor="start" className={styles.annotation}>
                    {b}
                  </text>
                )}
                <text x={(left + right) / 2} y={M.top + 14} textAnchor="middle" className={styles.annotation}>
                  {drag.dim === 'acquiredYear' ? 'Erwerb' : 'Lektüre'}
                </text>
              </g>
            )
          })()}
          <AxisBottom ticks={xTicks} y={H - M.bottom + 2} />
          <AxisLeft
            x={0}
            ticks={y.ticks(6).map((v) => ({ y: y(v), label: fmtInt(Math.abs(v)) }))}
          />
          <rect
            x={0}
            y={M.top}
            width={innerW}
            height={H - M.top - M.bottom}
            fill="transparent"
            className={styles.brushArea}
            onPointerDown={(e) => {
              const px = localX(e)
              // Halbebene bestimmt die Dimension: über der Nulllinie Erwerb,
              // darunter Lektüre (Overlay beginnt bei M.top).
              const svgY = e.clientY - e.currentTarget.getBoundingClientRect().top + M.top
              setDrag({ x0: px, x1: px, dim: svgY < y(0) ? 'acquiredYear' : 'readYear' })
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const px = localX(e)
              setDrag((d) => (d ? { ...d, x1: px } : d))
              const wrapRect = wrapRef.current?.getBoundingClientRect()
              setHover({
                year: yearAt(px),
                px: wrapRect ? e.clientX - wrapRect.left : px,
                py: wrapRect ? e.clientY - wrapRect.top : 0,
              })
            }}
            onPointerUp={() => {
              if (drag) {
                const a = yearAt(Math.min(drag.x0, drag.x1))
                const b = yearAt(Math.max(drag.x0, drag.x1))
                setRange(drag.dim, a, b)
              }
              setDrag(null)
            }}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      </svg>

      <svg width={width} height={H2} role="img" aria-label="Ungelesener Bestand, kumulativ">
        <g transform={`translate(${M.left},0)`}>
          <path d={unreadArea(data.unread) ?? ''} fill="var(--ink-08)" stroke="var(--sumi)" strokeWidth={1.5} />
          <AxisLeft x={0} ticks={y2.ticks(3).map((v) => ({ y: y2(v), label: fmtInt(v) }))} />
          <text x={4} y={16} className={styles.panelLabel}>
            ungelesener Bestand (nur Titel mit Erwerbsjahr)
          </text>
        </g>
      </svg>

      <div className={styles.legendRow}>
        <span className={styles.legend}><i className={styles.swatchKon} /> Erwerb</span>
        <span className={styles.legend}><i className={styles.swatchEnji} /> Lektüre (tagesgenau)</span>
        <span className={styles.legend}><i className={styles.swatchHatch} /> Lektüre (Jahres-Tag)</span>
        <button className={styles.action} onClick={() => addFilter({ kind: 'readStatus', value: 'unread' })}>
          Ungelesene filtern
        </button>
      </div>
      <p className={styles.hint}>
        Zeitraum wählen: im Diagramm horizontal ziehen — über der Nulllinie filtert nach Erwerbsjahr,
        darunter nach Lesejahr; ein Klick wählt ein einzelnes Jahr.
      </p>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const from = Number(fd.get('from'))
          const to = Number(fd.get('to'))
          if (from >= 1900 && to >= from) setRange('acquiredYear', from, to)
        }}
      >
        <label>
          von <input name="from" type="number" defaultValue={years[0]} min={1900} max={2100} />
        </label>
        <label>
          bis <input name="to" type="number" defaultValue={years[years.length - 1]} min={1900} max={2100} />
        </label>
        <button type="submit">Zeitraum filtern</button>
      </form>

      {hover && !drag && hoverTitles.length > 0 && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.year}</strong>: {fmtInt(hoverTitles.length)} erworben
          <ul className={styles.tipList}>
            {hoverTitles.slice(0, 10).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {hoverTitles.length > 10 && <li>… und {fmtInt(hoverTitles.length - 10)} weitere</li>}
          </ul>
        </Tooltip>
      )}
    </div>
  )
}

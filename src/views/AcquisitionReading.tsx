import { area, curveMonotoneX } from 'd3-shape'
import { scaleBand, scaleLinear } from 'd3-scale'
import { useEffect, useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { useMeasure } from '../lib/useMeasure'
import { timelineData } from '../lib/viewData/timeline'
import { useFilterStore } from '../store/filters'
import styles from './AcquisitionReading.module.css'

const H = 340
const H2 = 130
const M = { top: 12, right: 16, bottom: 28, left: 48 }

type RangeDim = 'acquiredYear' | 'readYear'

export function AcquisitionReading() {
  const { m, fmtInt } = useI18n()
  const { filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const addFilter = useFilterStore((s) => s.addFilter)
  const filters = useFilterStore((s) => s.filters)
  const data = useMemo(() => timelineData(filtered), [filtered])
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<{ year: number; px: number; py: number } | null>(null)
  const [unreadHover, setUnreadHover] = useState<{ year: number; count: number; px: number; py: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; x1: number; dim: RangeDim } | null>(null)

  // Das von/bis-Formular ist der Tastatur-Zwilling des Brushs: gleiche
  // Dimensionen, gleicher Filter, und es spiegelt den aktiven Zustand.
  const [formDim, setFormDim] = useState<RangeDim>('acquiredYear')
  const [formFrom, setFormFrom] = useState(0)
  const [formTo, setFormTo] = useState(0)
  useEffect(() => {
    const r = filters.find((f) => f.kind === formDim)
    if (r && 'from' in r) {
      setFormFrom(r.from)
      setFormTo(r.to)
    } else if (data.points.length > 0) {
      setFormFrom(data.points[0].year)
      setFormTo(data.points[data.points.length - 1].year)
    }
  }, [formDim, filters, data])

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

  if (filtered.length === 0) return <EmptyState />
  if (data.points.length === 0) {
    return (
      <div>
        <CoverageNote covered={0} total={filtered.length}>
          {m.views.timeline.noYears}
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
        <h2>{m.views.timeline.title}</h2>
        <CoverageNote covered={data.acquiredKnown} total={filtered.length}>
          {m.views.timeline.coverage(<Num>{fmtInt(data.readKnown)}</Num>, <Num>{fmtInt(data.readTaggedOnly)}</Num>)}
        </CoverageNote>
      </header>

      <svg width={width} height={H} className={styles.chart} role="img" aria-label={m.views.timeline.svgAria}>
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
                {m.views.timeline.maxGap(data.maxGapYear)}
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
                  {drag.dim === 'acquiredYear' ? m.views.timeline.brushAcquired : m.views.timeline.brushRead}
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
              e.preventDefault()
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
                setFormDim(drag.dim)
              }
              setDrag(null)
            }}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      </svg>

      <svg width={width} height={H2} className={styles.chart} role="img" aria-label={m.views.timeline.unreadSvgAria}>
        <g transform={`translate(${M.left},0)`}>
          <path d={unreadArea(data.unread) ?? ''} fill="var(--ink-08)" stroke="var(--sumi)" strokeWidth={1.5} />
          <AxisLeft x={0} ticks={y2.ticks(3).map((v) => ({ y: y2(v), label: fmtInt(v) }))} />
          <text x={4} y={16} className={styles.panelLabel}>
            {m.views.timeline.unreadPanelLabel}
          </text>
          {unreadHover && (
            <g transform={`translate(${(x(unreadHover.year) ?? 0) + bw / 2},0)`}>
              <line y1={y2(unreadHover.count)} y2={y2(0)} stroke="var(--ink-45)" strokeDasharray="2 3" />
              <circle cy={y2(unreadHover.count)} r={3.5} fill="var(--enji)" stroke="var(--shironeri)" />
            </g>
          )}
          <rect
            x={0}
            y={0}
            width={innerW}
            height={H2}
            fill="transparent"
            onPointerMove={(e) => {
              const px = e.clientX - e.currentTarget.getBoundingClientRect().left
              const year = yearAt(px)
              const entry = data.unread.find((u) => u.year === year)
              const wrapRect = wrapRef.current?.getBoundingClientRect()
              setUnreadHover(
                entry && wrapRect
                  ? { year, count: entry.count, px: e.clientX - wrapRect.left, py: e.clientY - wrapRect.top }
                  : null,
              )
            }}
            onPointerLeave={() => setUnreadHover(null)}
          />
        </g>
      </svg>

      <div className={styles.legendRow}>
        <span className={styles.legend}><i className={styles.swatchKon} /> {m.views.timeline.legendAcquired}</span>
        <span className={styles.legend}><i className={styles.swatchEnji} /> {m.views.timeline.legendReadDated}</span>
        <span className={styles.legend}><i className={styles.swatchHatch} /> {m.views.timeline.legendReadTagged}</span>
        <button className={styles.action} onClick={() => addFilter({ kind: 'readStatus', value: 'unread' })}>
          {m.views.timeline.filterUnread}
        </button>
      </div>
      <p className={styles.hint}>{m.views.timeline.hint}</p>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          if (formFrom >= 1900 && formTo >= formFrom) setRange(formDim, formFrom, formTo)
        }}
      >
        <select
          value={formDim}
          onChange={(e) => setFormDim(e.target.value as RangeDim)}
          aria-label={m.rangeForm.dimensionAria}
        >
          <option value="acquiredYear">{m.rangeForm.acquired}</option>
          <option value="readYear">{m.rangeForm.read}</option>
        </select>
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

      {hover && !drag && hoverTitles.length > 0 && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.year}</strong>: {m.views.timeline.tooltipAcquired(fmtInt(hoverTitles.length))}
          <ul className={styles.tipList}>
            {hoverTitles.slice(0, 10).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {hoverTitles.length > 10 && <li>{m.views.timeline.andMore(fmtInt(hoverTitles.length - 10))}</li>}
          </ul>
        </Tooltip>
      )}
      {unreadHover && (
        <Tooltip x={unreadHover.px} y={unreadHover.py}>
          <strong>{unreadHover.year}</strong>: {m.views.timeline.tooltipUnread(fmtInt(unreadHover.count))}
        </Tooltip>
      )}
    </div>
  )
}

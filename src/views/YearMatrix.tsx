import { scaleLinear, scaleSqrt } from 'd3-scale'
import { useEffect, useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { useMeasure } from '../lib/useMeasure'
import { yearMatrix } from '../lib/viewData/yearMatrix'
import { useFilterStore } from '../store/filters'
import styles from './YearMatrix.module.css'

const H = 520
const M = { top: 48, right: 64, bottom: 40, left: 56 }

type Hover =
  | { kind: 'cell'; ed: number; acq: number; count: number; px: number; py: number }
  | { kind: 'edYear' | 'acqYear'; year: number; count: number; px: number; py: number }

export function YearMatrix() {
  const { m, fmtNum } = useI18n()
  const { filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const filters = useFilterStore((s) => s.filters)
  const data = useMemo(() => yearMatrix(filtered), [filtered])
  const cellByKey = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of data.cells) m.set(`${c.ed}:${c.acq}`, c.count)
    return m
  }, [data.cells])

  // Das Formular spiegelt den aktiven Filterzustand (auch nach einem Brush);
  // ohne Filter zeigt es die Spannweite der Daten.
  const [formEd, setFormEd] = useState<[number, number]>([0, 0])
  const [formAcq, setFormAcq] = useState<[number, number]>([0, 0])
  useEffect(() => {
    const ed = filters.find((f) => f.kind === 'editionYear')
    const acq = filters.find((f) => f.kind === 'acquiredYear')
    if (ed && 'from' in ed) setFormEd([ed.from, ed.to])
    else if (data.edExtent) setFormEd(data.edExtent)
    if (acq && 'from' in acq) setFormAcq([acq.from, acq.to])
    else if (data.acqExtent) setFormAcq(data.acqExtent)
  }, [filters, data])

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
  if (!data.edExtent || !data.acqExtent) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        {m.views.years.noData}
      </CoverageNote>
    )
  }

  const innerW = Math.max(240, width - M.left - M.right)
  const innerH = H - M.top - M.bottom
  const x = scaleLinear().domain([data.edExtent[0] - 0.5, data.edExtent[1] + 0.5]).range([0, innerW])
  const y = scaleLinear().domain([data.acqExtent[0] - 0.5, data.acqExtent[1] + 0.5]).range([0, innerH])
  const cw = Math.max(1, x(data.edExtent[0] + 0.5) - x(data.edExtent[0] - 0.5) - 1)
  const ch = Math.max(1, y(data.acqExtent[0] + 0.5) - y(data.acqExtent[0] - 0.5) - 1)
  const opacity = scaleSqrt().domain([0, Math.max(1, data.maxCount)]).range([0, 0.95])
  const edMarginalMax = Math.max(...data.edMarginal.values())
  const acqMarginalMax = Math.max(...data.acqMarginal.values())

  const yearAtX = (px: number) => Math.round(x.invert(px))
  const yearAtY = (py: number) => Math.round(y.invert(py))
  const local = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { px: e.clientX - r.left, py: e.clientY - r.top }
  }
  // Tooltip-Position relativ zum Wrapper (dort ist der Tooltip absolut positioniert)
  const hoverPos = (e: React.PointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect()
    return { px: r ? e.clientX - r.left : 0, py: r ? e.clientY - r.top : 0 }
  }

  // Diagonale nur im Überlappungsbereich beider Achsen
  const dMin = Math.max(data.edExtent[0], data.acqExtent[0])
  const dMax = Math.min(data.edExtent[1], data.acqExtent[1])

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>{m.views.years.title}</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          {m.views.years.coverage}
        </CoverageNote>
      </header>
      {data.underflow > 0 && (
        <p className={styles.underflow}>{m.views.years.underflow(fmtNum(data.underflow))}</p>
      )}

      <svg width={width} height={H} className={styles.chart} role="img" aria-label={m.views.years.svgAria}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Randbalken: die unsichtbare Trefferfläche deckt das ganze Band ab,
              damit auch flache Balken per Maus erreichbar sind. Klick filtert
              exakt auf das Jahr; die Tastatur-Alternative ist das Formular unten. */}
          {[...data.edMarginal].map(([yr, n]) => (
            <g key={`em${yr}`}>
              <rect
                x={x(yr - 0.5) + 0.5}
                y={-8 - 32 * (n / edMarginalMax)}
                width={cw}
                height={32 * (n / edMarginalMax)}
                fill={hover?.kind === 'edYear' && hover.year === yr ? 'var(--kon)' : 'var(--ink-45)'}
              />
              <rect
                x={x(yr - 0.5) + 0.5}
                y={-44}
                width={cw}
                height={44}
                fill="transparent"
                className={styles.marginalHit}
                onPointerMove={(e) => setHover({ kind: 'edYear', year: yr, count: n, ...hoverPos(e) })}
                onPointerLeave={() => setHover(null)}
                onClick={() => setRange('editionYear', yr, yr)}
              />
            </g>
          ))}
          {[...data.acqMarginal].map(([yr, n]) => (
            <g key={`am${yr}`}>
              <rect
                x={innerW + 8}
                y={y(yr - 0.5) + 0.5}
                width={44 * (n / acqMarginalMax)}
                height={ch}
                fill={hover?.kind === 'acqYear' && hover.year === yr ? 'var(--kon)' : 'var(--ink-45)'}
              />
              <rect
                x={innerW + 4}
                y={y(yr - 0.5) + 0.5}
                width={52}
                height={ch}
                fill="transparent"
                className={styles.marginalHit}
                onPointerMove={(e) => setHover({ kind: 'acqYear', year: yr, count: n, ...hoverPos(e) })}
                onPointerLeave={() => setHover(null)}
                onClick={() => setRange('acquiredYear', yr, yr)}
              />
            </g>
          ))}
          {data.cells.map((c) => (
            <rect
              key={`${c.ed}:${c.acq}`}
              x={x(c.ed - 0.5) + 0.5}
              y={y(c.acq - 0.5) + 0.5}
              width={cw}
              height={ch}
              fill="var(--kon)"
              fillOpacity={opacity(c.count)}
            />
          ))}
          {dMax >= dMin && (
            <line
              x1={x(dMin - 0.5)} y1={y(dMin - 0.5)} x2={x(dMax + 0.5)} y2={y(dMax + 0.5)}
              stroke="var(--enji)" strokeDasharray="4 3"
            />
          )}
          {drag && (
            <rect
              x={Math.min(drag.x0, drag.x1)}
              y={Math.min(drag.y0, drag.y1)}
              width={Math.abs(drag.x1 - drag.x0)}
              height={Math.abs(drag.y1 - drag.y0)}
              fill="var(--enji)"
              opacity={0.15}
              stroke="var(--enji)"
            />
          )}
          <AxisBottom
            y={innerH + 4}
            ticks={x.ticks(Math.floor(innerW / 70)).map((v) => ({ x: x(v), label: String(v) }))}
          />
          <AxisLeft
            x={-4}
            ticks={y.ticks(8).map((v) => ({ y: y(v), label: String(v) }))}
          />
          <text x={innerW / 2} y={innerH + 36} textAnchor="middle" className={styles.axisTitle}>
            {m.views.years.axisEdition}
          </text>
          <text transform={`translate(${-40},${innerH / 2}) rotate(-90)`} textAnchor="middle" className={styles.axisTitle}>
            {m.views.years.axisAcquired}
          </text>
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            className={styles.brushArea}
            onPointerDown={(e) => {
              e.preventDefault()
              const { px, py } = local(e)
              setDrag({ x0: px, y0: py, x1: px, y1: py })
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const { px, py } = local(e)
              if (drag) setDrag({ ...drag, x1: px, y1: py })

              const ed = yearAtX(px)
              const acq = yearAtY(py)
              const count = cellByKey.get(`${ed}:${acq}`)
              if (count === undefined) {
                setHover(null)
                return
              }
              setHover({ kind: 'cell', ed, acq, count, ...hoverPos(e) })
            }}
            onPointerLeave={() => setHover(null)}
            onPointerUp={() => {
              if (drag) {
                setRange('editionYear', yearAtX(Math.min(drag.x0, drag.x1)), yearAtX(Math.max(drag.x0, drag.x1)))
                setRange('acquiredYear', yearAtY(Math.min(drag.y0, drag.y1)), yearAtY(Math.max(drag.y0, drag.y1)))
              }
              setDrag(null)
            }}
          />
        </g>
      </svg>

      <form
        className={styles.rangeForm}
        onSubmit={(e) => {
          e.preventDefault()
          if (formEd[0] >= 1900 && formEd[1] >= formEd[0]) setRange('editionYear', formEd[0], formEd[1])
          if (formAcq[0] >= 1900 && formAcq[1] >= formAcq[0]) setRange('acquiredYear', formAcq[0], formAcq[1])
        }}
      >
        <span>{m.views.years.edition}</span>
        <input
          type="number"
          value={formEd[0]}
          onChange={(e) => setFormEd([Number(e.target.value), formEd[1]])}
          aria-label={m.views.years.edFromAria}
        />
        <input
          type="number"
          value={formEd[1]}
          onChange={(e) => setFormEd([formEd[0], Number(e.target.value)])}
          aria-label={m.views.years.edToAria}
        />
        <span>{m.views.years.acquired}</span>
        <input
          type="number"
          value={formAcq[0]}
          onChange={(e) => setFormAcq([Number(e.target.value), formAcq[1]])}
          aria-label={m.views.years.acqFromAria}
        />
        <input
          type="number"
          value={formAcq[1]}
          onChange={(e) => setFormAcq([formAcq[0], Number(e.target.value)])}
          aria-label={m.views.years.acqToAria}
        />
        <button type="submit">{m.views.years.submit}</button>
      </form>

      {hover && !drag && (
        <Tooltip x={hover.px} y={hover.py}>
          {hover.kind === 'cell'
            ? m.views.years.tooltip(hover.ed, hover.acq, fmtNum(hover.count))
            : hover.kind === 'edYear'
              ? m.views.years.tooltipEdition(hover.year, fmtNum(hover.count))
              : m.views.years.tooltipAcquired(hover.year, fmtNum(hover.count))}
        </Tooltip>
      )}
    </div>
  )
}

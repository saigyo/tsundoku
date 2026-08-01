import { scaleLinear, scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { AxisBottom, AxisLeft } from '../components/Axis'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { yearMatrix } from '../lib/viewData/yearMatrix'
import { useFilterStore } from '../store/filters'
import styles from './YearMatrix.module.css'

const H = 520
const M = { top: 48, right: 64, bottom: 40, left: 56 }

export function YearMatrix() {
  const { filtered } = useLibraryData()
  const setRange = useFilterStore((s) => s.setRange)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [hover, setHover] = useState<{ ed: number; acq: number; count: number; px: number; py: number } | null>(
    null,
  )
  const data = useMemo(() => yearMatrix(filtered), [filtered])
  const cellByKey = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of data.cells) m.set(`${c.ed}:${c.acq}`, c.count)
    return m
  }, [data.cells])

  if (filtered.length === 0) return <EmptyState />
  if (!data.edExtent || !data.acqExtent) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben Ausgabe- und Erwerbsjahr (ab 1900).
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

  // Diagonale nur im Überlappungsbereich beider Achsen
  const dMin = Math.max(data.edExtent[0], data.acqExtent[0])
  const dMax = Math.min(data.edExtent[1], data.acqExtent[1])

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Ausgabejahr gegen Erwerbsjahr</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben beide Jahre. Achtung: das ist das Jahr <em>dieser Ausgabe</em>, nicht des
          Werks — eine Reclam-Sophokles-Ausgabe zählt als 1998.
        </CoverageNote>
      </header>
      {data.underflow > 0 && (
        <p className={styles.underflow}>{fmtInt(data.underflow)} Ausgaben vor 1900 nicht dargestellt.</p>
      )}

      <svg width={width} height={H} role="img" aria-label="Heatmap Ausgabejahr × Erwerbsjahr">
        <g transform={`translate(${M.left},${M.top})`}>
          {[...data.edMarginal].map(([yr, n]) => (
            <rect
              key={`em${yr}`}
              x={x(yr - 0.5) + 0.5}
              y={-8 - 32 * (n / edMarginalMax)}
              width={cw}
              height={32 * (n / edMarginalMax)}
              fill="var(--ink-45)"
            />
          ))}
          {[...data.acqMarginal].map(([yr, n]) => (
            <rect
              key={`am${yr}`}
              x={innerW + 8}
              y={y(yr - 0.5) + 0.5}
              width={44 * (n / acqMarginalMax)}
              height={ch}
              fill="var(--ink-45)"
            />
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
            Jahr dieser Ausgabe →
          </text>
          <text transform={`translate(${-40},${innerH / 2}) rotate(-90)`} textAnchor="middle" className={styles.axisTitle}>
            Erwerbsjahr →
          </text>
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerDown={(e) => {
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
              const wrapRect = wrapRef.current?.getBoundingClientRect()
              setHover({
                ed,
                acq,
                count,
                px: wrapRect ? e.clientX - wrapRect.left : px,
                py: wrapRect ? e.clientY - wrapRect.top : py,
              })
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
          const fd = new FormData(e.currentTarget)
          const ef = Number(fd.get('ef')); const et = Number(fd.get('et'))
          const af = Number(fd.get('af')); const at = Number(fd.get('at'))
          if (ef >= 1900 && et >= ef) setRange('editionYear', ef, et)
          if (af >= 1900 && at >= af) setRange('acquiredYear', af, at)
        }}
      >
        <span>Ausgabe</span>
        <input name="ef" type="number" defaultValue={data.edExtent[0]} aria-label="Ausgabejahr von" />
        <input name="et" type="number" defaultValue={data.edExtent[1]} aria-label="Ausgabejahr bis" />
        <span>Erwerb</span>
        <input name="af" type="number" defaultValue={data.acqExtent[0]} aria-label="Erwerbsjahr von" />
        <input name="at" type="number" defaultValue={data.acqExtent[1]} aria-label="Erwerbsjahr bis" />
        <button type="submit">Bereich filtern</button>
      </form>

      {hover && (
        <Tooltip x={hover.px} y={hover.py}>
          Ausgabe {hover.ed}, erworben {hover.acq}: {fmtInt(hover.count)} Titel
        </Tooltip>
      )}
    </div>
  )
}

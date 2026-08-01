import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS, DDC_SHORT } from '../lib/ddc'
import { fmtInt } from '../lib/format'
import { isActivationKey } from '../lib/keyboard'
import { langLabel, LANG_COLORS } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { shelfLayout, type ShelfSort } from '../lib/viewData/shelf'
import styles from './Shelf.module.css'

type ColorMode = 'ddc' | 'language' | 'readStatus' | 'acquiredYear'

const NEUTRAL = '#b9b2a5'

const SORT_LABELS: Record<ShelfSort, string> = {
  acquired: 'Erwerb', author: 'Autor·in', height: 'Höhe', ddc: 'Wissensgebiet',
}
const COLOR_LABELS: Record<ColorMode, string> = {
  ddc: 'Wissensgebiet', language: 'Sprache', readStatus: 'Lesestatus', acquiredYear: 'Erwerbsjahr',
}

export function Shelf() {
  const { filtered } = useLibraryData()
  const [sort, setSort] = useState<ShelfSort>('acquired')
  const [color, setColor] = useState<ColorMode>('ddc')
  const [selected, setSelected] = useState<Book | null>(null)
  const [hover, setHover] = useState<{ book: Book; px: number; py: number } | null>(null)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const layout = useMemo(
    () => shelfLayout(filtered, { sort, rowWidth: Math.max(320, width) }),
    [filtered, sort, width],
  )

  const yearScale = useMemo(() => {
    const years = layout.placed
      .map((p) => p.book.acquiredYear)
      .filter((y): y is number => y !== null)
    return scaleLinear<string>()
      .domain([Math.min(...years, 1991), Math.max(...years, 2026)])
      .range(['#cfc7b4', '#223a70'])
  }, [layout])

  if (filtered.length === 0) return <EmptyState />

  const fill = (b: Book): string => {
    switch (color) {
      case 'ddc': return b.ddc ? DDC_COLORS[b.ddc.top] : NEUTRAL
      case 'language': return LANG_COLORS[b.languages[0] ?? ''] ?? NEUTRAL
      case 'readStatus': return b.hasRead ? 'var(--kon)' : 'var(--paper)'
      case 'acquiredYear': return b.acquiredYear !== null ? yearScale(b.acquiredYear) : NEUTRAL
    }
  }
  // Farbe nie alleiniger Träger: ungelesen bekommt zusätzlich eine Kontur.
  const stroke = (b: Book) =>
    color === 'readStatus' && !b.hasRead ? 'var(--sumi)' : 'none'

  const legend = buildLegend(color, layout.placed.map((p) => p.book), yearScale)
  const estimatedCount = layout.placed.filter((p) => p.book.physicalEstimated).length

  const open = (b: Book) => setSelected(b)
  const onSpineKeyDown = (b: Book) => (e: React.KeyboardEvent) => {
    if (isActivationKey(e)) {
      e.preventDefault()
      open(b)
    }
  }
  const spineLabel = (b: Book) =>
    `${b.title}${b.primaryAuthor ? ` — ${b.primaryAuthor}` : ''}${b.physicalEstimated ? ' (Maße geschätzt)' : ''}`
  // Tooltip-Koordinaten relativ zu .wrap — dort positioniert <Tooltip> absolut.
  const hoverAt = (b: Book) => (e: React.PointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setHover({ book: b, px: e.clientX - r.left, py: e.clientY - r.top })
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Das Regal</h2>
        <CoverageNote covered={layout.placed.length} total={filtered.length}>
          stehen im Regal — davon <Num>{fmtInt(estimatedCount)}</Num> mit aus der Seitenzahl geschätzten
          Maßen (halbtransparent, gestrichelte Kontur). <Num>{fmtInt(layout.unmeasured.length)}</Num> ohne
          Maße und Seitenzahl unten, <Num>{fmtInt(layout.nonBooks)}</Num> Nicht-Bücher nicht dargestellt.
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Sortierung{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as ShelfSort)}>
            {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          Farbe{' '}
          <select value={color} onChange={(e) => setColor(e.target.value as ColorMode)}>
            {Object.entries(COLOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <svg width={width} height={layout.totalHeight + 4} role="img" aria-label={`Regal mit ${layout.placed.length} Büchern`}>
        {layout.placed.map((p) => (
          <g key={p.book.id} className={styles.spine} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
            <rect
              width={p.w}
              height={p.h}
              fill={fill(p.book)}
              fillOpacity={p.book.physicalEstimated ? 0.5 : 1}
              stroke={p.book.physicalEstimated && stroke(p.book) === 'none' ? 'var(--ink-45)' : stroke(p.book)}
              strokeDasharray={p.book.physicalEstimated ? '3 2' : undefined}
              strokeWidth={1}
              tabIndex={0}
              role="button"
              aria-label={spineLabel(p.book)}
              onClick={() => open(p.book)}
              onKeyDown={onSpineKeyDown(p.book)}
              onPointerEnter={hoverAt(p.book)}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {layout.unmeasured.length > 0 && (() => {
        // 8-px-Rücken im 11-px-Raster: klein genug für hunderte Slots,
        // groß genug zum Treffen mit Maus und Finger.
        const slotW = 8
        const pitchX = 11
        const slotH = 72
        const pitchY = 80
        const perRow = Math.max(1, Math.floor(Math.max(320, width) / pitchX))
        const rowCount = Math.ceil(layout.unmeasured.length / perRow)
        return (
          <section aria-label="Bücher ohne Maßangaben">
            <h3 className={styles.unmeasuredTitle}>
              ohne Maße und ohne Seitenzahl zur Schätzung ({fmtInt(layout.unmeasured.length)}) —
              Einheitsgröße, nicht maßstäblich
            </h3>
            <svg width={width} height={rowCount * pitchY + 4}>
              {layout.unmeasured.map((b, i) => (
                <rect
                  key={b.id}
                  x={(i % perRow) * pitchX}
                  y={Math.floor(i / perRow) * pitchY}
                  width={slotW}
                  height={slotH}
                  fill={fill(b)}
                  stroke="var(--ink-45)"
                  strokeDasharray="2 2"
                  strokeWidth={0.5}
                  tabIndex={0}
                  role="button"
                  aria-label={spineLabel(b)}
                  onClick={() => open(b)}
                  onKeyDown={onSpineKeyDown(b)}
                  onPointerEnter={hoverAt(b)}
                  onPointerLeave={() => setHover(null)}
                />
              ))}
            </svg>
          </section>
        )
      })()}

      <ul className={styles.legend} aria-label="Farblegende">
        {legend.map((l) => (
          <li key={l.label}>
            <i style={{ background: l.color, borderColor: 'var(--ink-45)' }} /> {l.label}{' '}
            <span className={styles.legendCount}>{fmtInt(l.count)}</span>
          </li>
        ))}
      </ul>

      {hover && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.book.title}</strong>
          {hover.book.primaryAuthor && <> — {hover.book.primaryAuthor}</>}
          {hover.book.physicalEstimated && <> · Maße geschätzt</>}
        </Tooltip>
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function buildLegend(
  mode: ColorMode,
  books: Book[],
  yearScale: (y: number) => string,
): { label: string; color: string; count: number }[] {
  const add = (m: Map<string, { color: string; count: number }>, label: string, color: string) => {
    const e = m.get(label)
    if (e) e.count += 1
    else m.set(label, { color, count: 1 })
  }
  const m = new Map<string, { color: string; count: number }>()
  for (const b of books) {
    switch (mode) {
      case 'ddc':
        add(m, b.ddc ? DDC_SHORT[b.ddc.top] : 'ohne Angabe', b.ddc ? DDC_COLORS[b.ddc.top] : NEUTRAL)
        break
      case 'language':
        add(m, b.languages[0] ? langLabel(b.languages[0]) : 'ohne Angabe', LANG_COLORS[b.languages[0] ?? ''] ?? NEUTRAL)
        break
      case 'readStatus':
        add(m, b.hasRead ? 'gelesen' : 'ungelesen (Kontur)', b.hasRead ? '#223a70' : '#f4efe6')
        break
      case 'acquiredYear': {
        // Dekaden bekommen einen Swatch aus dem tatsächlichen Jahresverlauf
        // (Farbe am Dekaden-Mittelpunkt), sonst wäre die Legende ohne Farbwert nutzlos.
        if (b.acquiredYear === null) {
          add(m, 'ohne Erwerbsjahr', NEUTRAL)
        } else {
          const decade = Math.floor(b.acquiredYear / 10) * 10
          add(m, `${decade}er`, yearScale(decade + 5))
        }
        break
      }
    }
  }
  return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}

import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS, DDC_SHORT } from '../lib/ddc'
import { fmtInt } from '../lib/format'
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

  const legend = buildLegend(color, layout.placed.map((p) => p.book))

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>Das Regal</h2>
        <CoverageNote covered={layout.placed.length} total={filtered.length}>
          sind Bücher mit Höhen- und Dickenangabe und stehen maßstabsgetreu im Regal
          ({fmtInt(layout.unmeasured.length)} ohne Maße unten, {fmtInt(layout.nonBooks)} Nicht-Bücher
          nicht dargestellt).
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
              stroke={stroke(p.book)}
              strokeWidth={1}
              tabIndex={-1}
              onClick={() => setSelected(p.book)}
              onPointerEnter={(e) => {
                const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                setHover({ book: p.book, px: e.clientX - r.left, py: e.clientY - r.top })
              }}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {layout.unmeasured.length > 0 && (
        <section aria-label="Bücher ohne Maßangaben">
          <h3 className={styles.unmeasuredTitle}>
            ohne Maßangaben ({fmtInt(layout.unmeasured.length)}) — Einheitsgröße, nicht maßstäblich
          </h3>
          <svg width={width} height={64}>
            {layout.unmeasured.map((b, i) => {
              const perRow = Math.floor(Math.max(320, width) / 5)
              return (
                <rect
                  key={b.id}
                  x={(i % perRow) * 5}
                  y={(Math.floor(i / perRow)) * 60}
                  width={4}
                  height={56}
                  fill={fill(b)}
                  stroke="var(--ink-45)"
                  strokeDasharray="2 2"
                  strokeWidth={0.5}
                  onClick={() => setSelected(b)}
                >
                  <title>{b.title}</title>
                </rect>
              )
            })}
          </svg>
        </section>
      )}

      <ul className={styles.legend} aria-label="Farblegende">
        {legend.map((l) => (
          <li key={l.label}>
            <i style={{ background: l.color, borderColor: 'var(--ink-45)' }} /> {l.label}{' '}
            <span className={styles.legendCount}>{fmtInt(l.count)}</span>
          </li>
        ))}
      </ul>

      {hover && (
        <Tooltip x={hover.px} y={hover.py + 140}>
          <strong>{hover.book.title}</strong>
          {hover.book.primaryAuthor && <> — {hover.book.primaryAuthor}</>}
        </Tooltip>
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function buildLegend(mode: ColorMode, books: Book[]): { label: string; color: string; count: number }[] {
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
      case 'acquiredYear':
        add(m, b.acquiredYear === null ? 'ohne Erwerbsjahr' : `${Math.floor(b.acquiredYear / 10) * 10}er`, NEUTRAL)
        break
    }
  }
  return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count)
}

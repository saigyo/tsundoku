import { scaleLinear } from 'd3-scale'
import { useMemo, useState } from 'react'
import { BookDetail } from '../components/BookDetail'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { Tooltip } from '../components/Tooltip'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { DDC_COLORS } from '../lib/ddc'
import { isActivationKey } from '../lib/keyboard'
import { LANG_COLORS } from '../lib/languages'
import type { Book } from '../lib/types'
import { useMeasure } from '../lib/useMeasure'
import { shelfLayout, type ShelfSort } from '../lib/viewData/shelf'
import { LEGEND_KIND, NEUTRAL, shelfLegend, type ColorMode } from '../lib/viewData/shelfLegend'
import { filterBooks, filterKey, sameFilter, useFilterStore } from '../store/filters'
import styles from './Shelf.module.css'

export function Shelf() {
  const { m, fmtNum } = useI18n()
  const { books, filtered } = useLibraryData()
  const filters = useFilterStore((s) => s.filters)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
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
      .map((p) => p.book.acquiredYearEffective)
      .filter((y): y is number => y !== null)
    // clamp: Dekaden aus der Ausschlussmenge können außerhalb der Domain
    // liegen — ohne Klemme extrapolierte Farben außerhalb der Palette.
    return scaleLinear<string>()
      .domain([Math.min(...years, 1991), Math.max(...years, 2026)])
      .range(['#cfc7b4', '#223a70'])
      .clamp(true)
  }, [layout])

  // Ausschluss-Semantik: Die Legende zählt ohne die Filter ihrer eigenen
  // Dimension, sonst verschwänden beim Anklicken einer Kategorie alle
  // Geschwistereinträge (s. Spec). Population = alles, was die Ansicht
  // einfärbt: Regal plus „ohne Maße"-Block (mediaType 'book').
  const legendBooks = useMemo(
    () =>
      filterBooks(books, filters.filter((f) => f.kind !== LEGEND_KIND[color])).filter(
        (b) => b.mediaType === 'book',
      ),
    [books, filters, color],
  )

  // Kategorien aus dem Gesamtbestand der Ansicht — leere bleiben sichtbar (Spec)
  const shelfPopulation = useMemo(() => books.filter((b) => b.mediaType === 'book'), [books])

  // Memoisiert: Hover-State rendert das Regal bei jeder Mausbewegung neu —
  // die Legende über die volle Population soll dabei nicht mitrechnen.
  const legend = useMemo(
    () => shelfLegend(color, shelfPopulation, legendBooks, yearScale, m),
    [color, shelfPopulation, legendBooks, yearScale, m],
  )

  if (filtered.length === 0) return <EmptyState />

  const fill = (b: Book): string => {
    switch (color) {
      case 'ddc': return b.ddc ? DDC_COLORS[b.ddc.top] : NEUTRAL
      case 'language': return LANG_COLORS[b.languages[0] ?? ''] ?? NEUTRAL
      case 'readStatus': return b.hasRead ? 'var(--kon)' : 'var(--paper)'
      case 'acquiredYear': return b.acquiredYearEffective !== null ? yearScale(b.acquiredYearEffective) : NEUTRAL
    }
  }
  // Farbe nie alleiniger Träger: ungelesen bekommt zusätzlich eine Kontur.
  const stroke = (b: Book) =>
    color === 'readStatus' && !b.hasRead ? 'var(--sumi)' : 'none'

  const estimatedCount = layout.placed.filter((p) => p.book.physicalEstimated).length

  const open = (b: Book) => setSelected(b)
  const onSpineKeyDown = (b: Book) => (e: React.KeyboardEvent) => {
    if (isActivationKey(e)) {
      e.preventDefault()
      open(b)
    }
  }
  const spineLabel = (b: Book) =>
    `${b.title}${b.primaryAuthor ? ` — ${b.primaryAuthor}` : ''}${b.physicalEstimated ? m.views.shelf.estimatedSuffix : ''}`
  // Tooltip-Koordinaten relativ zu .wrap — dort positioniert <Tooltip> absolut.
  const hoverAt = (b: Book) => (e: React.PointerEvent) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setHover({ book: b, px: e.clientX - r.left, py: e.clientY - r.top })
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.head}>
        <h2>{m.views.shelf.title}</h2>
        <CoverageNote covered={layout.placed.length} total={filtered.length}>
          {m.views.shelf.coverage(
            <Num>{fmtNum(estimatedCount)}</Num>,
            <Num>{fmtNum(layout.unmeasured.length)}</Num>,
            <Num>{fmtNum(layout.nonBooks)}</Num>,
          )}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          {m.views.shelf.sort}{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as ShelfSort)}>
            {Object.entries(m.views.shelf.sortLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          {m.views.shelf.color}{' '}
          <select value={color} onChange={(e) => setColor(e.target.value as ColorMode)}>
            {Object.entries(m.views.shelf.colorLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      <ul className={styles.legend} aria-label={m.views.shelf.legendAria}>
        {legend.map((l) => {
          const f = l.filter
          const isActive = f !== null && filters.some((g) => sameFilter(g, f))
          const body = (
            <>
              <i style={{ background: l.color, borderColor: 'var(--ink-45)' }} /> {l.label}{' '}
              <span className={styles.legendCount}>{fmtNum(l.count)}</span>
            </>
          )
          return (
            <li key={f !== null ? filterKey(f) : 'missing'}>
              {f !== null ? (
                <button
                  className={isActive ? styles.legendBtnActive : styles.legendBtn}
                  aria-pressed={isActive}
                  onClick={() => toggleFilter(f)}
                >
                  {body}
                </button>
              ) : (
                <span className={styles.legendPassive}>{body}</span>
              )}
            </li>
          )
        })}
      </ul>

      <svg width={width} height={layout.totalHeight + 4} role="img" aria-label={m.views.shelf.svgAria(fmtNum(layout.placed.length))}>
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
          <section aria-label={m.views.shelf.unmeasuredAria}>
            <h3 className={styles.unmeasuredTitle}>
              {m.views.shelf.unmeasuredTitle(fmtNum(layout.unmeasured.length))}
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

      {hover && (
        <Tooltip x={hover.px} y={hover.py}>
          <strong>{hover.book.title}</strong>
          {hover.book.primaryAuthor && <> — {hover.book.primaryAuthor}</>}
          {hover.book.physicalEstimated && <> · {m.views.shelf.estimatedShort}</>}
        </Tooltip>
      )}
      <BookDetail book={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

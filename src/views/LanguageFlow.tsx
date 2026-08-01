import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useEffect, useMemo, useState } from 'react'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { de } from '../i18n/de'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { isActivationKey } from '../lib/keyboard'
import { langLabel, LANG_COLORS, OTHER_LANG, UNKNOWN_LANG } from '../lib/languages'
import { useMeasure } from '../lib/useMeasure'
import { languageFlows, type FlowLink, type FlowNode } from '../lib/viewData/languageFlows'
import { useFilterStore } from '../store/filters'
import styles from './LanguageFlow.module.css'

const H = 480
// bottom reserviert einen Streifen für die Seitenbeschriftungen, damit sie
// nicht mit den untersten Knoten-Labels des Sankeys kollidieren.
const M = { top: 8, right: 140, bottom: 34, left: 140 }

type SNode = SankeyNode<FlowNode, FlowLink>
type SLink = SankeyLink<FlowNode, FlowLink>
type RangeDim = 'acquiredYear' | 'readYear'

export function LanguageFlow() {
  const { filtered } = useLibraryData()
  const addFilter = useFilterStore((s) => s.addFilter)
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const setRange = useFilterStore((s) => s.setRange)
  const filters = useFilterStore((s) => s.filters)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => languageFlows(filtered), [filtered])

  // Zeitraumfilter wie in Erwerb & Lektüre: eine Dimension zur Zeit (Erwerb
  // oder Lektüre), die Felder spiegeln den aktiven Filterzustand; ohne Filter
  // zeigen sie die Spannweite der Daten.
  const [formDim, setFormDim] = useState<RangeDim>('acquiredYear')
  const [formFrom, setFormFrom] = useState(0)
  const [formTo, setFormTo] = useState(0)
  useEffect(() => {
    const r = filters.find((f) => f.kind === formDim)
    if (r && 'from' in r) {
      setFormFrom(r.from)
      setFormTo(r.to)
      return
    }
    const ys = filtered
      .map((b) => (formDim === 'acquiredYear' ? b.acquiredYear : b.readYearEffective))
      .filter((y): y is number => y !== null)
    if (ys.length) {
      setFormFrom(Math.min(...ys))
      setFormTo(Math.max(...ys))
    }
  }, [formDim, filters, filtered])

  if (filtered.length === 0) return <EmptyState />
  if (data.links.length === 0) {
    return (
      <CoverageNote covered={0} total={filtered.length}>
        im aktuellen Filter haben eine Ausgabesprache.
      </CoverageNote>
    )
  }

  const layout = sankey<FlowNode, FlowLink>()
    .nodeId((d) => d.id)
    .nodeWidth(14)
    .nodePadding(12)
    .extent([
      [M.left, M.top],
      [Math.max(400, width) - M.right, H - M.bottom],
    ])({
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.links.map((l) => ({ ...l })),
  })

  const filterable = (lang: string) => lang !== OTHER_LANG && lang !== UNKNOWN_LANG
  const clickLink = (l: SLink) => {
    const s = l.source as SNode
    const t = l.target as SNode
    if (filterable(s.lang)) addFilter({ kind: 'originalLanguage', value: s.lang })
    if (filterable(t.lang)) addFilter({ kind: 'language', value: t.lang })
  }

  const inferredCount = filtered.filter((b) => b.languages.length > 0 && b.originalLanguagesInferred).length

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Sprachfluss</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben eine Ausgabesprache; bei <Num>{fmtInt(inferredCount)}</Num> davon gilt sie mangels
          erfasster Originalsprache zugleich als Original (Erfassungskonvention).
        </CoverageNote>
      </header>

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
          aria-label="Dimension des Zeitraumfilters"
        >
          <option value="acquiredYear">Erwerb</option>
          <option value="readYear">Lektüre</option>
        </select>
        <label>
          von{' '}
          <input
            type="number"
            value={formFrom}
            onChange={(e) => setFormFrom(Number(e.target.value))}
            min={1900}
            max={2100}
          />
        </label>
        <label>
          bis{' '}
          <input
            type="number"
            value={formTo}
            onChange={(e) => setFormTo(Number(e.target.value))}
            min={1900}
            max={2100}
          />
        </label>
        <button type="submit">Zeitraum filtern</button>
      </form>

      <svg width={width} height={H} role="img" aria-label="Fluss von Originalsprache zu Ausgabesprache">
        {layout.links.map((l) => {
          const s = l.source as SNode
          const t = l.target as SNode
          const label = `${langLabel(s.lang, de)} → ${langLabel(t.lang, de)}: ${fmtInt(l.value)} Titel`
          const activatable = filterable(s.lang) || filterable(t.lang)
          return (
            <path
              key={`${s.id}-${t.id}`}
              d={sankeyLinkHorizontal()(l) ?? ''}
              className={styles.link}
              stroke={LANG_COLORS[s.lang] ?? 'var(--ink-45)'}
              strokeWidth={Math.max(1, l.width ?? 1)}
              role={activatable ? 'button' : undefined}
              tabIndex={activatable ? 0 : undefined}
              aria-label={activatable ? `${label}. Enter filtert auf diese Kombination.` : label}
              onClick={() => clickLink(l)}
              onKeyDown={(e) => {
                if (isActivationKey(e)) {
                  e.preventDefault()
                  clickLink(l)
                }
              }}
            >
              <title>{label}</title>
            </path>
          )
        })}
        {layout.nodes.map((n) => {
          // Klick auf den Sprachbalken filtert nur die jeweilige Seite —
          // der Strom in der Mitte setzt weiterhin beide Sprachen zugleich.
          const nodeFilter =
            n.side === 'orig'
              ? ({ kind: 'originalLanguage', value: n.lang } as const)
              : ({ kind: 'language', value: n.lang } as const)
          const clickable = filterable(n.lang)
          const active = filters.some(
            (f) => f.kind === nodeFilter.kind && 'value' in f && f.value === n.lang,
          )
          const sideLabel = n.side === 'orig' ? 'Originalsprache' : 'Ausgabesprache'
          return (
            <g
              key={n.id}
              className={clickable ? styles.node : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-pressed={clickable ? active : undefined}
              aria-label={clickable ? `${sideLabel} ${langLabel(n.lang, de)}, ${fmtInt(n.total)} Titel` : undefined}
              onClick={clickable ? () => toggleFilter(nodeFilter) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (isActivationKey(e)) {
                        e.preventDefault()
                        toggleFilter(nodeFilter)
                      }
                    }
                  : undefined
              }
            >
              <rect
                x={n.x0}
                y={n.y0}
                width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                height={(n.y1 ?? 0) - (n.y0 ?? 0)}
                fill={LANG_COLORS[n.lang] ?? 'var(--ink-45)'}
                stroke={active ? 'var(--enji)' : 'none'}
                strokeWidth={active ? 2 : 0}
              />
              <text
                x={n.side === 'orig' ? (n.x0 ?? 0) - 6 : (n.x1 ?? 0) + 6}
                y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                dy="0.32em"
                textAnchor={n.side === 'orig' ? 'end' : 'start'}
                className={styles.nodeLabel}
              >
                {langLabel(n.lang, de)} · {fmtInt(n.total)}
              </text>
              {clickable && (
                <title>{`${sideLabel} ${langLabel(n.lang, de)}: ${fmtInt(n.total)} Titel (Klick filtert nur diese Sprache)`}</title>
              )}
            </g>
          )
        })}
        <text x={M.left} y={H - 4} className={styles.sideLabel} textAnchor="start">
          Originalsprache
        </text>
        <text x={Math.max(400, width) - M.right} y={H - 4} className={styles.sideLabel} textAnchor="end">
          Ausgabesprache
        </text>
      </svg>
    </div>
  )
}

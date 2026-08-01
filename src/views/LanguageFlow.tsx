import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useMemo } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { isActivationKey } from '../lib/keyboard'
import { langLabel, LANG_COLORS, OTHER_LANG, UNKNOWN_LANG } from '../lib/languages'
import { useMeasure } from '../lib/useMeasure'
import { languageFlows, type FlowLink, type FlowNode } from '../lib/viewData/languageFlows'
import { useFilterStore } from '../store/filters'
import styles from './LanguageFlow.module.css'

const H = 480
const M = { top: 8, right: 140, bottom: 8, left: 140 }

type SNode = SankeyNode<FlowNode, FlowLink>
type SLink = SankeyLink<FlowNode, FlowLink>

export function LanguageFlow() {
  const { filtered } = useLibraryData()
  const addFilter = useFilterStore((s) => s.addFilter)
  const setRange = useFilterStore((s) => s.setRange)
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const data = useMemo(() => languageFlows(filtered), [filtered])

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

  const years = filtered.map((b) => b.acquiredYear).filter((y): y is number => y !== null)
  const yMin = years.length ? Math.min(...years) : 1991
  const yMax = years.length ? Math.max(...years) : 2026

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Sprachfluss</h2>
        <CoverageNote covered={data.covered} total={filtered.length}>
          haben eine Ausgabesprache; {fmtInt(data.unknownOrig)} davon ohne bekannte
          Originalsprache (eigener Strom „unbekannt").
        </CoverageNote>
      </header>

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
          Erwerb von <input name="from" type="number" defaultValue={yMin} min={1900} max={2100} />
        </label>
        <label>
          bis <input name="to" type="number" defaultValue={yMax} min={1900} max={2100} />
        </label>
        <button type="submit">anwenden</button>
      </form>

      <svg width={width} height={H} role="img" aria-label="Fluss von Originalsprache zu Ausgabesprache">
        {layout.links.map((l) => {
          const s = l.source as SNode
          const t = l.target as SNode
          const label = `${langLabel(s.lang)} → ${langLabel(t.lang)}: ${fmtInt(l.value)} Titel`
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
        {layout.nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x0}
              y={n.y0}
              width={(n.x1 ?? 0) - (n.x0 ?? 0)}
              height={(n.y1 ?? 0) - (n.y0 ?? 0)}
              fill={LANG_COLORS[n.lang] ?? 'var(--ink-45)'}
            />
            <text
              x={n.side === 'orig' ? (n.x0 ?? 0) - 6 : (n.x1 ?? 0) + 6}
              y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
              dy="0.32em"
              textAnchor={n.side === 'orig' ? 'end' : 'start'}
              className={styles.nodeLabel}
            >
              {langLabel(n.lang)} · {fmtInt(n.total)}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - 2} className={styles.sideLabel} textAnchor="start">
          Originalsprache
        </text>
        <text x={Math.max(400, width) - M.right} y={H - 2} className={styles.sideLabel} textAnchor="end">
          Ausgabesprache
        </text>
      </svg>
    </div>
  )
}

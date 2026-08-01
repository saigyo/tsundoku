import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { scaleSqrt } from 'd3-scale'
import { useMemo, useState } from 'react'
import { CoverageNote } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useLibraryData } from '../lib/DataContext'
import { fmtInt } from '../lib/format'
import { useMeasure } from '../lib/useMeasure'
import { tagGraph } from '../lib/viewData/tagNetwork'
import { useFilterStore } from '../store/filters'
import styles from './TagNetwork.module.css'

const H = 860

interface SimNode extends SimulationNodeDatum {
  id: string
  count: number
}

/** Kante als d3-force-Link: shared/jaccard bleiben erhalten, source/target
 * werden von d3 beim Start von string-IDs zu SimNode-Referenzen aufgelöst. */
interface SimLink extends SimulationLinkDatum<SimNode> {
  shared: number
  jaccard: number
}

export function TagNetwork() {
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [minCount, setMinCount] = useState(10)
  const [isolated, setIsolated] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [wrapRef, width] = useMeasure<HTMLDivElement>()

  const graph = useMemo(() => tagGraph(filtered, { minCount }), [filtered, minCount])
  const maxCount = graph.nodes[0]?.count ?? 1
  const r = useMemo(() => scaleSqrt().domain([1, maxCount]).range([4, 26]), [maxCount])

  const layout = useMemo(() => {
    if (width === 0 || graph.nodes.length === 0) return null
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }))
    const links: SimLink[] = graph.links.map((l) => ({ ...l, source: l.source, target: l.target }))
    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 45 + 180 * (1 - l.jaccard))
          .strength((l) => 0.12 + 0.75 * l.jaccard),
      )
      .force('charge', forceManyBody().strength(-110))
      .force('x', forceX(width / 2).strength(0.05))
      .force('y', forceY(H / 2).strength(0.11))
      .force('collide', forceCollide<SimNode>((d) => r(d.count) + 3))
      .stop()
    // Tick-Budget sinkt mit der Knotenzahl, damit der Schwellwert-Slider bei
    // niedrigen Werten (viele Knoten, z. B. Mindestanzahl 3 -> >1000 Tags)
    // unter einer Sekunde reagiert; 317 Knoten (Default 10) bleiben bei 400.
    const ticks = Math.max(150, Math.min(400, Math.round((400 * 317) / nodes.length)))
    sim.tick(ticks)
    // Nach dem Tick hat d3 source/target in jedem Link zu SimNode-Objekten aufgelöst.
    return { nodes, links: links as (SimLink & { source: SimNode; target: SimNode })[] }
  }, [graph, width, r])

  if (filtered.length === 0) return <EmptyState />

  const neighborhood = isolated === null
    ? null
    : new Set([isolated, ...(layout?.links ?? [])
        .filter((l) => l.source.id === isolated || l.target.id === isolated)
        .flatMap((l) => [l.source.id, l.target.id])])

  const visible = (id: string) => neighborhood === null || neighborhood.has(id)
  const activeTags = new Set(filters.filter((f) => f.kind === 'tag').map((f) => (f as { value: string }).value))
  const searchHit = graph.nodes.find((n) => n.id.toLowerCase() === search.toLowerCase())?.id ?? null

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>Tag-Netzwerk</h2>
        <CoverageNote covered={graph.nodes.length} total={graph.totalTags} unit="Tags">
          haben ≥ {minCount} Titel und sind im Netz; ausgeblendet: {fmtInt(graph.excluded.yearTags)} Jahres-Tags,{' '}
          {fmtInt(graph.excluded.status)} Statusmarker, {fmtInt(graph.excluded.seriesMarkers)} Reihenkürzel.
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          Mindestanzahl Titel: <span className={styles.mono}>{minCount}</span>
          <input type="range" min={3} max={50} value={minCount} onChange={(e) => setMinCount(Number(e.target.value))} />
        </label>
        <input
          type="search"
          list="tag-list"
          placeholder="Tag suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tag suchen"
        />
        <datalist id="tag-list">
          {graph.nodes.map((n) => <option key={n.id} value={n.id} />)}
        </datalist>
        {isolated && (
          <button onClick={() => setIsolated(null)}>Isolation aufheben ({isolated})</button>
        )}
      </div>

      {layout && (
        <svg width={width} height={H} role="img" aria-label="Netzwerk gemeinsam vergebener Tags">
          {layout.links.map((l) => (
            <line
              key={`${l.source.id}-${l.target.id}`}
              x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
              stroke="var(--sumi)"
              strokeOpacity={visible(l.source.id) && visible(l.target.id) ? 0.1 + 0.5 * l.jaccard : 0.02}
            />
          ))}
          {layout.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              opacity={visible(n.id) ? 1 : 0.12}
              className={styles.node}
              role="button"
              tabIndex={0}
              aria-pressed={activeTags.has(n.id)}
              aria-label={`Tag ${n.id}, ${fmtInt(n.count)} Titel`}
              onClick={() => toggleFilter({ kind: 'tag', value: n.id })}
              onDoubleClick={() => setIsolated((cur) => (cur === n.id ? null : n.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') toggleFilter({ kind: 'tag', value: n.id })
                if (e.key === 'i') setIsolated((cur) => (cur === n.id ? null : n.id))
              }}
            >
              <circle
                r={r(n.count)}
                fill={activeTags.has(n.id) ? 'var(--enji)' : 'var(--kon)'}
                stroke={searchHit === n.id ? 'var(--enji)' : 'var(--shironeri)'}
                strokeWidth={searchHit === n.id ? 3 : 1}
              />
              {(r(n.count) > 10 || searchHit === n.id || visible(n.id) !== (neighborhood === null)) && (
                <text y={-r(n.count) - 4} textAnchor="middle" className={styles.nodeLabel}>
                  {n.id}
                </text>
              )}
              <title>{`${n.id}: ${fmtInt(n.count)} Titel (Enter = filtern, i = isolieren)`}</title>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

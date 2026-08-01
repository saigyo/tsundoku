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
import { useEffect, useMemo, useRef, useState } from 'react'
import { CoverageNote, Num } from '../components/CoverageNote'
import { EmptyState } from '../components/EmptyState'
import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import { isActivationKey } from '../lib/keyboard'
import { useMeasure } from '../lib/useMeasure'
import { tagGraph } from '../lib/viewData/tagNetwork'
import { useFilterStore } from '../store/filters'
import styles from './TagNetwork.module.css'

const H = 860
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4

interface SimNode extends SimulationNodeDatum {
  id: string
  count: number
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Sichtfenster: Bounding-Box des Layouts, durch den Zoomfaktor geteilt und um
 *  das Pan-Zentrum gelegt. Bei Zoom <= 1 (alles sichtbar) gibt es nichts zu
 *  pannen, das Fenster bleibt auf der Box zentriert. */
function computeView(bbox: Box, zoom: number, center: { x: number; y: number } | null): Box {
  const w = bbox.w / zoom
  const h = bbox.h / zoom
  const clampAxis = (v: number, lo: number, hi: number) =>
    lo >= hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v))
  const c =
    zoom <= 1 || center === null
      ? { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 }
      : {
          x: clampAxis(center.x, bbox.x + w / 2, bbox.x + bbox.w - w / 2),
          y: clampAxis(center.y, bbox.y + h / 2, bbox.y + bbox.h - h / 2),
        }
  return { x: c.x - w / 2, y: c.y - h / 2, w, h }
}

/** Kante als d3-force-Link: shared/jaccard bleiben erhalten, source/target
 * werden von d3 beim Start von string-IDs zu SimNode-Referenzen aufgelöst. */
interface SimLink extends SimulationLinkDatum<SimNode> {
  shared: number
  jaccard: number
}

export function TagNetwork() {
  const { m, fmtInt } = useI18n()
  const { filtered } = useLibraryData()
  const toggleFilter = useFilterStore((s) => s.toggleFilter)
  const filters = useFilterStore((s) => s.filters)
  const [minCount, setMinCount] = useState(10)
  const [isolated, setIsolated] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [wrapRef, width] = useMeasure<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  // Sichtbare Höhe statt fixer 860px: "Einpassen" soll den ganzen Graphen
  // auf den Bildschirm bringen, ohne dass die Seite scrollen muss.
  const [svgH, setSvgH] = useState(H)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

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

  // Bounding-Box des Layouts inkl. Radien und Platz für die Labels darüber.
  const bbox = useMemo<Box | null>(() => {
    if (!layout || layout.nodes.length === 0) return null
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const n of layout.nodes) {
      const rad = r(n.count)
      x0 = Math.min(x0, (n.x ?? 0) - rad)
      y0 = Math.min(y0, (n.y ?? 0) - rad)
      x1 = Math.max(x1, (n.x ?? 0) + rad)
      y1 = Math.max(y1, (n.y ?? 0) + rad)
    }
    const PAD_X = 70, PAD_TOP = 34, PAD_BOTTOM = 16
    const box = { x: x0 - PAD_X, y: y0 - PAD_TOP, w: x1 - x0 + 2 * PAD_X, h: y1 - y0 + PAD_TOP + PAD_BOTTOM }
    // Untergrenze, damit ein Mini-Graph (wenige Knoten) nicht absurd vergrößert wird
    const MIN = 320
    if (box.w < MIN) { box.x -= (MIN - box.w) / 2; box.w = MIN }
    if (box.h < MIN) { box.y -= (MIN - box.h) / 2; box.h = MIN }
    return box
  }, [layout, r])

  // Neues Layout (Filter, Schwellwert) -> automatisch einpassen. Der gewählte
  // Knoten kann nach dem Neuzeichnen sonst außerhalb des gezoomten Ausschnitts
  // liegen und man sähe nur irgendeine Mitte des neuen Graphen.
  useEffect(() => {
    setZoom(1)
    setCenter(null)
  }, [graph])

  // Dokumentposition des SVG bestimmt die verfügbare Höhe; neu messen bei
  // Fenster-Resize und wenn die Kontrollleiste umbricht (Isolations-Knopf).
  useEffect(() => {
    const measure = () => {
      const el = svgRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      setSvgH(Math.max(420, Math.floor(window.innerHeight - top - 32)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isolated, layout])

  const view = bbox ? computeView(bbox, zoom, center) : null
  const pxScale = view ? Math.min(width / view.w, svgH / view.h) : 1

  // Trackpad-Pinch bzw. Ctrl/Cmd+Scrollrad zoomt auf den Cursor; nativer
  // Listener, weil Reacts onWheel passiv ist und preventDefault ignoriert.
  useEffect(() => {
    const el = svgRef.current
    if (!el || !bbox) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const v = computeView(bbox, zoom, center)
      const rect = el.getBoundingClientRect()
      const s = Math.min(rect.width / v.w, rect.height / v.h)
      const ox = (rect.width - v.w * s) / 2
      const oy = (rect.height - v.h * s) / 2
      const px = (e.clientX - rect.left - ox) / s + v.x
      const py = (e.clientY - rect.top - oy) / s + v.y
      const z2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * Math.exp(-e.deltaY * 0.002)))
      if (z2 === zoom) return
      const cur = { x: v.x + v.w / 2, y: v.y + v.h / 2 }
      setCenter({ x: px + (cur.x - px) * (zoom / z2), y: py + (cur.y - py) * (zoom / z2) })
      setZoom(z2)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [bbox, zoom, center])

  // Suchtreffer im gezoomten Zustand in den sichtbaren Bereich holen: die
  // Sicht zentriert auf den Knoten, der Zoomfaktor des Nutzers bleibt.
  // Bewusst nur an `search` gekoppelt — späteres Zoomen/Pannen des Nutzers
  // soll nicht immer wieder zum Treffer zurückspringen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!layout) return
    const hit = layout.nodes.find((d) => d.id.toLowerCase() === search.toLowerCase())
    if (hit && zoom > 1) setCenter({ x: hit.x ?? 0, y: hit.y ?? 0 })
  }, [search])

  if (filtered.length === 0) return <EmptyState />

  const neighborhood = isolated === null
    ? null
    : new Set([isolated, ...(layout?.links ?? [])
        .filter((l) => l.source.id === isolated || l.target.id === isolated)
        .flatMap((l) => [l.source.id, l.target.id])])

  const visible = (id: string) => neighborhood === null || neighborhood.has(id)
  const activeTags = new Set(filters.filter((f) => f.kind === 'tag').map((f) => (f as { value: string }).value))
  const searchHit = graph.nodes.find((n) => n.id.toLowerCase() === search.toLowerCase())?.id ?? null
  const dimmedBySearch = (id: string) => searchHit !== null && id !== searchHit

  return (
    <div ref={wrapRef}>
      <header className={styles.head}>
        <h2>{m.views.network.title}</h2>
        <CoverageNote covered={graph.nodes.length} total={graph.totalTags} unit={m.coverage.unitTags}>
          {m.views.network.coverage(
            minCount,
            <Num>{fmtInt(graph.excluded.yearTags)}</Num>,
            <Num>{fmtInt(graph.excluded.status)}</Num>,
            <Num>{fmtInt(graph.excluded.seriesMarkers)}</Num>,
          )}
        </CoverageNote>
      </header>

      <div className={styles.controls}>
        <label>
          {m.views.network.minCountLabel} <span className={`${styles.mono} ${styles.sliderValue}`}>{minCount}</span>
          <input type="range" min={3} max={50} value={minCount} onChange={(e) => setMinCount(Number(e.target.value))} />
        </label>
        <input
          type="search"
          list="tag-list"
          placeholder={m.views.network.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={m.views.network.searchAria}
        />
        <datalist id="tag-list">
          {graph.nodes.map((n) => <option key={n.id} value={n.id} />)}
        </datalist>
        <label>
          {m.views.network.zoomLabel} <span className={`${styles.mono} ${styles.sliderValue}`}>{Math.round(zoom * 100)}</span> %
          <input
            type="range"
            min={ZOOM_MIN * 100}
            max={ZOOM_MAX * 100}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            aria-label={m.views.network.zoomAria}
          />
        </label>
        <button onClick={() => { setZoom(1); setCenter(null) }} disabled={zoom === 1 && center === null}>
          {m.views.network.fit}
        </button>
        {isolated && (
          <button onClick={() => setIsolated(null)}>{m.views.network.unisolate(isolated)}</button>
        )}
      </div>

      {layout && view && (
        <svg
          ref={svgRef}
          width={width}
          height={svgH}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className={zoom > 1 ? styles.pannable : undefined}
          role="img"
          aria-label={m.views.network.svgAria}
          onPointerDown={(e) => {
            if (zoom <= 1 || e.button !== 0) return
            drag.current = { x: e.clientX, y: e.clientY, moved: false }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const dx = e.clientX - drag.current.x
            const dy = e.clientY - drag.current.y
            if (!drag.current.moved) {
              if (Math.abs(dx) + Math.abs(dy) <= 3) return
              // Erst ab Bewegungsschwelle capturen: ein sofortiges Capture im
              // pointerdown leitet auch das Click-Event auf das SVG um, und
              // der Knoten unter dem Cursor bekäme seinen Klick nie.
              drag.current.moved = true
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            drag.current.x = e.clientX
            drag.current.y = e.clientY
            const cur = { x: view.x + view.w / 2, y: view.y + view.h / 2 }
            setCenter({ x: cur.x - dx / pxScale, y: cur.y - dy / pxScale })
          }}
          onPointerUp={() => {
            suppressClick.current = drag.current?.moved ?? false
            drag.current = null
          }}
          onClickCapture={(e) => {
            // Nach einem Pan darf der Klick keinen Knoten togglen.
            if (suppressClick.current) {
              e.stopPropagation()
              suppressClick.current = false
            }
          }}
        >
          {layout.links.map((l) => (
            <line
              key={`${l.source.id}-${l.target.id}`}
              x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
              stroke="var(--sumi)"
              strokeOpacity={
                (visible(l.source.id) && visible(l.target.id) ? 0.1 + 0.5 * l.jaccard : 0.02) *
                (searchHit !== null ? 0.35 : 1)
              }
            />
          ))}
          {layout.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              opacity={!visible(n.id) ? 0.12 : dimmedBySearch(n.id) ? 0.35 : 1}
              className={styles.node}
              role="button"
              tabIndex={0}
              aria-pressed={activeTags.has(n.id)}
              aria-label={m.views.network.nodeAria(n.id, fmtInt(n.count))}
              onClick={(e) => {
                // Isolation per Shift-Klick statt Doppelklick: der erste Klick
                // eines Doppelklicks filtert und zeichnet den Graphen neu, der
                // zweite träfe einen anderen Knoten.
                if (e.shiftKey) setIsolated((cur) => (cur === n.id ? null : n.id))
                else toggleFilter({ kind: 'tag', value: n.id })
              }}
              onKeyDown={(e) => {
                if (isActivationKey(e)) {
                  e.preventDefault()
                  toggleFilter({ kind: 'tag', value: n.id })
                }
                if (e.key === 'i') setIsolated((cur) => (cur === n.id ? null : n.id))
              }}
            >
              {searchHit === n.id && (
                <circle r={r(n.count) + 7} fill="none" stroke="var(--enji)" strokeWidth={3} />
              )}
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
              <title>{m.views.network.nodeTitle(n.id, fmtInt(n.count))}</title>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

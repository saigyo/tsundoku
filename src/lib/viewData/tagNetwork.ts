import type { Book } from '../types'

/** Statusmarker sind keine Themen (docs/visualisierungen.md, View 3). */
export const STATUS_TAGS = new Set(['gelesen', 'ungelesen', 'angelesen', 'have read', 'unread'])

/** Verlags-/Reihenkürzel; bei Bedarf erweitern (Fund im Netz melden statt raten). */
export const SERIES_MARKER_TAGS = new Set(['RUB', 'stw', 'ltfa', 'ultb'])

export const YEAR_TAG = /^(19|20)\d{2}$/

/**
 * Trennzeichen für Paar-Schlüssel beim Aufbau der Kanten. Die Referenz im
 * Task-Brief baute den Schlüssel als `${a} ${b}` und spaltete ihn wieder auf
 * einem Leerzeichen — das zerstört Tags, die selbst Leerzeichen enthalten
 * (z. B. "japanische Literatur"), weil split() dort mittendrin trennt.
 * ASCII Unit Separator (0x1F) kann in normalisierten Tag-Texten nicht
 * vorkommen und wird bewusst über den Zeichencode statt als Literal
 * angelegt, um jede Verwechslung mit einem sichtbaren Zeichen auszuschließen.
 */
const PAIR_SEP = String.fromCharCode(31)

export interface TagNode {
  id: string
  count: number
}

export interface TagLink {
  source: string
  target: string
  shared: number
  jaccard: number
}

export interface TagGraph {
  nodes: TagNode[]
  links: TagLink[]
  /** Anzahl aller wählbaren (nicht ausgeschlossenen) Tags vor dem Schwellwert. */
  totalTags: number
  excluded: { yearTags: number; status: number; seriesMarkers: number }
}

export function tagGraph(
  books: Book[],
  opts: { minCount: number; maxLinksPerNode?: number },
): TagGraph {
  const maxLinks = opts.maxLinksPerNode ?? 6
  const excludedSets = { yearTags: new Set<string>(), status: new Set<string>(), seriesMarkers: new Set<string>() }
  const counts = new Map<string, number>()

  const eligible = (tag: string): boolean => {
    if (YEAR_TAG.test(tag)) {
      excludedSets.yearTags.add(tag)
      return false
    }
    if (STATUS_TAGS.has(tag)) {
      excludedSets.status.add(tag)
      return false
    }
    if (SERIES_MARKER_TAGS.has(tag)) {
      excludedSets.seriesMarkers.add(tag)
      return false
    }
    return true
  }

  const perBook: string[][] = books.map((b) => b.tagsNorm.filter(eligible))
  for (const tags of perBook) for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1)

  const kept = new Set([...counts].filter(([, c]) => c >= opts.minCount).map(([t]) => t))
  const pair = new Map<string, number>()
  for (const tags of perBook) {
    const ts = tags.filter((t) => kept.has(t)).sort()
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const key = `${ts[i]}${PAIR_SEP}${ts[j]}`
        pair.set(key, (pair.get(key) ?? 0) + 1)
      }
    }
  }

  const allLinks: TagLink[] = [...pair].map(([key, shared]) => {
    const [a, b] = key.split(PAIR_SEP)
    const union = (counts.get(a) ?? 0) + (counts.get(b) ?? 0) - shared
    return { source: a, target: b, shared, jaccard: union === 0 ? 0 : shared / union }
  })

  // Top-k je Knoten nach Jaccard, Vereinigung beider Seiten
  const byNode = new Map<string, TagLink[]>()
  for (const l of allLinks) {
    for (const id of [l.source, l.target]) {
      const arr = byNode.get(id)
      if (arr) arr.push(l)
      else byNode.set(id, [l])
    }
  }
  const keptLinks = new Set<TagLink>()
  for (const links of byNode.values()) {
    links.sort((a, b) => b.jaccard - a.jaccard)
    for (const l of links.slice(0, maxLinks)) keptLinks.add(l)
  }

  return {
    nodes: [...kept].map((id) => ({ id, count: counts.get(id) ?? 0 })).sort((a, b) => b.count - a.count),
    links: [...keptLinks],
    totalTags: counts.size,
    excluded: {
      yearTags: excludedSets.yearTags.size,
      status: excludedSets.status.size,
      seriesMarkers: excludedSets.seriesMarkers.size,
    },
  }
}

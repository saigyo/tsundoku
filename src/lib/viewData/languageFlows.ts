import { OTHER_LANG, UNKNOWN_LANG } from '../languages'
import type { Book } from '../types'

export interface FlowNode {
  id: string
  side: 'orig' | 'edition'
  lang: string
  total: number
}

export interface FlowLink {
  source: string
  target: string
  value: number
}

export interface FlowData {
  nodes: FlowNode[]
  links: FlowLink[]
  /** Bücher mit Ausgabesprache (= im Fluss). */
  covered: number
  /** davon ohne Originalsprache (Strom „unbekannt"). */
  unknownOrig: number
}

export function languageFlows(books: Book[], opts?: { minCount?: number }): FlowData {
  const minCount = opts?.minCount ?? 10
  const inFlow = books.filter((b) => b.languages.length > 0)

  const origOf = (b: Book) => b.originalLanguages[0] ?? UNKNOWN_LANG
  const edOf = (b: Book) => b.languages[0]

  const totals = (langs: string[]) => {
    const m = new Map<string, number>()
    for (const l of langs) m.set(l, (m.get(l) ?? 0) + 1)
    return m
  }
  const origTotals = totals(inFlow.map(origOf))
  const edTotals = totals(inFlow.map(edOf))
  const bundle = (lang: string, side: Map<string, number>) =>
    lang === UNKNOWN_LANG ? lang : (side.get(lang) ?? 0) >= minCount ? lang : OTHER_LANG

  const linkCounts = new Map<string, number>()
  for (const b of inFlow) {
    const key = `o:${bundle(origOf(b), origTotals)}|e:${bundle(edOf(b), edTotals)}`
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1)
  }

  const links: FlowLink[] = [...linkCounts]
    .map(([key, value]) => {
      const [source, target] = key.split('|')
      return { source, target, value }
    })
    .sort((a, b) => b.value - a.value)

  const nodeTotals = new Map<string, number>()
  for (const l of links) {
    nodeTotals.set(l.source, (nodeTotals.get(l.source) ?? 0) + l.value)
    nodeTotals.set(l.target, (nodeTotals.get(l.target) ?? 0) + l.value)
  }
  const nodes: FlowNode[] = [...nodeTotals].map(([id, total]) => ({
    id,
    side: id.startsWith('o:') ? 'orig' : 'edition',
    lang: id.slice(2),
    total,
  }))

  return {
    nodes,
    links,
    covered: inFlow.length,
    unknownOrig: inFlow.filter((b) => b.originalLanguages.length === 0).length,
  }
}

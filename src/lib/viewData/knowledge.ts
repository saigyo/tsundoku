import type { Book } from '../types'

export interface KnowledgeData {
  years: number[]
  /** DDC-Hauptklassen, die im Datensatz vorkommen, aufsteigend. */
  classes: number[]
  /** rows[i][klasse] = Anzahl (ggf. geglättet) im Jahr years[i]. */
  rows: Record<number, number>[]
  covered: number
  withAcquired: number
}

export function ddcYearMatrix(books: Book[], opts: { smooth: boolean }): KnowledgeData {
  const withAcq = books.filter((b) => b.acquiredYearEffective !== null)
  const usable = withAcq.filter((b) => b.ddc !== null)
  if (usable.length === 0) {
    return { years: [], classes: [], rows: [], covered: 0, withAcquired: withAcq.length }
  }
  const years: number[] = []
  const yMin = Math.min(...usable.map((b) => b.acquiredYearEffective as number))
  const yMax = Math.max(...usable.map((b) => b.acquiredYearEffective as number))
  for (let y = yMin; y <= yMax; y++) years.push(y)
  const classes = [...new Set(usable.map((b) => (b.ddc as { top: number }).top))].sort((a, b) => a - b)

  const raw = years.map((year) => {
    const row: Record<number, number> = {}
    for (const c of classes) {
      row[c] = usable.filter((b) => b.acquiredYearEffective === year && b.ddc?.top === c).length
    }
    return row
  })

  const rows = opts.smooth
    ? raw.map((_, i) => {
        const row: Record<number, number> = {}
        const window = raw.slice(Math.max(0, i - 1), Math.min(raw.length, i + 2))
        for (const c of classes) {
          row[c] = window.reduce((s, r) => s + r[c], 0) / window.length
        }
        return row
      })
    : raw

  return { years, classes, rows, covered: usable.length, withAcquired: withAcq.length }
}

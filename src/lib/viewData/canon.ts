import { canonicalAward } from '../awards'
import type { Book } from '../types'

export interface CanonRow {
  list: string
  owned: number
  read: number
}

export interface CanonData {
  rows: CanonRow[]
  withAwards: number
}

export function canonRows(books: Book[], topN = 20): CanonData {
  const byList = new Map<string, { owned: number; read: number }>()
  let withAwards = 0
  for (const b of books) {
    const lists = [...new Set(b.awards.map(canonicalAward))]
    if (lists.length > 0) withAwards += 1
    for (const list of lists) {
      const e = byList.get(list) ?? { owned: 0, read: 0 }
      e.owned += 1
      if (b.hasRead) e.read += 1
      byList.set(list, e)
    }
  }
  const rows = [...byList]
    .map(([list, v]) => ({ list, ...v }))
    .sort((a, b) => b.owned - a.owned || a.list.localeCompare(b.list, 'de'))
    .slice(0, topN)
  return { rows, withAwards }
}

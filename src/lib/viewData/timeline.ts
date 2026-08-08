import type { Book } from '../types'

export interface TimelinePoint {
  year: number
  acquired: number
  readDated: number
  readTagged: number
}

export interface TimelineData {
  points: TimelinePoint[]
  /** Bücher mit bekanntem Erwerbsjahr, die Ende des Jahres (noch) ungelesen sind. */
  unread: { year: number; count: number }[]
  maxGapYear: number | null
  acquiredKnown: number
  readKnown: number
  readTaggedOnly: number
}

export function timelineData(books: Book[]): TimelineData {
  const acq = books.filter((b) => b.acquiredYearEffective !== null)
  const read = books.filter((b) => b.readYearEffective !== null)
  const years = [
    ...acq.map((b) => b.acquiredYearEffective as number),
    ...read.map((b) => b.readYearEffective as number),
  ]
  if (years.length === 0) {
    return { points: [], unread: [], maxGapYear: null, acquiredKnown: 0, readKnown: 0, readTaggedOnly: 0 }
  }
  const min = Math.min(...years)
  const max = Math.max(...years)

  const points: TimelinePoint[] = []
  const unread: { year: number; count: number }[] = []
  let maxGap = -Infinity
  let maxGapYear: number | null = null
  for (let year = min; year <= max; year++) {
    const acquired = acq.filter((b) => b.acquiredYearEffective === year).length
    const readDated = read.filter(
      (b) => b.readYearEffective === year && b.readYearSource === 'dateread',
    ).length
    const readTagged = read.filter(
      (b) => b.readYearEffective === year && b.readYearSource === 'tag',
    ).length
    points.push({ year, acquired, readDated, readTagged })
    unread.push({
      year,
      count: acq.filter(
        (b) =>
          (b.acquiredYearEffective as number) <= year &&
          (b.readYearEffective === null || b.readYearEffective > year),
      ).length,
    })
    const gap = acquired - readDated - readTagged
    if (gap > maxGap) {
      maxGap = gap
      maxGapYear = year
    }
  }

  return {
    points,
    unread,
    maxGapYear,
    acquiredKnown: acq.length,
    readKnown: read.length,
    readTaggedOnly: read.filter((b) => b.readYearSource === 'tag').length,
  }
}

import type { Book } from './types'
import type { Messages } from '../i18n/messages'

/**
 * Qualitäts-Flags der Datenqualitäts-View (Spec „Datenqualitäts-View"):
 * buchbezogene Befunde, die als Filterdimension { kind: 'flag' } klickbar
 * sind. Reihenfolge = Anzeige-Tiebreaker bei gleicher Trefferzahl.
 */
export const FLAG_IDS = [
  'bulkImport',
  'physicalEstimated',
  'origLangInferred',
  'readYearTag',
  'acquiredEntry',
  'abandoned',
] as const

export type FlagId = (typeof FLAG_IDS)[number]

const PREDICATES: Record<FlagId, (b: Book) => boolean> = {
  bulkImport: (b) => b.bulkImport,
  physicalEstimated: (b) => b.physicalEstimated,
  origLangInferred: (b) => b.originalLanguagesInferred,
  readYearTag: (b) => b.readYearSource === 'tag',
  acquiredEntry: (b) => b.acquiredYearSource === 'entrydate',
  abandoned: (b) => b.abandoned,
}

/** id ist string, nicht FlagId: URL-Parameter sind Nutzereingaben. */
export function hasFlag(b: Book, id: string): boolean {
  return (PREDICATES as Record<string, (b: Book) => boolean | undefined>)[id]?.(b) ?? false
}

/** Übersetzter Flag-Name; unbekannte Werte (URL) fallen auf die Id zurück. */
export function flagLabel(value: string, m: Messages): string {
  return (m.flagNames as Record<string, string>)[value] ?? value
}

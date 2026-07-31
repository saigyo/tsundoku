/**
 * Kanon-Synonyme: Übersetzungen derselben Liste werden zusammengeführt
 * (docs/visualisierungen.md, View 8). Task 14 füllt die Tabelle aus den
 * echten stats.awards-Werten; bis dahin ist canonicalAward die Identität.
 */
export const AWARD_SYNONYMS: Record<string, string> = {}

export function canonicalAward(raw: string): string {
  return AWARD_SYNONYMS[raw] ?? raw
}

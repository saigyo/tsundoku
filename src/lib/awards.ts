/**
 * Kanon-Synonyme: Übersetzungen derselben Liste werden zusammengeführt
 * (docs/visualisierungen.md, View 8). Werte stammen aus der Inspektion von
 * stats.awards im echten Export (node -e "...l.stats.awards..."); nur
 * Einträge, die klar dieselbe Liste in anderer Sprache sind, wurden
 * zusammengeführt — im Zweifel blieb es getrennt.
 *
 * Nur die "1001 Books You Must Read Before You Die"-Familie hatte im Export
 * eindeutige Übersetzungsduplikate (NL, SV, DE, FR). Die scheinbar verwandten
 * "1001 Comics You Must Read Before You Die" und "1001 Children's Books You
 * Must Read Before You Grow Up" sind KEINE Übersetzungen, sondern eigene
 * Listen (andere Medien/Zielgruppe) und bleiben bewusst getrennt. Harenberg
 * ("Harenberg Buch der 1000 Bücher"), "1000 Books to Read Before You Die",
 * SWR-Bestenliste und die drei ZEIT-Listen kamen im Export jeweils nur mit
 * einer Schreibweise vor — keine Synonyme zu ergänzen.
 */
export const AWARD_SYNONYMS: Record<string, string> = {
  '1001 boeken die je gelezen moet hebben!': '1001 Books You Must Read Before You Die',
  '1001 böcker du måste läsa innan du dör': '1001 Books You Must Read Before You Die',
  '1001 Bücher, die Sie lesen sollten, bevor das Leben vorbei ist':
    '1001 Books You Must Read Before You Die',
  "Les 1001 livres qu'il faut avoir lus dans sa vie": '1001 Books You Must Read Before You Die',
}

export function canonicalAward(raw: string): string {
  return AWARD_SYNONYMS[raw] ?? raw
}

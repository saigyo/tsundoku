import { de } from './de'
import { en } from './en'
import { fr } from './fr'
import type { Locale, Messages } from './messages'

/** ES/JA zeigen bis zu ihren Übersetzungs-Tasks auf die deutsche
 *  Referenz, damit die App in jeder Phase vollständig läuft. */
export const BUNDLES: Record<Locale, Messages> = {
  de,
  en,
  fr,
  es: de,
  ja: de,
}

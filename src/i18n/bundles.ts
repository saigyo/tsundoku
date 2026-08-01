import { de } from './de'
import type { Locale, Messages } from './messages'

/** EN/FR/ES/JA zeigen bis zu ihren Übersetzungs-Tasks auf die deutsche
 *  Referenz, damit die App in jeder Phase vollständig läuft. */
export const BUNDLES: Record<Locale, Messages> = {
  de,
  en: de,
  fr: de,
  es: de,
  ja: de,
}

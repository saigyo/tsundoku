import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import type { Locale, Messages } from './messages'

/** JA zeigt bis zu seinem Übersetzungs-Task auf die deutsche
 *  Referenz, damit die App in jeder Phase vollständig läuft. */
export const BUNDLES: Record<Locale, Messages> = {
  de,
  en,
  fr,
  es,
  ja: de,
}

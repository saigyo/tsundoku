import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { ja } from './ja'
import type { Locale, Messages } from './messages'

export const BUNDLES: Record<Locale, Messages> = {
  de,
  en,
  fr,
  es,
  ja,
}

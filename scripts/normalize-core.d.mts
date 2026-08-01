// Typdeklaration fuer den Import des Normalizer-Kerns aus der App
// (src/components/DataUpload.tsx). Nur die dort genutzte Signatur.
import type { Library } from '../src/lib/types'

export function normalize(raw: Record<string, unknown>, source?: string | null): Library

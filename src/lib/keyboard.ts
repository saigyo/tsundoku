import type { KeyboardEvent } from 'react'

/**
 * Enter und Leertaste aktivieren SVG-Elemente mit role="button" gleichermaßen
 * (native Buttons tun das auch). Ruft KEIN preventDefault auf — das bleibt
 * Sache des Aufrufers, weil bei Leertaste sonst die Seite scrollt.
 */
export function isActivationKey(e: KeyboardEvent): boolean {
  return e.key === 'Enter' || e.key === ' '
}

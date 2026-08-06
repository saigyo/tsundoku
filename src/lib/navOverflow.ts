/**
 * Wie viele Tabs passen in die Nav-Zeile? Passt alles, gibt es keinen
 * Überlauf (und keinen Knopf). Sonst wird die Knopfbreite reserviert und
 * von vorn aufgefüllt: k Tabs + Knopf brauchen sum(w[0..k-1]) + k*gap +
 * buttonWidth (je ein gap zwischen den Elementen). Deterministisch:
 * gleiche Breiten ⇒ gleicher Schnitt (Spec, Entscheidung 1).
 */
export function fitCount(
  tabWidths: number[],
  buttonWidth: number,
  gap: number,
  available: number,
): number {
  const n = tabWidths.length
  const total = tabWidths.reduce((s, w) => s + w, 0) + gap * Math.max(0, n - 1)
  if (total <= available) return n
  let used = buttonWidth
  let k = 0
  while (k < n && used + tabWidths[k] + gap <= available) {
    used += tabWidths[k] + gap
    k += 1
  }
  return k
}

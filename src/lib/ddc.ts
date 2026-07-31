/** Dewey-Hauptklassen, deutsche Kurzlabels für Chips, Legenden, Achsen. */
export const DDC_LABELS: Record<number, string> = {
  0: 'Allgemeines & Informatik',
  1: 'Philosophie & Psychologie',
  2: 'Religion',
  3: 'Sozialwissenschaften',
  4: 'Sprache',
  5: 'Naturwissenschaften',
  6: 'Technik & Medizin',
  7: 'Künste & Unterhaltung',
  8: 'Literatur',
  9: 'Geschichte & Geographie',
}

/**
 * Startwerte, an der Palette orientiert (kon/enji/rikyū eingereiht).
 * Feinabstimmung bei View 2/6 am echten Bild.
 */
export const DDC_COLORS: Record<number, string> = {
  0: '#2e5c6e', // sabi-asagi
  1: '#223a70', // kon
  2: '#6f5980', // shion
  3: '#9e3d3b', // enji
  4: '#b07736', // kuchiba
  5: '#7a8b4a', // rikyū
  6: '#8d6449', // tobi
  7: '#c8552f', // shu
  8: '#4a6e5a', // rokushō
  9: '#746a5e', // rikyū-nezumi
}

/** Kurzform für Chips, wo `DDC_LABELS` zu lang wäre (z. B. „Philosophie & Psychologie" -> „Philosophie"). */
export const DDC_SHORT: Record<number, string> = {
  0: 'Informatik',
  1: 'Philosophie',
  2: 'Religion',
  3: 'Sozialwissenschaften',
  4: 'Sprache',
  5: 'Naturwissenschaften',
  6: 'Technik',
  7: 'Künste',
  8: 'Literatur',
  9: 'Geschichte',
}

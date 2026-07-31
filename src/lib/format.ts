const intFmt = new Intl.NumberFormat('de-DE')

export function fmtInt(n: number): string {
  return intFmt.format(n)
}

/** Jahre ohne Tausenderpunkt: 1998, nicht 1.998. */
export function fmtYear(y: number): string {
  return String(y)
}

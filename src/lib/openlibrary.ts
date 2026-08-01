/** OpenLibrary-URLs für das Buch-Detail. Nur das Detail-Popup lädt Cover:
 *  ISBN-basierte Cover-Abfragen sind auf 100 Anfragen/IP pro 5 Minuten
 *  rate-limitiert — Einzelabrufe sind sicher, Listenansichten wären es nicht. */

/** Bindestriche/Leerzeichen entfernen, Prüfzeichen x anheben. Nur Längen 10
 *  und 13 gelten; keine Prüfziffernvalidierung (Spec). Der Datenbestand
 *  enthält u. a. eine auf 12 Stellen abgeschnittene ISBN — die liefert null. */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[-\s]/g, '').toUpperCase()
  return /^[0-9]{9}[0-9X]$|^[0-9]{13}$/.test(s) ? s : null
}

/** Cover Größe M; ?default=false lässt fehlende Cover als 404 antworten
 *  statt als leeres 1×1-GIF, sodass onError im <img> greift. */
export function coverUrl(isbn: string): string | null {
  const n = normalizeIsbn(isbn)
  return n === null ? null : `https://covers.openlibrary.org/b/isbn/${n}-M.jpg?default=false`
}

/** Buchseite; OpenLibrary leitet auf die Editionsseite weiter. */
export function bookUrl(isbn: string): string | null {
  const n = normalizeIsbn(isbn)
  return n === null ? null : `https://openlibrary.org/isbn/${n}`
}

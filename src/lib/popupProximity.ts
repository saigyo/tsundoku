import type { PointerEvent } from 'react'

/**
 * Nähe-Regel der Balkenzeilen (Genres-View und Kanonabgleich, identische
 * Zeilenstruktur): Das Titel-Popup löst nur „in der Nähe" von Inhalt aus —
 * die Zählung trifft direkt (ihre Box umschließt den Text), Label und
 * Balken mit seitlicher Toleranz, weil kurze Balken und kurze Labels sonst
 * kaum treffbar wären. Beim Label zählt der tatsächliche Text (Range),
 * nicht die minmax-Spalte. Der übrige Leerraum bleibt fürs Popup still,
 * sonst erschiene beim Überfahren der Seite ständig eines; der Filter-Klick
 * gilt dagegen auf der ganzen Zeile (Hover-Tönung zeigt den Bezug).
 *
 * Die Klassennamen kommen aus dem CSS-Modul der jeweiligen View.
 */
export const PROXIMITY_PX = 32

export interface RowContentClasses {
  /** trifft direkt über die eigene Box (Zählung rechts) */
  direct: string
  /** Label-Spalte — gemessen wird der Textinhalt */
  text: string
  /** Bestands-Balken */
  bar: string
}

function within(rect: DOMRect | undefined, x: number, tol: number): boolean {
  return rect !== undefined && x >= rect.left - tol && x <= rect.right + tol
}

function textRect(el: Element | null): DOMRect | undefined {
  if (el === null) return undefined
  const range = document.createRange()
  range.selectNodeContents(el)
  return range.getBoundingClientRect()
}

export function nearRowContent(e: PointerEvent<HTMLElement>, cls: RowContentClasses): boolean {
  const row = e.currentTarget
  if (e.target instanceof Element && e.target.closest(`.${cls.direct}`) !== null) return true
  return (
    within(textRect(row.querySelector(`.${cls.text}`)), e.clientX, PROXIMITY_PX) ||
    within(row.querySelector(`.${cls.bar}`)?.getBoundingClientRect(), e.clientX, PROXIMITY_PX)
  )
}

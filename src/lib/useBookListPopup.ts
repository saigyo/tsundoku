import { useCallback, useEffect, useRef, useState } from 'react'

const GRACE_MS = 250

type PopupState<A> = { anchor: A; x: number; y: number }

/**
 * Zustandsautomat des Titel-Popups (Spec „Interaktives Titel-Popup"):
 * armed (Hover-Regeln aktiv) → grace (Zeiger draußen, 250-ms-Frist) →
 * geschlossen; pinned nach Titelklick — Chart-Hover wird dann vollständig
 * ignoriert (weder Schließen noch Ersetzen), erst erneutes Betreten des
 * Popups macht die Hover-Regel wieder scharf. `suspended` setzt die
 * Esc-/Außenklick-Listener aus, solange der BookDetail-Dialog offen ist:
 * dessen Klicks und Esc gehören dem Dialog, nicht dem Popup dahinter.
 */
export function useBookListPopup<A>(sameAnchor: (a: A, b: A) => boolean, suspended: boolean) {
  const [popup, setPopup] = useState<PopupState<A> | null>(null)
  const phase = useRef<'armed' | 'grace' | 'pinned'>('armed')
  const timer = useRef<number | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const close = useCallback(() => {
    cancelTimer()
    phase.current = 'armed'
    setPopup(null)
  }, [cancelTimer])

  /** Chart-Pointermove über einem Jahr / einer Zelle mit Inhalt. */
  const hoverAnchor = useCallback(
    (anchor: A, x: number, y: number) => {
      if (phase.current === 'pinned') return
      cancelTimer()
      phase.current = 'armed'
      // Gleicher Anker: Position der ersten Meldung behalten — das Popup
      // steht fest und folgt nicht dem Zeiger (sonst wäre es unbetretbar).
      setPopup((p) => (p !== null && sameAnchor(p.anchor, anchor) ? p : { anchor, x, y }))
    },
    [cancelTimer, sameAnchor],
  )

  /** Zeiger verlässt Chartfläche oder Popup: Gnadenfrist überbrückt den
   *  12-px-Spalt zwischen Anker und Popup. */
  const beginGrace = useCallback(() => {
    if (phase.current === 'pinned') return
    phase.current = 'grace'
    cancelTimer()
    timer.current = window.setTimeout(close, GRACE_MS)
  }, [cancelTimer, close])

  const popupEnter = useCallback(() => {
    cancelTimer()
    // Betreten macht die Hover-Regel wieder scharf — auch aus pinned.
    phase.current = 'armed'
  }, [cancelTimer])

  /** Beim Titelklick: das Popup überlebt den BookDetail-Dialog und den
   *  zufälligen Zeigerstand nach dessen Schließen. */
  const pin = useCallback(() => {
    cancelTimer()
    phase.current = 'pinned'
  }, [cancelTimer])

  // Esc und Pointer-Down außerhalb schließen in jedem Zustand (auch pinned:
  // Nav-Tabs, Filter-Chips, freie Fläche) — außer suspended.
  useEffect(() => {
    if (popup === null || suspended) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent) => {
      const el = popupRef.current
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return
      close()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [popup, suspended, close])

  // Aufräumen beim Unmount (View-Wechsel bei laufender Gnadenfrist).
  useEffect(() => cancelTimer, [cancelTimer])

  return { popup, popupRef, hoverAnchor, leaveChart: beginGrace, popupEnter, popupLeave: beginGrace, pin, close }
}

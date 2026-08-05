import { useCallback, useEffect, useRef, useState } from 'react'

const GRACE_MS = 250
// Wechsel-Verzögerung: Auf dem Weg ins Popup überstreicht der Zeiger in
// dichten Regionen fremde Fangpfade (Linien) bzw. Nachbarzellen (Heatmap).
// Ein anderer Anker ersetzt das Popup deshalb erst, wenn der Zeiger kurz
// auf dem neuen Ziel verweilt — das erste Öffnen bleibt sofort.
const REPLACE_MS = 180

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
  // Spiegel des States für Handler-Logik ohne Setter-Seiteneffekte
  // (React-Updater müssen pur bleiben, Timer gehören nicht hinein).
  const current = useRef<PopupState<A> | null>(null)
  const phase = useRef<'armed' | 'grace' | 'pinned'>('armed')
  const graceTimer = useRef<number | null>(null)
  const replaceTimer = useRef<number | null>(null)
  const pending = useRef<PopupState<A> | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  const show = useCallback((p: PopupState<A> | null) => {
    current.current = p
    setPopup(p)
  }, [])

  const cancelGrace = useCallback(() => {
    if (graceTimer.current !== null) {
      window.clearTimeout(graceTimer.current)
      graceTimer.current = null
    }
  }, [])

  const cancelReplace = useCallback(() => {
    if (replaceTimer.current !== null) {
      window.clearTimeout(replaceTimer.current)
      replaceTimer.current = null
    }
    pending.current = null
  }, [])

  const close = useCallback(() => {
    cancelGrace()
    cancelReplace()
    phase.current = 'armed'
    show(null)
  }, [cancelGrace, cancelReplace, show])

  /** Chart-Pointermove über einem Jahr / einer Zelle mit Inhalt. */
  const hoverAnchor = useCallback(
    (anchor: A, x: number, y: number) => {
      if (phase.current === 'pinned') return
      cancelGrace()
      phase.current = 'armed'
      const cur = current.current
      if (cur === null) {
        // Erstes Öffnen: sofort, ohne Verweildauer.
        cancelReplace()
        show({ anchor, x, y })
        return
      }
      if (sameAnchor(cur.anchor, anchor)) {
        // Zurück auf dem aktuellen Anker: schwebenden Wechsel verwerfen;
        // Position der ersten Meldung behalten — das Popup steht fest und
        // folgt nicht dem Zeiger (sonst wäre es unbetretbar).
        cancelReplace()
        return
      }
      // Anderes Ziel: Wechsel erst nach Verweilzeit. Läuft für dasselbe
      // Kandidaten-Ziel schon ein Timer, weiterlaufen lassen — sonst würde
      // jede Bewegung innerhalb des neuen Ziels den Wechsel ewig aufschieben.
      if (pending.current !== null && sameAnchor(pending.current.anchor, anchor)) return
      cancelReplace()
      pending.current = { anchor, x, y }
      replaceTimer.current = window.setTimeout(() => {
        const cand = pending.current
        pending.current = null
        replaceTimer.current = null
        if (cand !== null && phase.current !== 'pinned') show(cand)
      }, REPLACE_MS)
    },
    [cancelGrace, cancelReplace, sameAnchor, show],
  )

  /** Zeiger verlässt Chartfläche oder Popup: Gnadenfrist überbrückt den
   *  12-px-Spalt zwischen Anker und Popup. */
  const beginGrace = useCallback(() => {
    if (phase.current === 'pinned') return
    phase.current = 'grace'
    cancelGrace()
    cancelReplace()
    graceTimer.current = window.setTimeout(close, GRACE_MS)
  }, [cancelGrace, cancelReplace, close])

  const popupEnter = useCallback(() => {
    cancelGrace()
    // Angekommen: ein noch schwebender Wechsel wäre jetzt ein Diebstahl
    // des Popups unter dem Zeiger — verwerfen.
    cancelReplace()
    // Betreten macht die Hover-Regel wieder scharf — auch aus pinned.
    phase.current = 'armed'
  }, [cancelGrace, cancelReplace])

  /** Beim Titelklick: das Popup überlebt den BookDetail-Dialog und den
   *  zufälligen Zeigerstand nach dessen Schließen. */
  const pin = useCallback(() => {
    cancelGrace()
    cancelReplace()
    phase.current = 'pinned'
  }, [cancelGrace, cancelReplace])

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

  // Aufräumen beim Unmount (View-Wechsel bei laufenden Timern).
  useEffect(
    () => () => {
      cancelGrace()
      cancelReplace()
    },
    [cancelGrace, cancelReplace],
  )

  return { popup, popupRef, hoverAnchor, leaveChart: beginGrace, popupEnter, popupLeave: beginGrace, pin, close }
}

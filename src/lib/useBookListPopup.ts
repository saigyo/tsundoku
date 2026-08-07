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
 *
 * `openDelayMs` > 0 schaltet eine Ruhe-Erkennung fürs Erst-Öffnen zu: jede
 * Bewegung startet den Timer neu, das Popup erscheint erst, wenn der Zeiger
 * kurz stillsteht — und zwar an der Ruheposition. Für die Balken-Views
 * (Genres, Kanon), wo das sofortige Öffnen beim Überstreichen der Zeilen
 * flackerte; die Jahres-Charts bleiben beim abgestimmten Sofort-Öffnen (0).
 */
export function useBookListPopup<A>(
  sameAnchor: (a: A, b: A) => boolean,
  suspended: boolean,
  openDelayMs = 0,
) {
  const [popup, setPopup] = useState<PopupState<A> | null>(null)
  // Spiegel des States für Handler-Logik ohne Setter-Seiteneffekte
  // (React-Updater müssen pur bleiben, Timer gehören nicht hinein).
  const current = useRef<PopupState<A> | null>(null)
  const phase = useRef<'armed' | 'grace' | 'pinned'>('armed')
  const graceTimer = useRef<number | null>(null)
  const replaceTimer = useRef<number | null>(null)
  const pending = useRef<PopupState<A> | null>(null)
  const openTimer = useRef<number | null>(null)
  const pendingOpen = useRef<PopupState<A> | null>(null)
  const staleTimer = useRef<number | null>(null)
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

  const cancelOpen = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current)
      openTimer.current = null
    }
    pendingOpen.current = null
  }, [])

  const cancelStale = useCallback(() => {
    if (staleTimer.current !== null) {
      window.clearTimeout(staleTimer.current)
      staleTimer.current = null
    }
  }, [])

  /** Ruhe-Modus: Verlässt der Zeiger den Anker in Richtung fremden Inhalts,
   *  verfällt das alte Popup nach der bekannten Frist — auch bei laufender
   *  Bewegung (die Frist startet einmal und läuft durch, sonst hielte
   *  kontinuierliches Streichen das Popup unbegrenzt fest). Anders als
   *  close() lässt der Verfall schwebende Wechsel-/Öffnen-Timer in Ruhe:
   *  wer danach zur Ruhe kommt, bekommt sein neues Popup. */
  const ensureStale = useCallback(() => {
    if (staleTimer.current !== null) return
    staleTimer.current = window.setTimeout(() => {
      staleTimer.current = null
      if (phase.current !== 'pinned') show(null)
    }, GRACE_MS)
  }, [show])

  const close = useCallback(() => {
    cancelGrace()
    cancelReplace()
    cancelOpen()
    cancelStale()
    phase.current = 'armed'
    show(null)
  }, [cancelGrace, cancelReplace, cancelOpen, cancelStale, show])

  /** Chart-Pointermove über einem Jahr / einer Zelle mit Inhalt. */
  const hoverAnchor = useCallback(
    (anchor: A, x: number, y: number) => {
      if (phase.current === 'pinned') return
      cancelGrace()
      phase.current = 'armed'
      const cur = current.current
      if (cur === null) {
        cancelReplace()
        if (openDelayMs <= 0) {
          // Erstes Öffnen: sofort, ohne Verweildauer (Spec, Entscheidung 5).
          cancelOpen()
          show({ anchor, x, y })
          return
        }
        // Ruhe-Erkennung: jede Bewegung startet den Timer neu — das Popup
        // erscheint erst nach openDelayMs Stillstand, an der Ruheposition.
        cancelOpen()
        pendingOpen.current = { anchor, x, y }
        openTimer.current = window.setTimeout(() => {
          const cand = pendingOpen.current
          pendingOpen.current = null
          openTimer.current = null
          if (cand !== null && phase.current !== 'pinned') show(cand)
        }, openDelayMs)
        return
      }
      if (sameAnchor(cur.anchor, anchor)) {
        // Zurück auf dem aktuellen Anker: schwebenden Wechsel und
        // Verfallsfrist verwerfen; Position der ersten Meldung behalten —
        // das Popup steht fest und folgt nicht dem Zeiger (sonst wäre es
        // unbetretbar).
        cancelReplace()
        cancelStale()
        return
      }
      // Fremder Anker im Ruhe-Modus: das alte Popup läuft auf Verfallsfrist,
      // während der Wechsel unabhängig davon auf Stillstand wartet.
      if (openDelayMs > 0) ensureStale()
      // Anderes Ziel: Wechsel erst nach Verweilzeit. Läuft für dasselbe
      // Kandidaten-Ziel schon ein Timer, weiterlaufen lassen — sonst würde
      // jede Bewegung innerhalb des neuen Ziels den Wechsel ewig aufschieben
      // (Linien-Charts: dem Ziel entlangfahren zählt als Verweilen). Mit
      // Ruhe-Erkennung gilt das Gegenteil: auch der Wechsel wartet auf
      // Stillstand — jede Bewegung startet den Timer neu und nimmt die
      // Zielposition mit, sonst blättert kontinuierliches Überstreichen
      // der Balken alle REPLACE_MS das Popup weiter.
      if (pending.current !== null && sameAnchor(pending.current.anchor, anchor) && openDelayMs <= 0)
        return
      cancelReplace()
      pending.current = { anchor, x, y }
      replaceTimer.current = window.setTimeout(() => {
        const cand = pending.current
        pending.current = null
        replaceTimer.current = null
        if (cand !== null && phase.current !== 'pinned') {
          // Der Wechsel gewinnt gegen die Verfallsfrist des alten Popups —
          // sonst würde sie kurz darauf das frische Popup ausblenden.
          cancelStale()
          show(cand)
        }
      }, REPLACE_MS)
    },
    [cancelGrace, cancelReplace, cancelOpen, cancelStale, ensureStale, openDelayMs, sameAnchor, show],
  )

  /** Zeiger verlässt Chartfläche oder Popup: Gnadenfrist überbrückt den
   *  12-px-Spalt zwischen Anker und Popup. */
  const beginGrace = useCallback(() => {
    if (phase.current === 'pinned') return
    phase.current = 'grace'
    cancelGrace()
    cancelReplace()
    // Auch ein schwebendes Erst-Öffnen verwerfen: der Zeiger hat den
    // Inhalt verlassen, bevor er zur Ruhe kam. Die Verfallsfrist geht in
    // der Gnadenfrist auf (close räumt ohnehin alles ab).
    cancelOpen()
    cancelStale()
    graceTimer.current = window.setTimeout(close, GRACE_MS)
  }, [cancelGrace, cancelReplace, cancelOpen, cancelStale, close])

  const popupEnter = useCallback(() => {
    cancelGrace()
    // Angekommen: ein noch schwebender Wechsel oder eine laufende
    // Verfallsfrist wäre jetzt ein Diebstahl des Popups unter dem
    // Zeiger — verwerfen.
    cancelReplace()
    cancelStale()
    // Betreten macht die Hover-Regel wieder scharf — auch aus pinned.
    phase.current = 'armed'
  }, [cancelGrace, cancelReplace, cancelStale])

  /** Beim Titelklick: das Popup überlebt den BookDetail-Dialog und den
   *  zufälligen Zeigerstand nach dessen Schließen. */
  const pin = useCallback(() => {
    cancelGrace()
    cancelReplace()
    cancelStale()
    phase.current = 'pinned'
  }, [cancelGrace, cancelReplace, cancelStale])

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
      cancelOpen()
      cancelStale()
    },
    [cancelGrace, cancelReplace, cancelOpen, cancelStale],
  )

  return { popup, popupRef, hoverAnchor, leaveChart: beginGrace, popupEnter, popupLeave: beginGrace, pin, close }
}

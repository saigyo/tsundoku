import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import { fitCount } from '../lib/navOverflow'
import type { ViewId } from '../lib/types'
import styles from './NavOverflow.module.css'

/**
 * Einzeilige Navigation mit Überlaufmenü (Spec „Kopfzeile mit
 * Überlaufmenü"): Tabs, die nicht passen, wandern strikt vom Ende der
 * Reihenfolge in ein „Mehr ▾"-Menü. Markierung C1 — ist die aktive View
 * versteckt, zeigt der Knopf ihren Namen mit roter Linie; die sichtbaren
 * Tabs stehen immer an ihrem Platz.
 */
export function NavOverflow({
  views,
  active,
  onSelect,
}: {
  views: ViewId[]
  active: ViewId
  onSelect: (v: ViewId) => void
}) {
  const { m, locale } = useI18n()
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const menuWrapRef = useRef<HTMLSpanElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [visibleCount, setVisibleCount] = useState(views.length)
  const [open, setOpen] = useState(false)

  // Stabiler Schlüssel statt der Array-Referenz: `views` kommt bei App als
  // `VIEW_ORDER.filter(...)` bei jedem Render neu, sonst liefe der Effekt
  // unten bei jedem Render neu statt nur bei tatsächlich geänderter Menge.
  const viewsKey = views.join(',')

  // Messzeile: alle Tab-Labels plus alle möglichen Knopf-Zustände
  // (unsichtbar, nicht umbrechend). fitCount rechnet mit der maximalen
  // Knopfbreite — der Schnitt hängt damit nur von Breite und Sprache ab,
  // nie davon, welche View gerade aktiv ist.
  useLayoutEffect(() => {
    const nav = navRef.current
    const meas = measureRef.current
    if (nav === null || meas === null) return
    const compute = () => {
      const tabs = [...meas.querySelectorAll<HTMLElement>('[data-tab]')]
      const buttons = [...meas.querySelectorAll<HTMLElement>('[data-btn]')]
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 0
      const buttonWidth = Math.max(...buttons.map((el) => el.getBoundingClientRect().width), 0)
      setVisibleCount(
        fitCount(
          tabs.map((el) => el.getBoundingClientRect().width),
          buttonWidth,
          gap,
          nav.getBoundingClientRect().width,
        ),
      )
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(nav)
    // Auch die Messzeile beobachten: Ein Font-Swap (FOUT → Webfont fertig
    // geladen) ändert die Breite von `nav` nicht, wohl aber die der
    // Messzeile — sie ist absolut positioniert und schmiegt sich an ihren
    // Inhalt. Ohne diese zweite Beobachtung bliebe `visibleCount` auf Basis
    // der Fallback-Font-Breiten stehen.
    ro.observe(meas)
    return () => ro.disconnect()
    // locale in den Deps: neue Labels ⇒ neue Breiten messen.
  }, [viewsKey, locale])

  // View-Wechsel schließt das Menü (auch programmatisch, z. B. Back-Button).
  useEffect(() => {
    setOpen(false)
  }, [active])

  // Esc und Außenklick schließen — Listener nur bei offenem Menü.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      // Esc gibt den Fokus explizit an den Knopf zurück, sonst unmountet das
      // Menü das fokussierte Element und der Fokus fällt auf <body>.
      // Außenklick behält sein Standardverhalten (Fokus bleibt beim Klickziel).
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      const el = menuWrapRef.current
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const visible = views.slice(0, visibleCount)
  const hidden = views.slice(visibleCount)
  const activeHidden = hidden.includes(active)
  // Nur der Text ist Teil des zugänglichen Namens; das ▾-Glyph wird unten in
  // einem eigenen `aria-hidden`-Span gerendert (Screenreader lesen sonst
  // "Pfeil nach unten zeigend" als Teil des Buttonnamens mit vor).
  const buttonLabel = activeHidden ? m.nav[active] : m.app.moreMenu

  const tab = (id: ViewId) => (
    <button
      key={id}
      className={styles.navItem}
      aria-current={active === id ? 'page' : undefined}
      onClick={() => onSelect(id)}
    >
      {m.nav[id]}
    </button>
  )

  return (
    <nav aria-label={m.app.navAria} className={styles.nav} ref={navRef}>
      {visible.map(tab)}
      {hidden.length > 0 && (
        <span className={styles.menuWrap} ref={menuWrapRef}>
          <button
            ref={toggleRef}
            className={styles.navItem}
            aria-current={activeHidden ? 'page' : undefined}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {buttonLabel} <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <div className={styles.menu}>
              {hidden.map((id) => (
                <button
                  key={id}
                  className={active === id ? styles.itemActive : styles.item}
                  aria-current={active === id ? 'page' : undefined}
                  onClick={() => {
                    onSelect(id)
                    setOpen(false)
                    // Fokus zurück zum Knopf: sonst unmountet das Menü das
                    // fokussierte Item und der Fokus fällt auf <body>.
                    toggleRef.current?.focus()
                  }}
                >
                  {m.nav[id]}
                </button>
              ))}
            </div>
          )}
        </span>
      )}
      {/* Messzeile: nimmt an Layout und Zugänglichkeit nicht teil. */}
      <div className={styles.measure} ref={measureRef} aria-hidden="true">
        {views.map((id) => (
          <span key={id} data-tab className={styles.navItem}>
            {m.nav[id]}
          </span>
        ))}
        <span data-btn className={styles.navItem}>{`${m.app.moreMenu} ▾`}</span>
        {views.map((id) => (
          <span key={`b-${id}`} data-btn className={styles.navItem}>
            {`${m.nav[id]} ▾`}
          </span>
        ))}
      </div>
    </nav>
  )
}

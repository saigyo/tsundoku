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
  const [visibleCount, setVisibleCount] = useState(views.length)
  const [open, setOpen] = useState(false)

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
      const buttonWidth = Math.max(...buttons.map((el) => el.offsetWidth), 0)
      setVisibleCount(
        fitCount(tabs.map((el) => el.offsetWidth), buttonWidth, gap, nav.clientWidth),
      )
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(nav)
    return () => ro.disconnect()
    // locale in den Deps: neue Labels ⇒ neue Breiten messen.
  }, [views, locale])

  // View-Wechsel schließt das Menü (auch programmatisch, z. B. Back-Button).
  useEffect(() => {
    setOpen(false)
  }, [active])

  // Esc und Außenklick schließen — Listener nur bei offenem Menü.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
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
  const buttonLabel = `${activeHidden ? m.nav[active] : m.app.moreMenu} ▾`

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
            className={styles.navItem}
            aria-current={activeHidden ? 'page' : undefined}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {buttonLabel}
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

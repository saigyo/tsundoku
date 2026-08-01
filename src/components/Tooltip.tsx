import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Tooltip.module.css'

export function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Standard rechts vom Zeiger; reicht der Platz bis zum Fensterrand nicht,
  // springt der Tooltip auf die linke Seite um. useLayoutEffect misst vor dem
  // Paint, damit das Umspringen nicht als Flackern sichtbar wird.
  const [dx, setDx] = useState(12)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const parentLeft = el.offsetParent?.getBoundingClientRect().left ?? 0
    const overflows = parentLeft + x + 12 + el.offsetWidth > window.innerWidth - 8
    setDx(overflows ? -el.offsetWidth - 12 : 12)
  }, [x, y, children])

  return (
    <div ref={ref} className={styles.tip} style={{ transform: `translate(${x + dx}px, ${y + 12}px)` }}>
      {children}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

/** Beobachtet die Breite eines Elements (für responsive SVG-Viewports). */
export function useMeasure<T extends Element>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0].contentRect.width))
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

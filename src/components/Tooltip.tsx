import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

export function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className={styles.tip} style={{ transform: `translate(${x + 12}px, ${y + 12}px)` }}>
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'
import { fmtInt } from '../lib/format'
import styles from './CoverageNote.module.css'

/** „935 von 4.865 Titeln haben …" — jede View weist ihre Datengrundlage aus. */
export function CoverageNote({ covered, total, unit = 'Titeln', children }: {
  covered: number
  total: number
  unit?: string
  children: ReactNode
}) {
  return (
    <p className={styles.note}>
      <span className={styles.numbers}>{fmtInt(covered)} von {fmtInt(total)}</span> {unit} {children}
    </p>
  )
}

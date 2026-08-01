import type { ReactNode } from 'react'
import { useI18n } from '../i18n/LocaleContext'
import styles from './CoverageNote.module.css'

/** Zahlen-Akzent der Abdeckungszeile — für Anzahlen im Fließtext der Views. */
export function Num({ children }: { children: ReactNode }) {
  return <span className={styles.num}>{children}</span>
}

/** „935 von 4.865 Titeln haben …" — jede View weist ihre Datengrundlage aus. */
export function CoverageNote({ covered, total, unit, children }: {
  covered: number
  total: number
  unit?: string
  children: ReactNode
}) {
  const { m, fmtInt } = useI18n()
  return (
    <p className={styles.note}>
      {m.coverage.frame(
        <span className={styles.num}>{fmtInt(covered)}</span>,
        <span className={styles.num}>{fmtInt(total)}</span>,
        unit ?? m.coverage.unitTitles,
      )}{' '}
      {children}
    </p>
  )
}

import { useI18n } from '../i18n/LocaleContext'
import { useLibraryData } from '../lib/DataContext'
import styles from './DataSummary.module.css'

export function DataSummary() {
  const { m, fmtInt } = useI18n()
  const { books, filtered } = useLibraryData()
  const read = filtered.filter((b) => b.hasRead).length
  const pages = filtered.reduce((s, b) => s + (b.pages ?? 0), 0)
  const cells: [string, string][] = [
    [m.summary.titles, fmtInt(filtered.length)],
    [m.summary.read, fmtInt(read)],
    [m.summary.pages, fmtInt(pages)],
  ]
  return (
    <div className={styles.grid}>
      {cells.map(([label, value]) => (
        <div key={label} className={styles.cell}>
          <div className={styles.value}>{value}</div>
          <div className={styles.label}>{label}</div>
        </div>
      ))}
      {filtered.length < books.length && (
        <p className={styles.hint}>{m.summary.filteredFrom(fmtInt(books.length))}</p>
      )}
    </div>
  )
}

import { fmtInt } from '../lib/format'
import { useLibraryData } from '../lib/DataContext'
import styles from './DataSummary.module.css'

export function DataSummary() {
  const { books, filtered } = useLibraryData()
  const read = filtered.filter((b) => b.hasRead).length
  const pages = filtered.reduce((s, b) => s + (b.pages ?? 0), 0)
  const cells: [string, string][] = [
    ['Titel', fmtInt(filtered.length)],
    ['davon gelesen', fmtInt(read)],
    ['Seiten', fmtInt(pages)],
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
        <p className={styles.hint}>gefiltert aus {fmtInt(books.length)} Titeln</p>
      )}
    </div>
  )
}

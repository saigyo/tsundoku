import { filterLabel, useFilterStore } from '../store/filters'
import styles from './EmptyState.module.css'

/** Leere Treffermenge: nennt die greifenden Filter und bietet an, sie zu lösen. */
export function EmptyState() {
  const filters = useFilterStore((s) => s.filters)
  const removeFilter = useFilterStore((s) => s.removeFilter)
  const clearFilters = useFilterStore((s) => s.clearFilters)
  return (
    <div className={styles.box}>
      <h3>Keine Titel im aktuellen Filter</h3>
      <p>Diese Filter greifen gerade:</p>
      <ul>
        {filters.map((f) => {
          const label = filterLabel(f)
          return (
            <li key={label}>
              {label}{' '}
              <button className={styles.release} onClick={() => removeFilter(f)}>
                lösen
              </button>
            </li>
          )
        })}
      </ul>
      <button onClick={clearFilters}>Alle Filter lösen</button>
    </div>
  )
}

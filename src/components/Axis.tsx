import styles from './Axis.module.css'

export function AxisBottom({ ticks, y }: { ticks: { x: number; label: string }[]; y: number }) {
  return (
    <g className={styles.axis}>
      {ticks.map((t) => (
        <g key={t.x} transform={`translate(${t.x},${y})`}>
          <line y2={4} className={styles.tick} />
          <text y={16} textAnchor="middle" className={styles.label}>
            {t.label}
          </text>
        </g>
      ))}
    </g>
  )
}

export function AxisLeft({ ticks, x }: { ticks: { y: number; label: string }[]; x: number }) {
  return (
    <g className={styles.axis}>
      {ticks.map((t) => (
        <g key={t.y} transform={`translate(${x},${t.y})`}>
          <line x2={-4} className={styles.tick} />
          <text x={-8} dy="0.32em" textAnchor="end" className={styles.label}>
            {t.label}
          </text>
        </g>
      ))}
    </g>
  )
}

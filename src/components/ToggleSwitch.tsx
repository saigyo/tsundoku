import { useId } from 'react'
import styles from './ToggleSwitch.module.css'

interface Option<V extends string> {
  value: V
  label: string
}

/** Zweiwertiger Schiebeschalter: visuell ein Segment-Widget mit gleitendem
 *  Daumen, technisch eine Radio-Gruppe — Tastatur- und Screenreader-Semantik
 *  kommen von den nativen Inputs, nicht von ARIA-Nachbauten. */
export function ToggleSwitch<V extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: V
  options: readonly [Option<V>, Option<V>]
  onChange: (v: V) => void
  ariaLabel: string
}) {
  const name = useId()
  return (
    <span
      className={styles.switch}
      role="radiogroup"
      aria-label={ariaLabel}
      data-side={value === options[1].value ? 'b' : 'a'}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? styles.optionChecked : styles.option}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </span>
  )
}

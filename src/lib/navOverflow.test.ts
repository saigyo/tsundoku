import { describe, expect, it } from 'vitest'
import { fitCount } from './navOverflow'

describe('fitCount', () => {
  it('alles passt ohne Knopf', () => {
    // 100 + 8 + 100 = 208 ≤ 300
    expect(fitCount([100, 100], 80, 8, 300)).toBe(2)
  })

  it('exakte Breite passt noch', () => {
    // 100 + 8 + 100 + 8 + 100 = 316
    expect(fitCount([100, 100, 100], 80, 8, 316)).toBe(3)
  })

  it('Knopf verdrängt den letzten Tab', () => {
    // 316 > 315 → Überlauf; 2 Tabs + Knopf: 80 + (100+8) + (100+8) = 296 ≤ 315
    expect(fitCount([100, 100, 100], 80, 8, 315)).toBe(2)
  })

  it('nichts passt', () => {
    // Schon 80 + 100 + 8 = 188 > 50 → 0 Tabs, nur der Knopf
    expect(fitCount([100, 100], 80, 8, 50)).toBe(0)
  })

  it('leere Liste', () => {
    expect(fitCount([], 80, 8, 100)).toBe(0)
  })
})

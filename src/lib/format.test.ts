import { describe, expect, it } from 'vitest'
import { fmtInt } from './format'

describe('fmtInt', () => {
  it('formatiert de-DE mit Punkt', () => {
    expect(fmtInt(1359074)).toBe('1.359.074')
  })
})

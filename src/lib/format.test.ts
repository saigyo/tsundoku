import { expect, it } from 'vitest'
import { fmtYear } from './format'

it('formatiert Jahre ohne Tausendertrennung', () => {
  expect(fmtYear(1998)).toBe('1998')
})

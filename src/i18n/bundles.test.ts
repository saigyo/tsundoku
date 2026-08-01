import { describe, expect, it } from 'vitest'
import { BUNDLES } from './bundles'
import { de } from './de'
import { SUPPORTED_LOCALES } from './messages'

describe('bundles', () => {
  it.each(SUPPORTED_LOCALES)('%s: Funktions-Messages liefern nicht-leere Strings', (locale) => {
    const m = BUNDLES[locale]
    if (m !== de) expect(m.locale).toBe(locale)
    expect(m.app.loadError('HTTP 500')).toContain('HTTP 500')
    expect(m.upload.errTooLarge('60', '50').length).toBeGreaterThan(0)
    expect(m.upload.errTooMany('10.000').length).toBeGreaterThan(0)
    expect(m.report.readValue('1.334', '1.334', '935', 1988).length).toBeGreaterThan(0)
    expect(m.report.readValue('1.334', '1.334', '935', null).length).toBeGreaterThan(0)
    expect(m.report.readDaysValue(4, 20, 209).length).toBeGreaterThan(0)
    expect(m.filter.tag('Japan')).toContain('Japan')
    expect(m.filter.acquired(2010, 2015)).toContain('2010')
    expect(m.chips.removeAria('X').length).toBeGreaterThan(0)
    expect(m.views.shelf.decade(1990).length).toBeGreaterThan(0)
    expect(m.views.network.nodeTitle('Japan', '948')).toContain('Japan')
    expect(m.views.years.tooltip(1998, 2005, '3')).toContain('1998')
    expect(m.views.pace.dotTitle('T', '300', '4', true).length).toBeGreaterThan(0)
    expect(m.views.canon.counts('12', '5').length).toBeGreaterThan(0)
    expect(Object.keys(m.ddc.labels)).toHaveLength(10)
    expect(Object.keys(m.ddc.short)).toHaveLength(10)
  })
})

import { describe, expect, it } from 'vitest'
import { isCanonicalDate, parseVisitDate } from './dates.ts'

describe('parseVisitDate', () => {
  it('P11: accepts a canonical YYYY-MM-DD date and returns it unchanged', () => {
    expect(parseVisitDate('2026-07-04')).toBe('2026-07-04')
  })

  it('P11: trims surrounding whitespace before validating', () => {
    expect(parseVisitDate('  2026-07-04  ')).toBe('2026-07-04')
  })

  it('P11: accepts the first and last day of a month', () => {
    expect(parseVisitDate('2026-01-01')).toBe('2026-01-01')
    expect(parseVisitDate('2026-12-31')).toBe('2026-12-31')
  })

  it('P11: accepts 2024-02-29 in a leap year and rejects 2026-02-29 in a common year', () => {
    expect(parseVisitDate('2024-02-29')).toBe('2024-02-29')
    expect(parseVisitDate('2026-02-29')).toBeNull()
  })

  it('P11: applies the century leap-year rule (2000-02-29 valid, 1900-02-29 invalid)', () => {
    expect(parseVisitDate('2000-02-29')).toBe('2000-02-29')
    expect(parseVisitDate('1900-02-29')).toBeNull()
  })

  it('P11: rejects calendar-invalid dates 2026-02-30, 2026-13-01 and 2026-00-10', () => {
    expect(parseVisitDate('2026-02-30')).toBeNull()
    expect(parseVisitDate('2026-13-01')).toBeNull()
    expect(parseVisitDate('2026-00-10')).toBeNull()
    expect(parseVisitDate('2026-07-00')).toBeNull()
    expect(parseVisitDate('2026-04-31')).toBeNull()
  })

  it('P11: rejects US-format 07/04/2026', () => {
    expect(parseVisitDate('07/04/2026')).toBeNull()
  })

  it('P11: rejects unpadded 2026-7-4', () => {
    expect(parseVisitDate('2026-7-4')).toBeNull()
  })

  it('P11: rejects an ISO datetime 2026-07-04T10:00:00Z', () => {
    expect(parseVisitDate('2026-07-04T10:00:00Z')).toBeNull()
  })

  it('P11: rejects a two-digit year 26-07-04', () => {
    expect(parseVisitDate('26-07-04')).toBeNull()
  })

  it('P5: rejects a blank or whitespace-only value', () => {
    expect(parseVisitDate('')).toBeNull()
    expect(parseVisitDate('   ')).toBeNull()
  })

  it('P11: isCanonicalDate mirrors parseVisitDate', () => {
    expect(isCanonicalDate('2026-07-04')).toBe(true)
    expect(isCanonicalDate('2026-02-30')).toBe(false)
    expect(isCanonicalDate('07/04/2026')).toBe(false)
  })
})

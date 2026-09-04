import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  applyFilters,
  filterByDateRange,
  filterByLocation,
  filterByMinWait,
  locationOptions,
} from './filters.ts'
import { FIXTURE_VISITS } from './fixtures/visits.fixture.ts'
import type { Visit } from './types.ts'

function ids(visits: readonly Visit[]): string[] {
  return visits.map((visit) => visit.visitId)
}

describe('filterByDateRange', () => {
  it('P12: date range is inclusive on both ends', () => {
    expect(ids(filterByDateRange(FIXTURE_VISITS, '2026-07-02', '2026-07-05'))).toEqual([
      'K002',
      'K003',
      'K004',
      'K005',
      'K006',
    ])
    expect(ids(filterByDateRange(FIXTURE_VISITS, null, '2026-07-05'))).toContain('K001')
    expect(ids(filterByDateRange(FIXTURE_VISITS, '2026-07-02', null))).toEqual([
      'K002',
      'K003',
      'K004',
      'K005',
      'K006',
      'K007',
      'K008',
    ])
  })

  it('P12: an inclusive range across a year boundary includes both endpoints', () => {
    const visits: Visit[] = [
      { ...FIXTURE_VISITS[0], visitId: 'Y1', visitDate: '2026-12-30' },
      { ...FIXTURE_VISITS[0], visitId: 'Y2', visitDate: '2026-12-31' },
      { ...FIXTURE_VISITS[0], visitId: 'Y3', visitDate: '2027-01-01' },
      { ...FIXTURE_VISITS[0], visitId: 'Y4', visitDate: '2027-01-02' },
    ]
    expect(ids(filterByDateRange(visits, '2026-12-31', '2027-01-01'))).toEqual(['Y2', 'Y3'])
  })
})

describe('filterByLocation', () => {
  it('D9: location filter matches exactly and treats "Unknown" as a normal group', () => {
    expect(ids(filterByLocation(FIXTURE_VISITS, 'Unknown'))).toEqual(['K007', 'K008'])
    expect(ids(filterByLocation(FIXTURE_VISITS, null))).toHaveLength(8)
    expect(locationOptions(FIXTURE_VISITS)).toEqual(['Bethesda, MD', 'Hoboken, NJ', 'Unknown'])
  })
})

describe('locationOptions', () => {
  it('AC-19/CF-3: case-only and accent-only pairs sort adjacent and deterministically under the en base-sensitivity pin', () => {
    const names = ['Zürich', 'boston', 'Zurich', 'Boston', 'Unknown']
    const visits: Visit[] = names.map((location, index) => ({
      ...FIXTURE_VISITS[0],
      visitId: `L${index}`,
      location,
    }))
    // "boston"/"Boston" and "Zürich"/"Zurich" each compare equal under base
    // sensitivity, so the stable sort keeps their first-seen order: the result
    // is fully determined by the pinned locale, not by the machine's default.
    expect(locationOptions(visits)).toEqual(['boston', 'Boston', 'Zürich', 'Zurich', 'Unknown'])
  })
})

describe('filterByMinWait', () => {
  it('P14/D7: a blank threshold means no wait filtering; an active threshold excludes null waits and includes zero', () => {
    expect(ids(filterByMinWait(FIXTURE_VISITS, null))).toHaveLength(8)
    expect(ids(filterByMinWait(FIXTURE_VISITS, 0))).toEqual([
      'K001',
      'K002',
      'K004',
      'K005',
      'K006',
    ])
    expect(ids(filterByMinWait(FIXTURE_VISITS, 15))).toEqual(['K001', 'K002', 'K005'])
  })
})

describe('applyFilters', () => {
  it('applyFilters composes the three filters', () => {
    const filtered = applyFilters(FIXTURE_VISITS, {
      startDate: '2026-07-02',
      endDate: '2026-07-05',
      location: 'Hoboken, NJ',
      minWait: 10,
    })
    expect(ids(filtered)).toEqual(['K004', 'K005'])
    expect(ids(applyFilters(FIXTURE_VISITS, DEFAULT_FILTERS))).toHaveLength(8)
  })
})

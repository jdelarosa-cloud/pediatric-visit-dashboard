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
import {
  averageWait,
  averageWaitByLocation,
  computeKpis,
  countLocations,
  countVisits,
  topReasons,
} from './kpis.ts'
import type { Visit } from './types.ts'

describe('countVisits', () => {
  it('countVisits reflects the set it is given', () => {
    expect(countVisits(FIXTURE_VISITS)).toBe(8)
    expect(countVisits(filterByMinWait(FIXTURE_VISITS, 15))).toBe(3)
  })
})

describe('overview KPIs', () => {
  it('calculates the overall average from recorded waits only and treats zero as recorded', () => {
    // (25 + 15 + 10 + 35 + 0) / 5 = 17; three null waits are excluded.
    expect(averageWait(FIXTURE_VISITS)).toBe(17)
    expect(averageWait(filterByLocation(FIXTURE_VISITS, 'Hoboken, NJ'))).toBe(15)
  })

  it('returns null when no visit has a recorded wait', () => {
    expect(averageWait(filterByLocation(FIXTURE_VISITS, 'Unknown'))).toBeNull()
    expect(averageWait([])).toBeNull()
  })

  it('counts distinct locations in the filtered set, including Unknown', () => {
    expect(countLocations(FIXTURE_VISITS)).toBe(3)
    expect(countLocations(filterByLocation(FIXTURE_VISITS, 'Unknown'))).toBe(1)
    expect(countLocations([])).toBe(0)
  })
})

describe('averageWaitByLocation', () => {
  it('P9/D11: average wait per location excludes nulls, counts zero, keeps Unknown, and reports a null average when no waits exist', () => {
    // Bethesda: (25 + 15) / 2 = 20, K003's null wait is excluded, not zero.
    // Hoboken: (10 + 35 + 0) / 3 = 15, K006's zero is a real wait.
    const stats = averageWaitByLocation(FIXTURE_VISITS)
    expect(stats).toEqual([
      { location: 'Bethesda, MD', avgWait: 20, visits: 3, withWait: 2 },
      { location: 'Hoboken, NJ', avgWait: 15, visits: 3, withWait: 3 },
      { location: 'Unknown', avgWait: null, visits: 2, withWait: 0 },
    ])
    // Treating the null as a zero would give (25 + 15 + 0) / 3 instead.
    expect(stats[0]?.avgWait).not.toBe(40 / 3)
  })
})

describe('averageWaitByLocation tie-breaks', () => {
  function visit(location: string, waitTimeMinutes: number | null, index: number): Visit {
    return { ...FIXTURE_VISITS[0], visitId: `T${index}`, location, waitTimeMinutes }
  }

  it('AC-19/CF-3: equal averages and equal null averages both fall through to the pinned location comparison', () => {
    const stats = averageWaitByLocation([
      visit('Boston', 20, 1),
      visit('Albany', 20, 2),
      visit('Zurich', null, 3),
      visit('Denver', null, 4),
    ])
    expect(stats.map((stat) => stat.location)).toEqual(['Albany', 'Boston', 'Denver', 'Zurich'])
    expect(stats.map((stat) => stat.avgWait)).toEqual([20, 20, null, null])
  })

  it('AC-19/CF-3: an accent-only pair with equal averages keeps its first-seen order under base sensitivity', () => {
    const stats = averageWaitByLocation([visit('Zürich', 20, 5), visit('Zurich', 20, 6)])
    expect(stats.map((stat) => stat.location)).toEqual(['Zürich', 'Zurich'])
  })
})

describe('topReasons', () => {
  it('P13: top reasons trim and case-fold, sort by count then alphabetically, and cap at three', () => {
    expect(topReasons(FIXTURE_VISITS)).toEqual([
      { reason: 'Fever', count: 3 },
      { reason: 'Cough', count: 2 },
      { reason: 'Rash', count: 2 },
    ])
    // In this subset K003 (" fever ") is the first row of its group, so the
    // displayed spelling is its trimmed form. Real parsed data cannot hit this:
    // parseVisitsCsv already folds every spelling of a reason to the first one
    // seen in the whole file (P15).
    expect(topReasons(filterByDateRange(FIXTURE_VISITS, '2026-07-02', '2026-07-05'))).toEqual([
      { reason: 'Cough', count: 2 },
      { reason: 'fever', count: 2 },
      { reason: 'Rash', count: 1 },
    ])
    expect(topReasons(FIXTURE_VISITS, 2)).toEqual([
      { reason: 'Fever', count: 3 },
      { reason: 'Cough', count: 2 },
    ])
  })
})

describe('purity', () => {
  it('inputs are never mutated', () => {
    const before = JSON.stringify(FIXTURE_VISITS)

    filterByDateRange(FIXTURE_VISITS, '2026-07-02', '2026-07-05')
    filterByLocation(FIXTURE_VISITS, 'Hoboken, NJ')
    filterByMinWait(FIXTURE_VISITS, 0)
    applyFilters(FIXTURE_VISITS, DEFAULT_FILTERS)
    locationOptions(FIXTURE_VISITS)
    countVisits(FIXTURE_VISITS)
    averageWaitByLocation(FIXTURE_VISITS)
    topReasons(FIXTURE_VISITS)
    averageWait(FIXTURE_VISITS)
    countLocations(FIXTURE_VISITS)
    const kpis = computeKpis(FIXTURE_VISITS)

    expect(JSON.stringify(FIXTURE_VISITS)).toBe(before)
    expect(FIXTURE_VISITS.map((visit) => visit.visitId)).toEqual([
      'K001',
      'K002',
      'K003',
      'K004',
      'K005',
      'K006',
      'K007',
      'K008',
    ])
    expect(kpis.totalVisits).toBe(8)
    expect(kpis.overallAvgWait).toBe(17)
    expect(kpis.locationCount).toBe(3)
    expect(kpis.visitsWithoutWait).toBe(3)
  })
})

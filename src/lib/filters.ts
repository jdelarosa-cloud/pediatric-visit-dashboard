import { UNKNOWN_LOCATION } from './normalizeRow.ts'
import type { Filters, Visit } from './types.ts'

export const DEFAULT_FILTERS: Filters = {
  startDate: null,
  endDate: null,
  location: null,
  minWait: null,
}

export function filterByDateRange(
  visits: readonly Visit[],
  startDate: string | null,
  endDate: string | null,
): Visit[] {
  // Canonical dates are zero-padded YYYY-MM-DD, so lexicographic order is
  // chronological order. Comparing the strings keeps the inclusive bounds exact
  // and avoids Date objects entirely, which is what P11 requires.
  return visits.filter((visit) => {
    if (startDate !== null && visit.visitDate < startDate) return false
    if (endDate !== null && visit.visitDate > endDate) return false
    return true
  })
}

export function filterByLocation(visits: readonly Visit[], location: string | null): Visit[] {
  if (location === null) return [...visits]
  return visits.filter((visit) => visit.location === location)
}

export function filterByMinWait(visits: readonly Visit[], minWait: number | null): Visit[] {
  if (minWait === null) return [...visits]
  return visits.filter(
    (visit) => visit.waitTimeMinutes !== null && visit.waitTimeMinutes >= minWait,
  )
}

export function applyFilters(visits: readonly Visit[], filters: Filters): Visit[] {
  const byDate = filterByDateRange(visits, filters.startDate, filters.endDate)
  const byLocation = filterByLocation(byDate, filters.location)
  return filterByMinWait(byLocation, filters.minWait)
}

export function locationOptions(visits: readonly Visit[]): string[] {
  const unique = [...new Set(visits.map((visit) => visit.location))]
  return unique.sort((a, b) => {
    if (a === UNKNOWN_LOCATION) return b === UNKNOWN_LOCATION ? 0 : 1
    if (b === UNKNOWN_LOCATION) return -1
    return a.localeCompare(b)
  })
}

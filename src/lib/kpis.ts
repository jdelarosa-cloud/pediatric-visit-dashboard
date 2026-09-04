import type { Kpis, LocationWaitStat, ReasonCount, Visit } from './types.ts'

type LocationGroup = {
  location: string
  sum: number
  visits: number
  withWait: number
}

export function countVisits(visits: readonly Visit[]): number {
  return visits.length
}

export function averageWait(visits: readonly Visit[]): number | null {
  let sum = 0
  let recorded = 0

  for (const visit of visits) {
    if (visit.waitTimeMinutes === null) continue
    sum += visit.waitTimeMinutes
    recorded += 1
  }

  return recorded === 0 ? null : sum / recorded
}

export function countLocations(visits: readonly Visit[]): number {
  return new Set(visits.map((visit) => visit.location)).size
}

export function averageWaitByLocation(visits: readonly Visit[]): LocationWaitStat[] {
  const groups = new Map<string, LocationGroup>()

  for (const visit of visits) {
    let group = groups.get(visit.location)
    if (group === undefined) {
      group = { location: visit.location, sum: 0, visits: 0, withWait: 0 }
      groups.set(visit.location, group)
    }
    group.visits += 1
    if (visit.waitTimeMinutes !== null) {
      group.sum += visit.waitTimeMinutes
      group.withWait += 1
    }
  }

  const stats: LocationWaitStat[] = [...groups.values()].map((group) => ({
    location: group.location,
    avgWait: group.withWait === 0 ? null : group.sum / group.withWait,
    visits: group.visits,
    withWait: group.withWait,
  }))

  return stats.sort((a, b) => {
    if (a.avgWait === null || b.avgWait === null) {
      if (a.avgWait === b.avgWait) {
        return a.location.localeCompare(b.location, 'en', { sensitivity: 'base' })
      }
      return a.avgWait === null ? 1 : -1
    }
    if (a.avgWait !== b.avgWait) return b.avgWait - a.avgWait
    return a.location.localeCompare(b.location, 'en', { sensitivity: 'base' })
  })
}

export function topReasons(visits: readonly Visit[], limit = 3): ReasonCount[] {
  const groups = new Map<string, ReasonCount>()

  for (const visit of visits) {
    const display = visit.visitReason.trim()
    const key = display.toLowerCase()
    const existing = groups.get(key)
    if (existing === undefined) {
      groups.set(key, { reason: display, count: 1 })
    } else {
      existing.count += 1
    }
  }

  const counts = [...groups.values()]
  counts.sort(
    (a, b) =>
      b.count - a.count || a.reason.localeCompare(b.reason, 'en', { sensitivity: 'base' }),
  )
  return counts.slice(0, limit)
}

export function computeKpis(visits: readonly Visit[]): Kpis {
  return {
    totalVisits: countVisits(visits),
    overallAvgWait: averageWait(visits),
    locationCount: countLocations(visits),
    avgWaitByLocation: averageWaitByLocation(visits),
    topReasons: topReasons(visits),
    visitsWithoutWait: visits.filter((visit) => visit.waitTimeMinutes === null).length,
  }
}

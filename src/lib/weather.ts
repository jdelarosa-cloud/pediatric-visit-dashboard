import { UNKNOWN_LOCATION } from './normalizeRow.ts'
import type { GeocodeMatch, DailyWeather, Visit, WeatherRange, WeatherSummary } from './types.ts'

/** Open-Meteo's archive starts in 1940; earlier dates return an error, not empty data (D13). */
export const ARCHIVE_MIN_DATE = '1940-01-01'

/** A day counts as rainy at this many inches or more (D15). */
export const RAINY_DAY_INCHES = 0.01

const STATE_NAMES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
]

const STATE_ABBREVIATIONS = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]

/** Lower-cased abbreviation and full name to the canonical name Open-Meteo returns in `admin1`. */
export const US_STATES: Record<string, string> = Object.fromEntries(
  STATE_NAMES.flatMap((name, index) => [
    [name.toLowerCase(), name],
    [STATE_ABBREVIATIONS[index].toLowerCase(), name],
  ]),
)

export type LocationQuery = {
  query: string
  stateHint: string | null
}

export function parseLocationQuery(location: string): LocationQuery {
  const trimmed = location.trim()
  const lastComma = trimmed.lastIndexOf(',')
  if (lastComma === -1) return { query: trimmed, stateHint: null }

  const head = trimmed.slice(0, lastComma).trim()
  const tail = trimmed.slice(lastComma + 1).trim().toLowerCase()
  const stateHint = US_STATES[tail]
  // An unrecognised tail is kept in the query: "Zurich, CH" is a real place
  // name that geocodes fine, while stripping the tail could resolve a
  // different "Zurich" entirely (D14).
  if (stateHint === undefined || head === '') return { query: trimmed, stateHint: null }
  return { query: head, stateHint }
}

export function pickGeocodeMatch(
  results: readonly GeocodeMatch[],
  stateHint: string | null,
): GeocodeMatch | null {
  if (results.length === 0) return null
  if (stateHint !== null) {
    const inState = results.find((result) => result.admin1 === stateHint)
    if (inState !== undefined) return inState
  }
  return results[0]
}

export type WeatherRangeInput = {
  startDate: string | null
  endDate: string | null
  visits: readonly Visit[]
  today: string
}

export function effectiveWeatherRange({
  startDate,
  endDate,
  visits,
  today,
}: WeatherRangeInput): WeatherRange {
  if (visits.length === 0) return { kind: 'no-visits' }

  // Canonical YYYY-MM-DD sorts lexicographically in date order (P11), so the
  // intersection is plain string comparison with no Date objects involved.
  let min = visits[0].visitDate
  let max = visits[0].visitDate
  for (const visit of visits) {
    if (visit.visitDate < min) min = visit.visitDate
    if (visit.visitDate > max) max = visit.visitDate
  }

  const start = startDate !== null && startDate > min ? startDate : min
  let end = endDate !== null && endDate < max ? endDate : max

  if (start < ARCHIVE_MIN_DATE) return { kind: 'unsupported' }
  if (start > today) return { kind: 'future' }
  if (end > today) end = today
  if (start > end) return { kind: 'future' }

  return { kind: 'range', start, end }
}

export function summarizeDailyWeather(daily: DailyWeather): WeatherSummary | null {
  const temps = daily.temperature_2m_mean ?? []
  const precip = daily.precipitation_sum ?? []
  const length = Math.max(temps.length, precip.length)

  let tempSum = 0
  let tempDays = 0
  let precipSum = 0
  let precipDays = 0
  let rainyDays = 0
  let days = 0

  for (let index = 0; index < length; index += 1) {
    const temp = temps[index] ?? null
    const rain = precip[index] ?? null
    if (temp === null && rain === null) continue
    days += 1
    if (temp !== null) {
      tempSum += temp
      tempDays += 1
    }
    if (rain !== null) {
      precipSum += rain
      precipDays += 1
      if (rain >= RAINY_DAY_INCHES) rainyDays += 1
    }
  }

  if (days === 0) return null
  return {
    days,
    avgTemp: tempDays === 0 ? null : tempSum / tempDays,
    totalPrecip: precipDays === 0 ? null : precipSum,
    rainyDays,
  }
}

export function weatherRequestKey(
  location: string,
  range: { start: string; end: string },
): string {
  return `${location}|${range.start}|${range.end}`
}

export function weatherGate(location: string | null): 'all' | 'unknown' | 'ok' {
  if (location === null || location.trim() === '') return 'all'
  // D8 folds every spelling of the placeholder, so a case-insensitive check
  // covers any "unknown" that reached the filter (D14: never geocoded).
  if (location.trim().toLowerCase() === UNKNOWN_LOCATION.toLowerCase()) return 'unknown'
  return 'ok'
}

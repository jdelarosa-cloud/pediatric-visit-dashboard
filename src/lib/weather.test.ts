import { describe, expect, it } from 'vitest'
import { FIXTURE_VISITS } from './fixtures/visits.fixture.ts'
import type { DailyWeather, GeocodeMatch, Visit } from './types.ts'
import {
  effectiveWeatherRange,
  parseLocationQuery,
  pickGeocodeMatch,
  safeWeatherLocationQuery,
  summarizeDailyWeather,
  weatherGate,
  weatherRequestKey,
} from './weather.ts'

function visitsOn(dates: string[]): Visit[] {
  return dates.map((visitDate, index) => ({
    ...FIXTURE_VISITS[0],
    visitId: `W${index}`,
    visitDate,
  }))
}

function match(name: string, admin1: string | null): GeocodeMatch {
  return { name, admin1, country: 'United States', latitude: 1, longitude: 2 }
}

function daily(mean: (number | null)[], precip: (number | null)[]): DailyWeather {
  return {
    time: mean.map((_unused, index) => `2026-07-0${index + 1}`),
    temperature_2m_mean: mean,
    temperature_2m_max: mean,
    temperature_2m_min: mean,
    precipitation_sum: precip,
  }
}

describe('parseLocationQuery', () => {
  it('D14: a two-letter state abbreviation after the last comma becomes the canonical state hint', () => {
    expect(parseLocationQuery('Bethesda, MD')).toEqual({ query: 'Bethesda', stateHint: 'Maryland' })
    expect(parseLocationQuery('Paris, TX')).toEqual({ query: 'Paris', stateHint: 'Texas' })
  })

  it('D14: a spelled-out state name is recognised the same way', () => {
    expect(parseLocationQuery('Bethesda, Maryland')).toEqual({
      query: 'Bethesda',
      stateHint: 'Maryland',
    })
  })

  it('D14: a location with no comma has no hint', () => {
    expect(parseLocationQuery('Bethesda')).toEqual({ query: 'Bethesda', stateHint: null })
  })

  it('D14: an unknown tail is left in the query rather than stripped', () => {
    expect(parseLocationQuery('Zurich, CH')).toEqual({ query: 'Zurich, CH', stateHint: null })
  })

  it('D14: surrounding whitespace is trimmed from both parts', () => {
    expect(parseLocationQuery('  Forest Hills ,  ny  ')).toEqual({
      query: 'Forest Hills',
      stateHint: 'New York',
    })
    expect(parseLocationQuery('  Hoboken  ')).toEqual({ query: 'Hoboken', stateHint: null })
  })
})

describe('pickGeocodeMatch', () => {
  it('D14: the hint picks the matching admin1 even when it is not first', () => {
    const results = [match('Bethesda', 'Ohio'), match('Bethesda', 'Maryland')]
    expect(pickGeocodeMatch(results, 'Maryland')).toBe(results[1])
  })

  it('D14: with no hint the API order decides', () => {
    const results = [match('Paris', 'Ile-de-France'), match('Paris', 'Texas')]
    expect(pickGeocodeMatch(results, null)).toBe(results[0])
  })

  it('D14: a hint that matches nothing falls back to the first result', () => {
    const results = [match('Springfield', 'Illinois'), match('Springfield', 'Missouri')]
    expect(pickGeocodeMatch(results, 'Maryland')).toBe(results[0])
  })

  it('D14: an empty result list gives null', () => {
    expect(pickGeocodeMatch([], 'Maryland')).toBeNull()
    expect(pickGeocodeMatch([], null)).toBeNull()
  })
})

describe('effectiveWeatherRange', () => {
  const today = '2026-09-03'

  it('D13: the range is the intersection of the filter bounds and the visits span', () => {
    expect(
      effectiveWeatherRange({
        startDate: '2026-07-03',
        endDate: '2026-07-08',
        visits: visitsOn(['2026-07-01', '2026-07-10']),
        today,
      }),
    ).toEqual({ kind: 'range', start: '2026-07-03', end: '2026-07-08' })
  })

  it('D13: null filter bounds fall back to the visits min and max', () => {
    expect(
      effectiveWeatherRange({
        startDate: null,
        endDate: null,
        visits: visitsOn(['2026-07-10', '2026-07-01', '2026-07-05']),
        today,
      }),
    ).toEqual({ kind: 'range', start: '2026-07-01', end: '2026-07-10' })
  })

  it('D13: the end is clamped to today because the archive rejects future dates', () => {
    expect(
      effectiveWeatherRange({
        startDate: null,
        endDate: '2026-12-31',
        visits: visitsOn(['2026-08-01', '2026-12-31']),
        today,
      }),
    ).toEqual({ kind: 'range', start: '2026-08-01', end: today })
  })

  it('D13: a start after today is not requested', () => {
    expect(
      effectiveWeatherRange({
        startDate: null,
        endDate: null,
        visits: visitsOn(['2026-10-01', '2026-10-05']),
        today,
      }),
    ).toEqual({ kind: 'future' })
  })

  it('D13: a start before 1940-01-01 is outside the archive', () => {
    expect(
      effectiveWeatherRange({
        startDate: null,
        endDate: null,
        visits: visitsOn(['1939-12-31', '2026-07-01']),
        today,
      }),
    ).toEqual({ kind: 'unsupported' })
  })

  it('D13: no visits means there is no range to look up', () => {
    expect(effectiveWeatherRange({ startDate: null, endDate: null, visits: [], today })).toEqual({
      kind: 'no-visits',
    })
  })

  it('D13: a start greater than the end after clamping is not requested', () => {
    expect(
      effectiveWeatherRange({
        startDate: null,
        endDate: '2026-07-01',
        visits: visitsOn(['2026-07-05', '2026-07-10']),
        today,
      }),
    ).toEqual({ kind: 'future' })
  })
})

describe('summarizeDailyWeather', () => {
  it('D15: averages temperatures, sums precipitation, and counts rainy days over a three-day span', () => {
    const summary = summarizeDailyWeather(daily([60, 70, null], [0, 0.25, 0.5]))
    expect(summary).toEqual({ days: 3, avgTemp: 65, totalPrecip: 0.75, rainyDays: 2 })
  })

  it('D15: a rainy day starts at exactly 0.01 inches', () => {
    const summary = summarizeDailyWeather(daily([60, 60], [0.009, 0.01]))
    expect(summary?.rainyDays).toBe(1)
  })

  it('D15: days counts only the days with any data, and nulls never count as zero', () => {
    const summary = summarizeDailyWeather(daily([null, 50, null], [null, null, 1.5]))
    expect(summary).toEqual({ days: 2, avgTemp: 50, totalPrecip: 1.5, rainyDays: 1 })
  })

  it('D15: a metric with no reported day stays null instead of becoming zero', () => {
    expect(summarizeDailyWeather(daily([null, null], [0.5, 0.25]))).toEqual({
      days: 2,
      avgTemp: null,
      totalPrecip: 0.75,
      rainyDays: 2,
    })
  })

  it('D15: a span where every day is null has no summary at all', () => {
    expect(summarizeDailyWeather(daily([null, null, null], [null, null, null]))).toBeNull()
  })
})

describe('weatherGate', () => {
  it('D14/AC-11: weather is requested only for a single non-placeholder location', () => {
    expect(weatherGate(null, FIXTURE_VISITS)).toBe('all')
    expect(weatherGate('Unknown', FIXTURE_VISITS)).toBe('unknown')
    expect(weatherGate('Bethesda, MD', FIXTURE_VISITS)).toBe('ok')
  })

  it('AC-12: ambiguous or unsafe location text remains local', () => {
    expect(weatherGate('Bethesda', FIXTURE_VISITS)).toBe('invalid')
    expect(weatherGate('Zurich, CH', FIXTURE_VISITS)).toBe('invalid')
    expect(weatherGate('patient-secret-900', FIXTURE_VISITS)).toBe('invalid')
    expect(weatherGate('Clinic 12, MD', FIXTURE_VISITS)).toBe('invalid')
  })

  it('AC-12: inherited object keys cannot masquerade as recognized states', () => {
    expect(weatherGate('patient-secret, __proto__', FIXTURE_VISITS)).toBe('invalid')
    expect(weatherGate('patient-secret, constructor', FIXTURE_VISITS)).toBe('invalid')
  })
})

describe('safeWeatherLocationQuery', () => {
  it('AC-12: accepts a text-only city with either a recognized abbreviation or state name', () => {
    expect(safeWeatherLocationQuery("St. Mary's, MD", FIXTURE_VISITS)).toEqual({
      query: "St. Mary's",
      stateHint: 'Maryland',
    })
    expect(safeWeatherLocationQuery('Forest Hills, New York', FIXTURE_VISITS)).toEqual({
      query: 'Forest Hills',
      stateHint: 'New York',
    })
  })

  it('AC-12: rejects missing, foreign, unrecognized, numeric, and overlong state-qualified places', () => {
    expect(safeWeatherLocationQuery('Bethesda', FIXTURE_VISITS)).toBeNull()
    expect(safeWeatherLocationQuery('Zurich, CH', FIXTURE_VISITS)).toBeNull()
    expect(safeWeatherLocationQuery('Bethesda, ZZ', FIXTURE_VISITS)).toBeNull()
    expect(safeWeatherLocationQuery('Clinic 12, MD', FIXTURE_VISITS)).toBeNull()
    expect(safeWeatherLocationQuery(`${'A'.repeat(81)}, MD`, FIXTURE_VISITS)).toBeNull()
  })

  it('AC-12: rejects inherited state keys before they can create a safe query', () => {
    expect(safeWeatherLocationQuery('patient-secret, __proto__', FIXTURE_VISITS)).toBeNull()
    expect(safeWeatherLocationQuery('patient-secret, constructor', FIXTURE_VISITS)).toBeNull()
  })

  it('AC-12: rejects a valid place-shaped query that collides with any accepted identifier field', () => {
    const collisionVisits: Visit[] = [
      {
        ...FIXTURE_VISITS[0],
        patientIdHashed: 'deadbeefcafebabefeedface',
        visitId: 'visitsecret',
        providerId: 'providersecret',
      },
    ]
    expect(
      safeWeatherLocationQuery('deadbeefcafebabefeedface, MD', collisionVisits),
    ).toBeNull()
    expect(safeWeatherLocationQuery('visitsecret, MD', collisionVisits)).toBeNull()
    expect(safeWeatherLocationQuery('ProviderSecret, MD', collisionVisits)).toBeNull()
    expect(weatherGate('deadbeefcafebabefeedface, MD', collisionVisits)).toBe('invalid')
  })
})

describe('weatherRequestKey', () => {
  it('D18: the key is stable for identical inputs and changes when any input changes', () => {
    const range = { start: '2026-07-01', end: '2026-07-31' }
    expect(weatherRequestKey('Bethesda, MD', range)).toBe(
      weatherRequestKey('Bethesda, MD', { start: '2026-07-01', end: '2026-07-31' }),
    )
    expect(weatherRequestKey('Hoboken, NJ', range)).not.toBe(weatherRequestKey('Bethesda, MD', range))
    expect(weatherRequestKey('Bethesda, MD', { start: '2026-07-02', end: '2026-07-31' })).not.toBe(
      weatherRequestKey('Bethesda, MD', range),
    )
    expect(weatherRequestKey('Bethesda, MD', { start: '2026-07-01', end: '2026-08-01' })).not.toBe(
      weatherRequestKey('Bethesda, MD', range),
    )
  })
})

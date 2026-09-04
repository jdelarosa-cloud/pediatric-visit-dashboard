import { describe, expect, it } from 'vitest'
import { FIXTURE_CSV } from './fixtures/visits.fixture.ts'
import { buildArchiveUrl, buildGeocodeUrl } from './openMeteo.ts'
import { parseVisitsCsv } from './parseVisitsCsv.ts'
import { safeWeatherLocationQuery } from './weather.ts'

function params(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams)
}

describe('buildGeocodeUrl', () => {
  it('D14: geocoding hits the documented search endpoint with exactly four parameters', () => {
    const url = new URL(buildGeocodeUrl('Bethesda'))
    expect(url.host).toBe('geocoding-api.open-meteo.com')
    expect(url.pathname).toBe('/v1/search')
    expect(params(url.toString())).toEqual({
      name: 'Bethesda',
      count: '10',
      language: 'en',
      format: 'json',
    })
  })
})

describe('buildArchiveUrl', () => {
  it('D15: the archive request pins the four daily variables, Fahrenheit, inches, and timezone auto', () => {
    const url = new URL(
      buildArchiveUrl({ latitude: 38.9807, longitude: -77.1003, start: '2026-07-01', end: '2026-07-03' }),
    )
    expect(url.host).toBe('archive-api.open-meteo.com')
    expect(url.pathname).toBe('/v1/archive')
    expect(params(url.toString())).toEqual({
      latitude: '38.9807',
      longitude: '-77.1003',
      start_date: '2026-07-01',
      end_date: '2026-07-03',
      daily: 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum',
      temperature_unit: 'fahrenheit',
      precipitation_unit: 'inch',
      timezone: 'auto',
    })
  })
})

describe('AC-12/CF-6 privacy: URLs built from a parsed file carry no identifiers', () => {
  const outcome = parseVisitsCsv(FIXTURE_CSV)

  /** Column 2 of every data row, read from the raw text rather than the parsed visits. */
  const rawHashes = FIXTURE_CSV.trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(',')[1])
    .filter((hash) => hash !== undefined && hash !== '')

  it('no visit id, patient hash, or provider id from the parsed file appears in any built URL', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.visits.length).toBeGreaterThan(0)

    const urls: string[] = []
    for (const visit of outcome.visits) {
      const locationQuery = safeWeatherLocationQuery(visit.location, outcome.visits)
      if (locationQuery === null) continue
      const { query } = locationQuery
      urls.push(buildGeocodeUrl(query))
      urls.push(
        buildArchiveUrl({
          latitude: 38.9807,
          longitude: -77.1003,
          start: visit.visitDate,
          end: visit.visitDate,
        }),
      )
    }

    const identifiers = [
      ...rawHashes,
      ...outcome.visits.flatMap((visit) => [
        visit.patientIdHashed,
        visit.providerId,
        visit.visitId,
      ]),
    ].filter((value) => value !== '' && !value.startsWith('Unknown'))

    expect(identifiers).toContain('h-001')
    expect(identifiers).toContain('V001')
    expect(identifiers).toContain('DR1')
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.some((url) => new URL(url).host === 'geocoding-api.open-meteo.com')).toBe(true)

    for (const url of urls) {
      for (const identifier of identifiers) {
        expect(url).not.toContain(identifier)
        expect(decodeURIComponent(url)).not.toContain(identifier)
      }
    }
  })

  it('AC-12/CF-6: a compensating malformed row cannot build a request with patient-secret-900', () => {
    const malformed = `visit_reason,patient_id_hashed,location,visit_id,visit_date,wait_time_minutes,provider_id
Ear,pain,patient-secret-900,V900,2026-07-01,20,DR9`
    const malformedOutcome = parseVisitsCsv(malformed, 'compensating-defects.csv')

    expect(malformedOutcome.ok).toBe(true)
    if (!malformedOutcome.ok) return
    expect(malformedOutcome.visits).toHaveLength(1)
    expect(malformedOutcome.visits[0]?.location).toBe('patient-secret-900')

    const locationQuery = safeWeatherLocationQuery(
      malformedOutcome.visits[0]?.location ?? '',
      malformedOutcome.visits,
    )
    const geocodeUrl = locationQuery === null ? null : buildGeocodeUrl(locationQuery.query)

    expect(locationQuery).toBeNull()
    expect(geocodeUrl).toBeNull()
    expect(String(geocodeUrl)).not.toContain('patient-secret-900')
  })

  it('AC-12: inherited state keys cannot create a geocode URL', () => {
    for (const location of ['patient-secret, __proto__', 'patient-secret, constructor']) {
      const locationQuery = safeWeatherLocationQuery(location, [])
      const geocodeUrl = locationQuery === null ? null : buildGeocodeUrl(locationQuery.query)
      expect(locationQuery).toBeNull()
      expect(geocodeUrl).toBeNull()
    }
  })

  it('AC-12/CF-6: a grammar-valid identifier collision cannot create a geocode URL', () => {
    const collisionCsv = `visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id
V901,deadbeefcafebabefeedface,"Bethesda, MD",2026-07-01,Fever,20,DR1
V902,h-safe,"deadbeefcafebabefeedface, MD",2026-07-02,Cough,15,DR2`
    const collisionOutcome = parseVisitsCsv(collisionCsv, 'allowed-shape-collision.csv')

    expect(collisionOutcome.ok).toBe(true)
    if (!collisionOutcome.ok) return
    expect(collisionOutcome.visits).toHaveLength(2)
    const collisionLocation = collisionOutcome.visits[1]?.location ?? ''
    const filteredLocationRows = collisionOutcome.visits.slice(1)
    expect(safeWeatherLocationQuery(collisionLocation, filteredLocationRows)).not.toBeNull()
    const locationQuery = safeWeatherLocationQuery(collisionLocation, collisionOutcome.visits)
    const geocodeUrl = locationQuery === null ? null : buildGeocodeUrl(locationQuery.query)

    expect(collisionLocation).toBe('deadbeefcafebabefeedface, MD')
    expect(locationQuery).toBeNull()
    expect(geocodeUrl).toBeNull()
  })

  it('AC-12: an allowed location with no identifier collision builds a real geocode URL', () => {
    const allowedCsv = `visit_id,patient_id_hashed,location,visit_date,visit_reason,wait_time_minutes,provider_id
V903,h-safe,"Bethesda, MD",2026-07-01,Fever,20,DR1`
    const allowedOutcome = parseVisitsCsv(allowedCsv, 'allowed-location.csv')

    expect(allowedOutcome.ok).toBe(true)
    if (!allowedOutcome.ok) return
    const locationQuery = safeWeatherLocationQuery('Bethesda, MD', allowedOutcome.visits)

    expect(locationQuery).toEqual({ query: 'Bethesda', stateHint: 'Maryland' })
    const geocodeUrl = new URL(buildGeocodeUrl(locationQuery?.query ?? ''))
    expect(geocodeUrl.host).toBe('geocoding-api.open-meteo.com')
    expect(geocodeUrl.searchParams.get('name')).toBe('Bethesda')
  })
})

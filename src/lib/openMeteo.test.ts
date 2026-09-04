import { describe, expect, it } from 'vitest'
import { FIXTURE_CSV } from './fixtures/visits.fixture.ts'
import { buildArchiveUrl, buildGeocodeUrl } from './openMeteo.ts'
import { parseVisitsCsv } from './parseVisitsCsv.ts'
import { parseLocationQuery } from './weather.ts'

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
      const { query } = parseLocationQuery(visit.location)
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

    for (const url of urls) {
      for (const identifier of identifiers) {
        expect(url).not.toContain(identifier)
        expect(decodeURIComponent(url)).not.toContain(identifier)
      }
    }
  })
})

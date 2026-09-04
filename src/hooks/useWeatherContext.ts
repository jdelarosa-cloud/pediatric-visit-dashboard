import { useEffect, useState } from 'react'
import {
  WeatherRequestError,
  buildArchiveUrl,
  buildGeocodeUrl,
  fetchDailyWeather,
  fetchGeocode,
  isAbortError,
} from '../lib/openMeteo.ts'
import type { Visit, WeatherState } from '../lib/types.ts'
import {
  effectiveWeatherRange,
  pickGeocodeMatch,
  safeWeatherLocationQuery,
  summarizeDailyWeather,
  weatherGate,
  weatherRequestKey,
} from '../lib/weather.ts'

const DEBOUNCE_MS = 300

/** Session-scoped memo of successful responses keyed by request URL (D18); nothing is persisted. */
const responseCache = new Map<string, unknown>()

async function cached<T>(url: string, run: () => Promise<T>): Promise<T> {
  // Resolved values only, never the in-flight promise: sharing one would let a
  // second request await a promise that the first request's cleanup aborts.
  // A failure is not stored either, so the next identical request retries.
  if (responseCache.has(url)) return responseCache.get(url) as T
  const value = await run()
  responseCache.set(url, value)
  return value
}

function todayIso(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export type WeatherContextInput = {
  location: string | null
  startDate: string | null
  endDate: string | null
  visits: readonly Visit[]
}

export function useWeatherContext({
  location,
  startDate,
  endDate,
  visits,
}: WeatherContextInput): WeatherState {
  const [result, setResult] = useState<{ key: string; state: WeatherState } | null>(null)

  const gate = weatherGate(location)
  const locationQuery = location === null ? null : safeWeatherLocationQuery(location)
  const query = locationQuery?.query ?? null
  const stateHint = locationQuery?.stateHint ?? null
  const range = effectiveWeatherRange({ startDate, endDate, visits, today: todayIso() })
  // Kept as two primitives rather than one object so the effect's dependency
  // list is stable across renders that produce an equal range.
  const spanStart = range.kind === 'range' ? range.start : null
  const spanEnd = range.kind === 'range' ? range.end : null
  const key =
    gate === 'ok' && location !== null && spanStart !== null && spanEnd !== null
      ? weatherRequestKey(location, { start: spanStart, end: spanEnd })
      : null

  useEffect(() => {
    if (
      key === null ||
      query === null ||
      spanStart === null ||
      spanEnd === null
    ) return

    const span = { start: spanStart, end: spanEnd }
    const controller = new AbortController()
    let current = true
    const apply = (state: WeatherState) => {
      if (current) setResult({ key, state })
    }

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const matches = await cached(buildGeocodeUrl(query), () =>
            fetchGeocode(query, controller.signal),
          )
          // Re-checked after every await: an abort cannot cancel a response that
          // already resolved, so this flag is what keeps a stale key from
          // overwriting the state for the current one (D18).
          if (!current) return
          const place = pickGeocodeMatch(matches, stateHint)
          if (place === null) {
            apply({ status: 'no-match', query })
            return
          }
          const params = {
            latitude: place.latitude,
            longitude: place.longitude,
            start: span.start,
            end: span.end,
          }
          const daily = await cached(buildArchiveUrl(params), () =>
            fetchDailyWeather(params, controller.signal),
          )
          if (!current) return
          const summary = summarizeDailyWeather(daily)
          apply(
            summary === null
              ? { status: 'empty', place, range: span }
              : { status: 'success', place, range: span, summary },
          )
        } catch (error) {
          if (isAbortError(error)) return
          apply({
            status: 'error',
            message:
              error instanceof WeatherRequestError
                ? error.message
                : 'The weather request could not be completed.',
          })
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      current = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, query, spanStart, spanEnd, stateHint])

  if (gate !== 'ok' || location === null) {
    const reason =
      gate === 'unknown'
        ? 'unknown-location'
        : gate === 'invalid'
          ? 'invalid-location'
          : 'all-locations'
    return { status: 'idle', reason }
  }
  if (range.kind === 'no-visits') return { status: 'idle', reason: 'no-visits' }
  if (range.kind === 'unsupported') return { status: 'unsupported', reason: 'before-1940' }
  if (range.kind !== 'range') return { status: 'unsupported', reason: 'future' }
  if (result !== null && result.key === key) return result.state
  return { status: 'loading', location, range: { start: range.start, end: range.end } }
}

import type { DailyWeather, GeocodeMatch } from './types.ts'

const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'
const ARCHIVE_ENDPOINT = 'https://archive-api.open-meteo.com/v1/archive'

/** The four daily variables from D15, in the order the API documents them. */
export const DAILY_VARIABLES =
  'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum'

export type WeatherErrorKind = 'network' | 'http' | 'shape'

export class WeatherRequestError extends Error {
  readonly kind: WeatherErrorKind

  constructor(kind: WeatherErrorKind, message: string) {
    super(message)
    this.name = 'WeatherRequestError'
    this.kind = kind
  }
}

export type ArchiveParams = {
  latitude: number
  longitude: number
  start: string
  end: string
}

export function buildGeocodeUrl(query: string): string {
  const url = new URL(GEOCODE_ENDPOINT)
  url.searchParams.set('name', query)
  url.searchParams.set('count', '10')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  return url.toString()
}

export function buildArchiveUrl({ latitude, longitude, start, end }: ArchiveParams): string {
  const url = new URL(ARCHIVE_ENDPOINT)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('start_date', start)
  url.searchParams.set('end_date', end)
  url.searchParams.set('daily', DAILY_VARIABLES)
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('precipitation_unit', 'inch')
  url.searchParams.set('timezone', 'auto')
  return url.toString()
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

async function httpMessage(response: Response, label: string): Promise<string> {
  try {
    const body: unknown = await response.json()
    const reason = (body as { reason?: unknown }).reason
    // Open-Meteo answers a bad date range with HTTP 400 and a human-readable
    // `reason`, which is far more useful to show than the status code alone.
    if (typeof reason === 'string' && reason !== '') return reason
  } catch {
    // Fall through to the status-only message.
  }
  return `The ${label} service returned HTTP ${response.status}.`
}

async function requestJson(url: string, label: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (cause) {
    // An abort is a caller decision, not a failure to report: it must reach the
    // hook unchanged so the hook can drop it silently.
    if (isAbortError(cause)) throw cause
    throw new WeatherRequestError('network', `The ${label} service could not be reached.`)
  }

  if (!response.ok) {
    throw new WeatherRequestError('http', await httpMessage(response, label))
  }

  try {
    return await response.json()
  } catch {
    throw new WeatherRequestError('shape', `The ${label} service returned an unreadable response.`)
  }
}

function toGeocodeMatch(entry: unknown): GeocodeMatch {
  const record = entry as Record<string, unknown>
  const { name, admin1, country, latitude, longitude } = record
  if (
    typeof name !== 'string' ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number'
  ) {
    throw new WeatherRequestError('shape', 'The location search returned an unexpected result.')
  }
  return {
    name,
    admin1: typeof admin1 === 'string' ? admin1 : null,
    country: typeof country === 'string' ? country : '',
    latitude,
    longitude,
  }
}

export async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const body = await requestJson(buildGeocodeUrl(query), 'location search', signal)
  const results = (body as { results?: unknown }).results
  // Open-Meteo omits `results` entirely when nothing matches, which is a
  // no-match, not a malformed response.
  if (results === undefined || results === null) return []
  if (!Array.isArray(results)) {
    throw new WeatherRequestError('shape', 'The location search returned an unexpected result.')
  }
  return results.map(toGeocodeMatch)
}

function numberColumn(value: unknown, label: string): (number | null)[] {
  if (!Array.isArray(value)) {
    throw new WeatherRequestError('shape', `The weather service omitted ${label}.`)
  }
  return value.map((entry) => (typeof entry === 'number' ? entry : null))
}

export async function fetchDailyWeather(
  params: ArchiveParams,
  signal?: AbortSignal,
): Promise<DailyWeather> {
  const body = await requestJson(buildArchiveUrl(params), 'weather', signal)
  const daily = (body as { daily?: unknown }).daily as Record<string, unknown> | undefined
  if (daily === undefined || daily === null) {
    throw new WeatherRequestError('shape', 'The weather service returned no daily data.')
  }
  const time = daily.time
  if (!Array.isArray(time)) {
    throw new WeatherRequestError('shape', 'The weather service returned no dates.')
  }
  return {
    time: time.map((entry) => String(entry)),
    temperature_2m_mean: numberColumn(daily.temperature_2m_mean, 'average temperature'),
    temperature_2m_max: numberColumn(daily.temperature_2m_max, 'maximum temperature'),
    temperature_2m_min: numberColumn(daily.temperature_2m_min, 'minimum temperature'),
    precipitation_sum: numberColumn(daily.precipitation_sum, 'precipitation'),
  }
}

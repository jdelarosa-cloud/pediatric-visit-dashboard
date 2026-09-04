export type Visit = {
  visitId: string
  patientIdHashed: string
  location: string
  /**
   * Date-only canonical string, never a Date. Parsing "2026-07-04" as a Date
   * yields UTC midnight, which renders as the previous day west of Greenwich
   * and would silently shift visits across day boundaries (P11).
   */
  visitDate: string
  visitReason: string
  /**
   * Null means "no usable wait was recorded" - missing, nonnumeric, or negative
   * (P8). It must stay distinct from 0, which is a real zero-minute wait:
   * averages and "with wait data" counts exclude nulls rather than counting
   * them as zero, which would drag every average down (P9).
   */
  waitTimeMinutes: number | null
  providerId: string
  sourceRow: number
}

export type ParseErrorCode =
  | 'EMPTY_FILE'
  | 'NO_DATA_ROWS'
  | 'MISSING_COLUMNS'
  | 'AMBIGUOUS_COLUMNS'
  | 'PARSE_FAILURE'

export type ParseError = {
  code: ParseErrorCode
  message: string
  missingColumns?: string[]
  foundColumns?: string[]
}

export type WarningCode =
  | 'raggedRow'
  | 'missingVisitId'
  | 'missingVisitDate'
  | 'invalidVisitDate'
  | 'duplicateVisitId'
  | 'blankLocation'
  | 'blankReason'
  | 'missingWait'
  | 'nonnumericWait'
  | 'negativeWait'
  | 'missingPatientId'
  | 'missingProviderId'
  | 'textNormalized'
  | 'headersNormalized'

export type WarningKind = 'skipped' | 'normalized' | 'info'

export type WarningExample = {
  /** Data-row number, where row 1 is the first row after the header (D20). */
  row: number
  /**
   * The offending cell contents, or, for structural warnings like `raggedRow`
   * where the cells cannot be trusted to align with any field, a descriptive
   * string that carries no cell contents. Never a patient hash (AC-12).
   */
  value?: string
}

export type ParseWarning = {
  code: WarningCode
  kind: WarningKind
  count: number
  message: string
  examples: WarningExample[]
}

export type ParseCounts = {
  totalRows: number
  accepted: number
  skipped: number
  /** Accepted rows with at least one normalization, not the number of normalizations. */
  normalized: number
}

export type ParseOutcome =
  | { ok: false; error: ParseError }
  | { ok: true; visits: Visit[]; warnings: ParseWarning[]; counts: ParseCounts }

export type Filters = {
  startDate: string | null
  endDate: string | null
  /** Null means "all locations" (D9); "Unknown" is a selectable value, not a null. */
  location: string | null
  /** Null means the threshold is inactive; 0 is an active threshold (D7). */
  minWait: number | null
}

export type LocationWaitStat = {
  location: string
  /** Null when no visit at this location has a recorded wait (D11). */
  avgWait: number | null
  visits: number
  withWait: number
}

export type ReasonCount = {
  reason: string
  count: number
}

export type Kpis = {
  totalVisits: number
  /** Mean of recorded waits across the filtered visit set; null when none are recorded. */
  overallAvgWait: number | null
  /** Number of distinct location values represented in the filtered visit set. */
  locationCount: number
  avgWaitByLocation: LocationWaitStat[]
  topReasons: ReasonCount[]
  visitsWithoutWait: number
}

export type GeocodeMatch = {
  name: string
  /** Open-Meteo omits admin1 for some places, so the state match in D14 must tolerate null. */
  admin1: string | null
  country: string
  latitude: number
  longitude: number
}

export type DailyWeather = {
  time: string[]
  temperature_2m_mean: (number | null)[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  precipitation_sum: (number | null)[]
}

export type WeatherSummary = {
  /** Days with at least one non-null value, not the length of the requested span. */
  days: number
  /** Null when no day in the span reported that metric; never a stand-in zero (D15). */
  avgTemp: number | null
  totalPrecip: number | null
  rainyDays: number
}

export type WeatherRange =
  | { kind: 'range'; start: string; end: string }
  | { kind: 'no-visits' }
  | { kind: 'future' }
  | { kind: 'unsupported' }

export type WeatherState =
  | {
      status: 'idle'
      reason: 'all-locations' | 'unknown-location' | 'invalid-location' | 'no-visits'
    }
  | { status: 'unsupported'; reason: 'future' | 'before-1940' }
  | { status: 'loading'; location: string; range: { start: string; end: string } }
  | { status: 'no-match'; query: string }
  | { status: 'error'; message: string }
  | { status: 'empty'; place: GeocodeMatch; range: { start: string; end: string } }
  | {
      status: 'success'
      place: GeocodeMatch
      range: { start: string; end: string }
      summary: WeatherSummary
    }

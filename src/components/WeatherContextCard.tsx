import type { GeocodeMatch, WeatherState, WeatherSummary } from '../lib/types.ts'
import styles from './WeatherContextCard.module.css'

const IDLE_COPY = {
  'all-locations': 'Select a single location to see weather context for its visit dates.',
  'unknown-location': 'Weather context is not available for visits with an unknown location.',
  'no-visits': 'No visits match the current filters, so there is no date range to look up.',
}

const UNSUPPORTED_COPY = {
  future: 'Weather history is only available for dates up to today.',
  'before-1940': 'Weather history is available from 1940 onward.',
}

function formatSpan(range: { start: string; end: string }): string {
  return range.start === range.end ? range.start : `${range.start} to ${range.end}`
}

function formatSpanWithDays(range: { start: string; end: string }, days: number): string {
  return `${formatSpan(range)} · ${days} ${days === 1 ? 'day' : 'days'} with data`
}

function formatPlace(place: GeocodeMatch): string {
  return [place.name, place.admin1, place.country]
    .filter((part) => part !== null && part !== '')
    .join(', ')
}

function Metrics({ summary }: { summary: WeatherSummary }) {
  const entries = [
    {
      label: 'Average temperature',
      value: summary.avgTemp === null ? 'Not reported' : `${summary.avgTemp.toFixed(1)} °F`,
    },
    {
      label: 'Total precipitation',
      value: summary.totalPrecip === null ? 'Not reported' : `${summary.totalPrecip.toFixed(2)} in`,
    },
    { label: 'Rainy days', value: `${summary.rainyDays} of ${summary.days} days` },
  ]
  return (
    <dl className={styles.metrics}>
      {entries.map((entry) => (
        <div className={styles.metric} key={entry.label}>
          <dt className={styles.metricLabel}>{entry.label}</dt>
          <dd className={styles.metricValue}>{entry.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Attribution() {
  return (
    <p className={styles.attribution}>
      Weather data by{' '}
      <a href="https://open-meteo.com/" rel="noreferrer" target="_blank">
        Open-Meteo.com
      </a>
    </p>
  )
}

function Body({ state }: { state: WeatherState }) {
  switch (state.status) {
    case 'idle':
      return <p className={styles.message}>{IDLE_COPY[state.reason]}</p>
    case 'unsupported':
      return <p className={styles.message}>{UNSUPPORTED_COPY[state.reason]}</p>
    case 'loading':
      return (
        <p className={styles.message}>
          <span aria-hidden="true" className={styles.pulse} />
          {`Loading weather for ${state.location}...`}
        </p>
      )
    case 'no-match':
      return (
        <p className={styles.message}>
          {`We could not find "${state.query}" on the map. Try a location written as City, ST.`}
        </p>
      )
    case 'error':
      return (
        <>
          <p className={styles.message}>
            Weather is unavailable right now. The dashboard still works without it.
          </p>
          <p className={styles.detail}>{state.message}</p>
        </>
      )
    case 'empty':
      return (
        <>
          <p className={styles.place}>{formatPlace(state.place)}</p>
          <p className={styles.span}>{formatSpan(state.range)}</p>
          <p className={styles.message}>No weather data was returned for these dates.</p>
          <Attribution />
        </>
      )
    case 'success':
      return (
        <>
          <p className={styles.place}>{formatPlace(state.place)}</p>
          <p className={styles.span}>{formatSpanWithDays(state.range, state.summary.days)}</p>
          <Metrics summary={state.summary} />
          <p className={styles.detail}>
            Shown for context only. Weather does not explain changes in visits or wait times.
          </p>
          <Attribution />
        </>
      )
  }
}

export function WeatherContextCard({ state }: { state: WeatherState }) {
  return (
    <section
      aria-busy={state.status === 'loading'}
      aria-live="polite"
      className={styles.card}
    >
      <h2 className={styles.heading}>Weather context</h2>
      <Body state={state} />
    </section>
  )
}

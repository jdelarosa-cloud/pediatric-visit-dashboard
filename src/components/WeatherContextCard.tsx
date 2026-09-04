import type { ReactNode } from 'react'
import { useDelayedPending } from '../hooks/useDelayedPending.ts'
import { formatVisitDate } from '../lib/display.ts'
import type { GeocodeMatch, WeatherState, WeatherSummary } from '../lib/types.ts'
import styles from './WeatherContextCard.module.css'

const IDLE_COPY = {
  'all-locations': {
    title: 'Select one location',
    message: 'Choose a single location to see weather context for its visit dates.',
  },
  'unknown-location': {
    title: 'Location unavailable',
    message: 'Weather context is not available for visits with an unknown location.',
  },
  'no-visits': {
    title: 'No matching visit dates',
    message: 'No visits match the current filters, so there is no date range to look up.',
  },
}

const UNSUPPORTED_COPY = {
  future: {
    title: 'Future dates selected',
    message: 'Historical weather is available only through today.',
  },
  'before-1940': {
    title: 'Dates outside coverage',
    message: 'Historical weather is available from 1940 onward.',
  },
}

function formatSpan(range: { start: string; end: string }): string {
  return range.start === range.end
    ? formatVisitDate(range.start)
    : `${formatVisitDate(range.start)}–${formatVisitDate(range.end)}`
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

function InformationIcon() {
  return (
    <svg aria-hidden="true" className={styles.informationIcon} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6M12 7.5h.01" />
    </svg>
  )
}

function MessagePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.messagePanel}>
      <InformationIcon />
      <div>
        <h3>{title}</h3>
        <div className={styles.message}>{children}</div>
      </div>
    </div>
  )
}

function WeatherSkeleton() {
  return (
    <div aria-hidden="true" className={styles.skeletonLayout}>
      <div className={styles.skeletonCopy}>
        <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
      </div>
      <div className={styles.skeletonMetrics}>
        <span className={`${styles.skeleton} ${styles.skeletonMetric}`} />
        <span className={`${styles.skeleton} ${styles.skeletonMetric}`} />
        <span className={`${styles.skeleton} ${styles.skeletonMetric}`} />
      </div>
    </div>
  )
}

function Body({ state, showLoading }: { state: WeatherState; showLoading: boolean }) {
  switch (state.status) {
    case 'idle': {
      const copy = IDLE_COPY[state.reason]
      return <MessagePanel title={copy.title}>{copy.message}</MessagePanel>
    }
    case 'unsupported': {
      const copy = UNSUPPORTED_COPY[state.reason]
      return <MessagePanel title={copy.title}>{copy.message}</MessagePanel>
    }
    case 'loading':
      return (
        <>
          <span className="visually-hidden">Loading weather for {state.location}.</span>
          {showLoading ? (
            <WeatherSkeleton />
          ) : (
            <div aria-hidden="true" className={styles.pendingPlaceholder} />
          )}
        </>
      )
    case 'no-match':
      return (
        <MessagePanel title="Location not found">
          We could not find “{state.query}”. Check the location format and upload a corrected file.
        </MessagePanel>
      )
    case 'error':
      return (
        <MessagePanel title="Weather unavailable">
          <p>The visit dashboard is still available. Weather can be tried again after changing the location or filters.</p>
          <p className={styles.detail}>{state.message}</p>
        </MessagePanel>
      )
    case 'empty':
      return (
        <div className={styles.emptyWeather}>
          <div>
            <p className={styles.place}>{formatPlace(state.place)}</p>
            <p className={styles.span}>{formatSpan(state.range)}</p>
          </div>
          <p className={styles.message}>No weather observations were returned for these dates.</p>
          <Attribution />
        </div>
      )
    case 'success':
      return (
        <div className={styles.successLayout}>
          <div className={styles.placeBlock}>
            <p className={styles.place}>{formatPlace(state.place)}</p>
            <p className={styles.span}>{formatSpanWithDays(state.range, state.summary.days)}</p>
          </div>
          <Metrics summary={state.summary} />
          <div className={styles.contextNote}>
            <p>Context only—weather does not explain changes in visits or wait times.</p>
            <Attribution />
          </div>
        </div>
      )
  }
}

export function WeatherContextCard({ state }: { state: WeatherState }) {
  const showLoading = useDelayedPending(state.status === 'loading')

  return (
    <section
      aria-busy={state.status === 'loading'}
      aria-labelledby="weather-context-title"
      className={styles.card}
    >
      <div className={styles.heading}>
        <p>Secondary context</p>
        <h2 id="weather-context-title">Weather Context</h2>
      </div>
      <div aria-live="polite" className={styles.body} key={state.status}>
        <Body showLoading={showLoading} state={state} />
      </div>
    </section>
  )
}

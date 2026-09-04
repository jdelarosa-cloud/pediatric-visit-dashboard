import type { Kpis } from '../lib/types.ts'
import styles from './KpiCards.module.css'

type KpiCardsProps = {
  kpis: Kpis
}

function formatAverageWait(value: number | null): string {
  if (value === null) return 'Not recorded'
  return `${value.toFixed(1)} min`
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const recordedWaits = kpis.totalVisits - kpis.visitsWithoutWait
  const coverage =
    kpis.totalVisits === 0 ? null : Math.round((recordedWaits / kpis.totalVisits) * 100)

  return (
    <div aria-label="Key visit metrics" className={styles.grid} role="list">
      <article className={styles.card} role="listitem">
        <h3>Total Visits</h3>
        <p className={styles.value}>{kpis.totalVisits}</p>
        <p className={styles.definition}>Matching the current filters</p>
      </article>

      <article className={styles.card} role="listitem">
        <h3>Average Wait</h3>
        <p className={`${styles.value} ${kpis.overallAvgWait === null ? styles.unavailable : ''}`}>
          {formatAverageWait(kpis.overallAvgWait)}
        </p>
        <p className={styles.definition}>Mean of recorded waits only</p>
      </article>

      <article className={styles.card} role="listitem">
        <h3>Locations</h3>
        <p className={styles.value}>{kpis.locationCount}</p>
        <p className={styles.definition}>Represented in this view</p>
      </article>

      <article className={styles.card} role="listitem">
        <h3>Recorded Waits</h3>
        <p
          aria-label={`${recordedWaits} of ${kpis.totalVisits} matching ${kpis.totalVisits === 1 ? 'visit has' : 'visits have'} a recorded wait`}
          className={styles.coverageValue}
        >
          <strong>{recordedWaits}</strong>
          <span> of {kpis.totalVisits}</span>
        </p>
        <p className={styles.definition}>
          {coverage === null ? 'No matching visits' : `${coverage}% of matching visits`}
        </p>
      </article>
    </div>
  )
}

import type { ReasonCount } from '../lib/types.ts'
import styles from './AnalysisCard.module.css'

type TopReasonsListProps = {
  reasons: ReasonCount[]
  totalVisits: number
}

export function TopReasonsList({ reasons, totalVisits }: TopReasonsListProps) {
  const leader = reasons[0]
  const maxCount = leader?.count ?? 1
  const summary = leader
    ? `${leader.reason} is the most common reason, accounting for ${leader.count} of ${totalVisits} matching visits.`
    : 'No visit reasons are available for the current filters.'

  return (
    <figure
      aria-describedby={
        reasons.length === 0 ? 'reasons-description' : 'reasons-description reasons-summary'
      }
      aria-labelledby="reasons-title"
      className={styles.card}
    >
      <figcaption className={styles.heading}>
        <h2 id="reasons-title">Top Visit Reasons</h2>
        <p className={styles.description} id="reasons-description">
          Ranked within the matching visits
        </p>
      </figcaption>

      {reasons.length === 0 ? (
        <div className={styles.emptyPanel}>
          <h3>No Visit Reasons to Rank</h3>
          <p>Adjust or reset the filters to include one or more visits.</p>
        </div>
      ) : (
        <>
          <ol aria-label={summary} className={styles.reasonList}>
            {reasons.map((reason, index) => {
              const share = totalVisits === 0 ? 0 : (reason.count / totalVisits) * 100
              return (
                <li key={reason.reason}>
                  <div className={styles.reasonHead}>
                    <span className={styles.reasonRank}>{index + 1}</span>
                    <span className={styles.reasonName}>{reason.reason}</span>
                    <span className={styles.reasonCount}>{reason.count}</span>
                  </div>
                  <progress
                    aria-hidden="true"
                    className={styles.reasonProgress}
                    max={maxCount}
                    value={reason.count}
                  />
                  <p className={styles.reasonShare}>{share.toFixed(1)}% of matching visits</p>
                </li>
              )
            })}
          </ol>
          <p className={styles.summary} id="reasons-summary">{summary}</p>
        </>
      )}
    </figure>
  )
}

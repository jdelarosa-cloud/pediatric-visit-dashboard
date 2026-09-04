import styles from './MethodologyFooter.module.css'

export function MethodologyFooter() {
  return (
    <section aria-labelledby="methodology-title" className={styles.card}>
      <div>
        <h2 id="methodology-title">Methodology</h2>
        <p className={styles.intro}>Concise definitions and data-handling assumptions.</p>
      </div>

      <details className={styles.details}>
        <summary>View Definitions &amp; Assumptions</summary>
        <div className={styles.grid}>
          <div>
            <h3>Wait averages</h3>
            <p>Use recorded waits only. Missing or invalid waits are never treated as zero.</p>
          </div>
          <div>
            <h3>Date filters</h3>
            <p>Include both endpoints. Date-only values prevent timezone shifts.</p>
          </div>
          <div>
            <h3>Data quality</h3>
            <p>Adjusted rows remain included. Skipped rows are excluded from every metric.</p>
          </div>
          <div>
            <h3>Weather</h3>
            <p>Only place and dates are requested. Weather is context, not a causal claim.</p>
          </div>
        </div>
      </details>

      <footer className={styles.footer}>
        <span>Small test files:</span>
        <a download href="/samples/valid-visits.csv">clean</a>
        <a download href="/samples/missing-column.csv">missing column</a>
        <a download href="/samples/invalid-rows.csv">invalid rows</a>
      </footer>
    </section>
  )
}

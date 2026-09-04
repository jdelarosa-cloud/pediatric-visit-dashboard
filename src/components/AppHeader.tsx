import styles from './AppHeader.module.css'

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={`page-container ${styles.inner}`}>
        <div className={styles.brand}>
          <span aria-hidden="true" className={styles.mark}>
            <svg fill="none" viewBox="0 0 24 24">
              <path
                d="M6 14.5c2.2 0 3.4-1.4 3.4-3.4S8.2 7.7 6 7.7M18 14.5c-2.2 0-3.4-1.4-3.4-3.4s1.2-3.4 3.4-3.4M8.8 16.6c1.9 1.5 4.5 1.5 6.4 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <circle cx="12" cy="6" fill="currentColor" r="1.5" />
            </svg>
          </span>
          <div>
            <h1 className={styles.title}>Pediatric Visit Dashboard</h1>
            <p className={styles.subtitle}>
              Understand visit volume, wait times, and common reasons from one visit CSV.
            </p>
          </div>
        </div>

        <p className={styles.privacy}>
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path
              d="M12 3.5 19 6v5.3c0 4.2-2.6 7.5-7 9.2-4.4-1.7-7-5-7-9.2V6l7-2.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m9.3 12 1.8 1.8 3.8-4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>
            CSV data stays in this browser. Weather uses only the selected place and dates.
          </span>
        </p>
      </div>
    </header>
  )
}

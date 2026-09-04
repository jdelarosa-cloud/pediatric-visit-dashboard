import { useEffect, useRef, useState } from 'react'
import type { Filters } from '../lib/types.ts'
import styles from './FilterBar.module.css'

type FilterBarProps = {
  filters: Filters
  locations: string[]
  matchingCount: number
  totalCount: number
  onChange: (filters: Filters) => void
  onReset: () => void
}

function activeFilterCount(filters: Filters): number {
  return Object.values(filters).filter((value) => value !== null).length
}

function visitsLabel(count: number): string {
  return `${count} ${count === 1 ? 'visit' : 'visits'}`
}

export function FilterBar({
  filters,
  locations,
  matchingCount,
  totalCount,
  onChange,
  onReset,
}: FilterBarProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [resetMessage, setResetMessage] = useState('')
  const activeCount = activeFilterCount(filters)
  const hasInvalidRange =
    filters.startDate !== null &&
    filters.endDate !== null &&
    filters.startDate > filters.endDate

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      const details = detailsRef.current
      if (details?.open && !details.contains(event.target as Node)) details.open = false
    }

    function closeOnEscape(event: KeyboardEvent) {
      const details = detailsRef.current
      if (event.key !== 'Escape' || !details?.open) return
      details.open = false
      details.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function updateFilters(nextFilters: Filters) {
    setResetMessage('')
    onChange(nextFilters)
  }

  function resetFilters() {
    onReset()
    setResetMessage(`Filters reset. ${visitsLabel(totalCount)} match.`)
    if (detailsRef.current) {
      detailsRef.current.open = false
      detailsRef.current.querySelector('summary')?.focus()
    }
  }

  return (
    <div className={styles.wrap}>
      <details className={styles.menu} ref={detailsRef}>
        <summary
          aria-label={`Filters. ${activeCount} active. ${visitsLabel(matchingCount)} match. Open filter options.`}
        >
          <svg aria-hidden="true" className={styles.filterIcon} fill="none" viewBox="0 0 24 24">
            <path
              d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className={styles.summaryLabel}>Filters</span>
          {activeCount > 0 && <span className={styles.activeCount}>{activeCount}</span>}
          <span className={styles.matchCount}>{visitsLabel(matchingCount)}</span>
          <svg aria-hidden="true" className={styles.chevron} fill="none" viewBox="0 0 24 24">
            <path
              d="m7 9.5 5 5 5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </summary>

        <div className={styles.popover}>
          <div className={styles.popoverHeading}>
            <div>
              <h3>Filter Visits</h3>
              <p>Changes apply immediately. Dates include both endpoints.</p>
            </div>
            {activeCount > 0 && <span>{activeCount} active</span>}
          </div>

          <div className={styles.fields}>
            <label className={styles.locationField}>
              <span>Location</span>
              <select
                onChange={(event) =>
                  updateFilters({ ...filters, location: event.currentTarget.value || null })
                }
                value={filters.location ?? ''}
              >
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Start date</span>
              <input
                aria-describedby={hasInvalidRange ? 'filter-date-error' : undefined}
                onChange={(event) =>
                  updateFilters({ ...filters, startDate: event.currentTarget.value || null })
                }
                type="date"
                value={filters.startDate ?? ''}
              />
            </label>

            <label>
              <span>End date</span>
              <input
                aria-describedby={hasInvalidRange ? 'filter-date-error' : undefined}
                onChange={(event) =>
                  updateFilters({ ...filters, endDate: event.currentTarget.value || null })
                }
                type="date"
                value={filters.endDate ?? ''}
              />
            </label>

            <label className={styles.waitField}>
              <span>Minimum wait</span>
              <span className={styles.inputWithSuffix}>
                <input
                  min="0"
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    updateFilters({ ...filters, minWait: value === '' ? null : Number(value) })
                  }}
                  placeholder="Any"
                  step="1"
                  type="number"
                  value={filters.minWait ?? ''}
                />
                <span aria-hidden="true">min</span>
              </span>
              <small>Visits without a recorded wait are excluded when this is active.</small>
            </label>
          </div>

          {hasInvalidRange && (
            <p className={styles.dateError} id="filter-date-error" role="alert">
              Start date must be on or before the end date. Adjust either date to continue.
            </p>
          )}

          <div className={styles.footer}>
            <p>
              <strong>{matchingCount}</strong> of {visitsLabel(totalCount)} match
            </p>
            <button disabled={activeCount === 0} onClick={resetFilters} type="button">
              Reset filters
            </button>
          </div>
        </div>
      </details>

      <p aria-live="polite" className="visually-hidden">
        {resetMessage || `${matchingCount} of ${visitsLabel(totalCount)} match the current filters.`}
      </p>
    </div>
  )
}

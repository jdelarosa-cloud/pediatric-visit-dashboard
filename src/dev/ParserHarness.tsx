// TEMPORARY Phase 2 harness for manually exercising the parser, extended in
// Phase 4b with the filters the weather card needs. Deleted in Phase 5.
import { useState } from 'react'
import { WeatherContextCard } from '../components/WeatherContextCard.tsx'
import { useWeatherContext } from '../hooks/useWeatherContext.ts'
import { applyFilters, locationOptions } from '../lib/filters.ts'
import { parseVisitsFile } from '../lib/parseVisitsFile.ts'
import type { ParseOutcome } from '../lib/types.ts'

const SAMPLES = [
  { label: 'Load valid sample', file: 'valid-visits.csv' },
  { label: 'Load missing-column sample', file: 'missing-column.csv' },
  { label: 'Load invalid-rows sample', file: 'invalid-rows.csv' },
]

const panel = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  marginTop: 'var(--space-3)',
  padding: 'var(--space-3)',
}

export function ParserHarness() {
  const [status, setStatus] = useState('No file parsed yet.')
  const [outcome, setOutcome] = useState<ParseOutcome | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const visits = outcome !== null && outcome.ok ? outcome.visits : []
  const startDate = start === '' ? null : start
  const endDate = end === '' ? null : end
  const filtered = applyFilters(visits, { location, startDate, endDate, minWait: null })
  const weather = useWeatherContext({ location, startDate, endDate, visits: filtered })

  async function parse(file: File) {
    setStatus(`Parsing ${file.name}...`)
    const result = await parseVisitsFile(file)
    setOutcome(result)
    setLocation(null)
    setStatus(`Parsed ${file.name}`)
  }

  async function loadSample(fileName: string) {
    setStatus(`Fetching ${fileName}...`)
    try {
      const response = await fetch(`/samples/${fileName}`)
      if (!response.ok) {
        setOutcome(null)
        setStatus(`Could not fetch ${fileName} (HTTP ${response.status})`)
        return
      }
      const blob = await response.blob()
      await parse(new File([blob], fileName, { type: 'text/csv' }))
    } catch (cause) {
      setOutcome(null)
      setStatus(`Could not fetch ${fileName}: ${String(cause)}`)
    }
  }

  return (
    <section style={panel}>
      <h2>Parser harness (temporary)</h2>
      <p style={{ display: 'grid', gap: 'var(--space-1)' }}>
        <label htmlFor="harness-file">Choose a visits CSV</label>
        <input
          id="harness-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void parse(file)
          }}
        />
      </p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {SAMPLES.map((sample) => (
          <button key={sample.file} type="button" onClick={() => void loadSample(sample.file)}>
            {sample.label}
          </button>
        ))}
      </p>
      <p aria-live="polite">{status}</p>
      {outcome !== null && outcome.ok && (
        <div>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <span>
              <label htmlFor="harness-location">Location</label>{' '}
              <select
                id="harness-location"
                onChange={(event) =>
                  setLocation(event.target.value === '' ? null : event.target.value)
                }
                value={location ?? ''}
              >
                <option value="">All locations</option>
                {locationOptions(visits).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </span>
            <span>
              <label htmlFor="harness-start">Start date</label>{' '}
              <input
                id="harness-start"
                onChange={(event) => setStart(event.target.value)}
                type="date"
                value={start}
              />
            </span>
            <span>
              <label htmlFor="harness-end">End date</label>{' '}
              <input
                id="harness-end"
                onChange={(event) => setEnd(event.target.value)}
                type="date"
                value={end}
              />
            </span>
          </p>
          <p>
            {filtered.length} of {visits.length} visits match these filters.
          </p>
          <WeatherContextCard state={weather} />
        </div>
      )}
      {outcome !== null && (
        <div>
          <p>
            <strong>ok:</strong> {String(outcome.ok)}
          </p>
          {!outcome.ok && (
            <p>
              <strong>{outcome.error.code}</strong> {outcome.error.message}
            </p>
          )}
          {outcome.ok && (
            <>
              <table>
                <tbody>
                  {Object.entries(outcome.counts).map(([key, value]) => (
                    <tr key={key}>
                      <th scope="row" style={{ paddingRight: 'var(--space-3)', textAlign: 'left' }}>
                        {key}
                      </th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul>
                {outcome.warnings.map((warning) => (
                  <li key={warning.code}>
                    {warning.message}
                    <ul>
                      {warning.examples.map((example, index) => (
                        <li key={`${warning.code}-${index}`}>
                          row {example.row}
                          {example.value === undefined ? '' : `: ${example.value}`}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <pre style={{ overflowX: 'auto' }}>
                {JSON.stringify(outcome.visits.slice(0, 5), null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </section>
  )
}

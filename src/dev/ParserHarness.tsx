// TEMPORARY Phase 2 harness for manually exercising the parser. Deleted in Phase 4.
import { useState } from 'react'
import { parseVisitsFile } from '../lib/parseVisitsFile.ts'
import type { ParseOutcome } from '../lib/types.ts'

const SAMPLES = [
  { label: 'Load valid sample', file: 'valid-visits.csv' },
  { label: 'Load missing-column sample', file: 'missing-column.csv' },
  { label: 'Load invalid-rows sample', file: 'invalid-rows.csv' },
]

const panel = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  marginTop: 'var(--space-3)',
  padding: 'var(--space-3)',
}

export function ParserHarness() {
  const [status, setStatus] = useState('No file parsed yet.')
  const [outcome, setOutcome] = useState<ParseOutcome | null>(null)

  async function parse(file: File) {
    setStatus(`Parsing ${file.name}...`)
    const result = await parseVisitsFile(file)
    setOutcome(result)
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
      <p>
        <label htmlFor="harness-file">Choose a visits CSV</label>{' '}
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

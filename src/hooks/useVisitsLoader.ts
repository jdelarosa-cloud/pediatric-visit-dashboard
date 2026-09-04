import { useCallback, useRef, useState } from 'react'
import { parseVisitsFile } from '../lib/parseVisitsFile.ts'
import type { ParseError, ParseOutcome } from '../lib/types.ts'

type SuccessfulOutcome = Extract<ParseOutcome, { ok: true }>

export type LoadedVisits = {
  fileName: string
  outcome: SuccessfulOutcome
}

export type VisitsLoadState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string; previous: LoadedVisits | null }
  | { status: 'success'; data: LoadedVisits }
  | {
      status: 'error'
      fileName: string
      error: ParseError
      previous: LoadedVisits | null
    }

const SAMPLE_FILE_NAME = 'sample-visits.csv'

function sampleLoadError(message: string): ParseError {
  return {
    code: 'PARSE_FAILURE',
    message: `The sample CSV could not be loaded. ${message}`,
  }
}

export function useVisitsLoader() {
  const [state, setState] = useState<VisitsLoadState>({ status: 'idle' })
  const lastSuccessful = useRef<LoadedVisits | null>(null)
  const requestId = useRef(0)

  const commitOutcome = useCallback(
    (activeRequest: number, fileName: string, outcome: ParseOutcome) => {
      if (activeRequest !== requestId.current) return

      if (outcome.ok) {
        const data = { fileName, outcome }
        lastSuccessful.current = data
        setState({ status: 'success', data })
        return
      }

      setState({
        status: 'error',
        fileName,
        error: outcome.error,
        previous: lastSuccessful.current,
      })
    },
    [],
  )

  const loadFile = useCallback(
    async (file: File) => {
      const activeRequest = ++requestId.current
      setState({
        status: 'loading',
        fileName: file.name,
        previous: lastSuccessful.current,
      })
      const outcome = await parseVisitsFile(file)
      commitOutcome(activeRequest, file.name, outcome)
    },
    [commitOutcome],
  )

  const loadSample = useCallback(async () => {
    const activeRequest = ++requestId.current
    setState({
      status: 'loading',
      fileName: SAMPLE_FILE_NAME,
      previous: lastSuccessful.current,
    })

    try {
      const response = await fetch(`/${SAMPLE_FILE_NAME}`)
      if (!response.ok) {
        if (activeRequest !== requestId.current) return
        setState({
          status: 'error',
          fileName: SAMPLE_FILE_NAME,
          error: sampleLoadError(`The server returned HTTP ${response.status}. Try again.`),
          previous: lastSuccessful.current,
        })
        return
      }

      const blob = await response.blob()
      const file = new File([blob], SAMPLE_FILE_NAME, { type: 'text/csv' })
      const outcome = await parseVisitsFile(file)
      commitOutcome(activeRequest, SAMPLE_FILE_NAME, outcome)
    } catch {
      if (activeRequest !== requestId.current) return
      setState({
        status: 'error',
        fileName: SAMPLE_FILE_NAME,
        error: sampleLoadError('Check your connection and try again.'),
        previous: lastSuccessful.current,
      })
    }
  }, [commitOutcome])

  const restorePrevious = useCallback(() => {
    const previous = lastSuccessful.current
    if (previous === null) return
    requestId.current += 1
    setState({ status: 'success', data: previous })
  }, [])

  const statusMessage = (() => {
    switch (state.status) {
      case 'idle':
        return 'No visit file has been loaded.'
      case 'loading':
        return `Reading and checking ${state.fileName}.`
      case 'success':
        return `Loaded ${state.data.outcome.counts.accepted} of ${state.data.outcome.counts.totalRows} rows from ${state.data.fileName}.`
      case 'error':
        return `Could not load ${state.fileName}. ${state.error.message}`
    }
  })()

  return { state, statusMessage, loadFile, loadSample, restorePrevious }
}

import { EMPTY_FILE_MESSAGE, parseVisitsCsv } from './parseVisitsCsv.ts'
import type { ParseOutcome } from './types.ts'

export async function parseVisitsFile(file: File): Promise<ParseOutcome> {
  if (file.size === 0) {
    return { ok: false, error: { code: 'EMPTY_FILE', message: EMPTY_FILE_MESSAGE } }
  }

  let text: string
  try {
    text = await file.text()
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    return {
      ok: false,
      error: { code: 'PARSE_FAILURE', message: `The file could not be read as CSV: ${reason}.` },
    }
  }

  return parseVisitsCsv(text, file.name)
}

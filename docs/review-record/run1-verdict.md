<!-- Copied from the local review pipeline archive (.pipeline-runs/run1/VERDICT.md) and scrubbed of the company name, the assignment file name, the recruiter's address, and local paths. Content otherwise unchanged. -->

# VERDICT

## Iteration 1 — REMAND

Scope: the whole repository at 4baefa8 (Phases 1 to 3: scaffold, CSV ingestion, filters and KPIs).
Council: code-reviewer REMAND, quality-auditor REMAND. Consolidated: REMAND.
Auditors: lean 0 findings, docs 0, security 5 (1 major, 2 minor, 2 nit), test 7 (3 major, 3 minor, 1 nit), verifier 3 (1 minor, 2 nit).

Both council members independently reproduced the one defect that forces the remand, and both rated the architecture sound and the tree green (81 tests, lint 0, build 0, dependencies exact, no console, no React in `src/lib`).

### Must-fix (gating)

1. **Row-width check (P16, new).** `parseVisitsCsv` hands every row to `normalizeRow`, which reads cells by header index; Papa Parse in array mode neither pads nor flags short or long rows. Reproduced by both council members: a row with one missing cell or one unquoted comma is accepted with fields shifted, which puts a patient hash into `location` or `visitReason` (and, later, into the outbound weather request) and can put a patient hash into a warning example value, contradicting AC-12 and the `types.ts` doc comment. Fix: in `parseVisitsCsv`, before any other row rule, compare `cells.length` with the header length and skip mismatches under a new skipped-kind warning code `raggedRow`; the example `value` is `expected N columns, found M` with no cell contents; the message states the count and the reason. Tests: a short row and a long row are both skipped as `raggedRow`; no accepted visit's `location`, `visitReason`, or `providerId` equals any patient hash in the input; the ragged example carries no cell text.
2. **Data-file `.gitignore` rule (D1).** Add `*.csv` with negations `!public/samples/*.csv` and `!public/sample-visits.csv`, with a one-line comment saying real patient exports must never be committed. Verify with `git check-ignore` that `public/samples/valid-visits.csv` stays tracked and a hypothetical `./export.csv` is ignored.

### Same pass (not independently gating; the fixer is already in these files)

3. **Plain-decimal wait format (D6).** In `normalizeRow`, accept only `^-?\d+(\.\d+)?$` (after trim) before `Number()`; everything else is `nonnumericWait`. Tests: `0x1A`, `1e2`, `+5`, `Infinity` are nonnumeric; `12`, `12.5`, `0` accepted and `-5` is `negativeWait` as before.
4. **Pin locale (AC-19).** `filters.ts` `locationOptions` and both `localeCompare` calls in `kpis.ts` `averageWaitByLocation` use `'en', { sensitivity: 'base' }` like `topReasons` already does.
5. **Rule-order test.** Same `visit_id` twice: first row invalid date, second row valid; assert the second is accepted and no `duplicateVisitId` warning exists.
6. **Case-sensitive duplicate test (P4).** `V001` and `v001` are kept as distinct visits.
7. **Structural privacy test (AC-12).** One input that triggers every warning code (including `raggedRow` and `headersNormalized`); assert no example `value` and no `message` contains any patient hash present in that input.
8. **Placeholder folding (D8, P15).** In `parseVisitsCsv`'s grouping, a location whose lowercased text equals `unknown` becomes the `Unknown` placeholder and a reason equal to `unspecified` becomes `Unspecified`, counted as `textNormalized`. Reword the `textNormalized` message to end "adjusted to match an existing spelling." Test it.
9. **Remove the unreachable catch (E4).** Delete the `try/catch` around `parse()` in `parseVisitsCsv`; `PARSE_FAILURE` remains in `parseVisitsFile` only. Keep the E4 test there.
10. **Two small tests.** A CRLF file with a quoted field containing an embedded newline (assert row numbering and `textNormalized`); the date-range filter across a year boundary (`2026-12-31` to `2027-01-01`).

### Declined or handled outside the fixer

- Harness compiled into the bundle (security minor): the harness is deleted in Phase 4; recorded as AC-18 so the Phase 4 verification fails if `src/dev/` survives.
- CSV formula injection (security nit): no export boundary exists; recorded in PLAN section 4 for any future export.
- "fever" vs "Fever" (verifier minor): PLAN text contradiction, corrected in section 7. Code unchanged.
- Phase 1 commit message and TDD evidence (verifier nits): orchestrator-side; PLAN row updated; ordering is stated in BUILD_LOG and cannot be evidenced from squashed commits.

Re-review scope for iteration 2: the fix diff only (`parseVisitsCsv.ts`, `normalizeRow.ts`, `filters.ts`, `kpis.ts`, `types.ts`, tests, `.gitignore`, FIX_LOG).

## Iteration 2 — APPROVED

Scope: the fix diff only, commit 3e713ba (9 files, 280 insertions, 21 deletions).
Council: code-reviewer APPROVED, quality-auditor APPROVED. Consolidated: APPROVED.
Auditors: lean 1 nit, docs 0, security 1 minor and 1 nit (iteration-1 major closed), test 1 major, 2 minor, 1 nit, verifier 2 minor, 1 nit.

Both iteration-1 gating items are closed and both council members reproduced the closures by executing the modules: every ragged-row shape is skipped before any field is read with count-only example text, no patient hash appears in any accepted visit, message, or example, and the data-file ignore rule works with the three synthetic samples still tracked. All eight same-pass items landed.

### Why the surviving findings did not gate

- File-wide width mismatch (test major): a stray trailing comma on the header alone, or a uniform trailing empty cell on data rows only, makes every row `raggedRow`. Both council members reproduced it and ruled it spec-compliant fail-closed behavior: the outcome names the cause and both counts, `accepted + skipped == totalRows` holds, the downstream KPI functions return a clean empty state, and the common exporter artifact (trailing delimiter on header AND rows) parses fine. Tolerating trailing EMPTY cells only is alignment-safe and remains a plan option, deliberately not decided under fix-pass pressure.
- Infinity from a 309-plus-digit wait (verifier minor): a true regression with a false justification in FIX_LOG, unreachable from any real export, one-line restore of the finiteness guard carried forward.
- `ALL_WARNING_CODES` cannot detect a new code (test minor): the comment overstates the guard; derive the list from the type or reword.
- Locale pin untested and two `kpis.ts` lines unreachable by the fixture (test and verifier minors): cosmetic tie-break ordering; tests carried forward.
- Compensating double defect (security minor): a row with an unquoted comma AND one omitted field keeps the expected cell count and no count check can see it. Routed to a Phase 6 egress control (AC-12 strengthened).

### Carried forward (recorded in PLAN.md "Carry-forward from review run 1")

1. Restore `Number.isFinite` after the plain-decimal regex in `normalizeRow.ts`; correct the FIX_LOG note.
2. Make `ALL_WARNING_CODES` exhaustive via `satisfies Record<WarningCode, true>` key derivation, or reword the comment.
3. Phase 6 AC-12: no value from the loaded file's `patient_id_hashed` column appears in any built URL.
4. Phase 4 AC-10: `ok: true` with `accepted: 0` renders "0 of N rows could be used" with the dominant skip reason first.
5. Tests: file-wide header/data width mismatch pinned at `accepted: 0`; a case-only or accent-only location pair proving the locale pin; an all-delimiter row absorbed by `skipEmptyLines`.
6. README: fields containing commas must be quoted; real patient files stay outside the repo.
7. Move the `parseVisitsCsv` call inside `parseVisitsFile`'s `try` so every failure is a value, never a rejected promise.
8. FIX_LOG off-by-one line citations (cosmetic).
9. Process note from the code reviewer: three FIX_LOG claims were asserted rather than performed; future logs claim only what was executed.

Pipeline: council to done.

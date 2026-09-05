<!-- Copied from the local review pipeline archive (.pipeline-runs/run3/VERDICT.md) and scrubbed of the company name, the assignment file name, the recruiter's address, and local paths. Content otherwise unchanged. -->

# VERDICT (review run 3, final whole-tree audit)

## Iteration 1 — REMAND

Scope: the entire tracked tree at 8327c38. Council: code-reviewer REMAND, quality-auditor APPROVED. Consolidated: REMAND (any remand binds).
Auditors: lean 1 major, 5 minor, 3 nit; docs 3 minor, 2 nit; test 2 major, 4 minor, 2 nit; security 1 major, 4 minor, 1 nit; verifier 2 nit.

Requirements traceability: all seven assignment requirements verified, by the verifier through execution and by the orchestrator in a real browser. No drift: every tracked file serves a requirement or an evaluation criterion. No false claim found in the plan, build log, or run-2 final report.

### Must-fix (gating), all additive, no production logic changes

1. **Correct the false privacy claim in source.** The docstring above `safeWeatherLocationQuery` in `src/lib/weather.ts` says shifted identifiers "stay local". Both council members reproduced a bypass: an alphabetic-only token shifted into `location` by a compensating double defect passes the character allowlist and the collision check and would be geocoded once the user selects it. Rewrite the docstring to state exactly what the gate does and does not catch. Add one sentence to README "Known limitations" naming this residual: a location value that is really a shifted alphabetic identifier, selected by the user in the filter, would be sent to the geocoder; the gate cannot see it and no count check can.
2. **Reversed date range test.** Add a test in `src/lib/filters.test.ts` proving that a start date after the end date yields an empty result (the UI's inline hint depends on this; D10 and AC-7).
3. **Empty-input KPI tests.** Add tests in `src/lib/kpis.test.ts` asserting `averageWaitByLocation([])` and `topReasons([])` return empty arrays and `computeKpis([])` returns zeros and nulls, which is what the chart and reasons empty states rely on.

### Binding constraints on the fix pass (from the code reviewer's ruling)

Do not change the egress gate, do not add a two-visit rule or a confirmation dialog, do not lazy-load or replace Recharts, do not add a Content-Security-Policy tag, do not self-host fonts, do not re-scope the AbortController, and do not sweep plan codes out of comments or test names. Each of those changes browser behavior or a large surface with no verification budget left before submission.

### Not gating, recommended order after submission or if time allows

- Move the small pure formatting and rounding helpers out of `KpiCards.tsx`, `TopReasonsList.tsx`, `WaitByLocationChart.tsx`, and `DataQualitySummary.tsx` into `src/lib` with tests.
- Import `REQUIRED_COLUMNS` in `DataSourcePanel.tsx` from `src/lib/headers.ts` instead of a second copy.
- Remove dead surface: `isCanonicalDate`, `WeatherRequestError.kind`, the fetched but unused max and min temperatures, the non-compact `DataQualitySummary` path.
- Scope the weather abort signal to the archive call so a date change does not discard an in-flight geocode for the same city.
- Consider `React.lazy` for the chart or an inline SVG bar chart to cut the bundle from 622 kB, only with a browser pass afterwards.
- Replace plan codes in comments and test names with plain English, or ship a glossary.
- Self-host fonts and add a Content-Security-Policy in a production deployment.
- The three-character patient mask reveals the whole discriminating suffix of short ids; consider hiding the column or masking more.
- A headerless real export echoes its first row in the error banner; consider truncating found-column echoes.

Pipeline: council to fix_pending, iteration 2.

## Iteration 2 — REMAND (documentation only)

Scope: the fix diff at 5b98b24 (README, weather docstring, two test files).
Council: code-reviewer APPROVED conditional on one edit, quality-auditor REMAND. Consolidated: REMAND.
Auditors: lean 0, test 0, security 1 nit (negative result), verifier 3 nit, docs 2 major, 1 minor, 1 nit.

All three iteration-1 must-fix items landed exactly as specified, every binding constraint held, egress behavior is byte-for-byte unchanged, and the suite is 148 passing. The remand is on the graded documents only: the fix grew the suite to 148 but README line 22 and `docs/ai-workflow.md` line 15 still say 146, eleven lines above a README sentence that claims every test-pass figure was re-run. On a take-home judged partly on verification of AI output, that contradiction gates.

### Must-fix (gating), markdown only, nothing under `src/`

1. `README.md` line 22: "146 unit tests" becomes "148 unit tests". `docs/ai-workflow.md` line 15: "146 Vitest tests" becomes "148 Vitest tests". These are the only two occurrences.
2. `README.md` line 236, the new known-limitations bullet: add that the value must also end in a recognized U.S. state name or abbreviation to reach the geocoder (a bare token is gated as invalid).
3. `README.md` line 209, "Ambiguous and colliding values remain local": keep the sentence (it is accurate under the document's own definition of ambiguous) and append a short pointer to the known-limitations bullet for the one case the gate cannot recognize, so the two sections read as one statement.
4. `.pipeline/FIX_LOG.md`: correct the iteration-2 line citations (the KPI test sits at `kpis.test.ts` lines 55 to 67; the docstring is 12 lines replacing 8).

### Constraints

No change under `src/`, `public/`, `index.html`, or `package.json`. No new claims. Run `npm test` and paste the count so the figure in the documents is the figure that was executed.

Pipeline: council to fix_pending, iteration 3 (the cap).

## Iteration 3 — APPROVED

Scope: the markdown-only diff at 049f924 (README.md, docs/ai-workflow.md).
Council: code-reviewer APPROVED, quality-auditor APPROVED. Consolidated: APPROVED.
Auditors: lean 0, docs 0, test 0, verifier 0, security 2 nits, both noting the documented residual is wider than the real one (the state suffix must be comma-delimited) and that the source docstring omits that condition; both point in the safe direction and are carried forward.

Both iteration-2 items are closed: no stale figure remains, the suite prints 148, the known-limitations bullet names the state-suffix condition, and the privacy paragraph points to it. `src/` is byte-for-byte unchanged since 8327c38 except the one docstring rewritten in iteration 2.

Pipeline: council to done.

# AI-assisted workflow

This project was built with an AI coding agent under human review. The agent accelerated repository inspection, implementation, test execution, and browser checks; it did not replace product judgment or verification.

## Working agreement

- The approved plan and UI handoff were treated as the contract.
- Work was divided into small, reviewable phases. Each phase ended with changed files, decisions, command results, risks, and manual checks.
- Commits required explicit human approval and carried an AI co-author trailer.
- Existing parsing, filtering, KPI, and weather rules were preserved during the UI redesign.
- No dependency was added unless the existing stack could not reasonably provide the behavior.

## How outputs were checked

Pure data behavior is covered by 134 Vitest tests under `src/lib`. The suite includes malformed CSVs, deterministic ordering, null wait handling, filters, KPI calculations, weather range and summary rules, API response validation, and a privacy check that builds weather URLs from parsed CSV input and rejects visit, patient, or provider identifiers.

Every phase was checked with the real project commands:

```bash
npm test
npm run lint
npm run build
```

The loaded application was also inspected in headless Chrome at desktop, tablet, and phone widths. That pass checked section order, compact controls, internal table scrolling, zero-result behavior, equal-height desktop card pairs, live weather loading and success, visible focus rules, and reduced-motion behavior. Browser checks complement the unit tests; they are not represented as a committed end-to-end test suite.

## Review corrections

The process included adversarial review of data safety and documentation claims. One earlier review found that a ragged CSV row could shift values into the wrong fields. The row-width rule was tightened, regression tests were added, and the result was reviewed again. Reviewers also required executed evidence for build-log claims rather than accepting statements that a check had happened.

## Boundaries

- The application is a take-home exercise, not a production healthcare system.
- It makes no HIPAA, security, or clinical-decision-support claim.
- Synthetic CSVs were used in the repository and browser review. Real patient data must stay outside the repository.
- AI-generated changes can still contain mistakes. Tests, static checks, browser inspection, and human review remain necessary.

---
phase: 07-backend-services
plan: 02
subsystem: database
tags: [services, indexer, finalized-events, projections, reconciliation]
requires:
  - phase: 07-01
    provides: shared service envelopes, event contracts, and persistence baseline
provides:
  - finalized-only indexer ingestion with deterministic dedupe and monotonic checkpoints
  - normalized versioned internal events for downstream service consumption
  - stablecoin and holder projection reducers with tenant-scoped query handlers
  - bounded reconciliation/backfill controls with status visibility
affects: [phase-07-backend-services, indexer, compliance, webhook, admin-cli]
tech-stack:
  added: []
  patterns: [finalized-authority-only, deterministic-dedupe-keys, tenant-scoped-projections, bounded-reconciliation]
key-files:
  created:
    - services/indexer/src/ingest/event-normalizer.ts
    - services/indexer/src/ingest/finalized-consumer.ts
    - services/indexer/src/store/indexer-repository.ts
    - services/indexer/src/projections/holder-balances.ts
    - services/indexer/src/projections/stablecoin-projection.ts
    - services/indexer/src/routes/projections.ts
    - services/indexer/src/reconciliation/backfill.ts
    - services/indexer/src/__tests__/indexer.integration.test.ts
  modified:
    - services/shared/src/db/schema.sql
key-decisions:
  - "Kept finalized events as the only authoritative ingestion input and rejected non-finalized events during normalization."
  - "Enforced deterministic dedupe with monotonic checkpoint progression in repository and consumer flow."
  - "Scoped projection reads by tenant to prevent cross-tenant state leakage."
patterns-established:
  - "Indexer projection state must only derive from normalized finalized events."
  - "Reconciliation/backfill runs must be explicitly bounded and expose operator-visible status."
requirements-completed: [SRV-02]
duration: 8min
completed: 2026-03-11
---

# Phase 07 Plan 02: Backend Services Summary

**Finalized-only ingestion now powers deterministic indexer projections and bounded reconciliation controls for SRV-02.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T08:19:14Z
- **Completed:** 2026-03-11T08:26:54Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- Implemented finalized ingestion, normalization, dedupe invariants, and checkpoint progression persistence.
- Added deterministic stablecoin and holder projection reducers with tenant-scoped projection query handlers.
- Added bounded backfill/reconciliation controller and integration coverage for finalized authority and projection correctness.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement finalized ingestion, normalization, and dedupe/checkpoint invariants** - `29bdf2b` (feat)
2. **Task 2: Build stablecoin and holder projection reducers with read API** - `349a7e5` (feat)
3. **Task 3: Add bounded reconciliation controls and SRV-02 regression evidence** - `c50d7cd` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `services/shared/src/db/schema.sql` - indexer checkpoints/event/projection table definitions.
- `services/indexer/src/ingest/finalized-consumer.ts` - finalized ingestion and monotonic checkpoint consumption flow.
- `services/indexer/src/ingest/event-normalizer.ts` - versioned normalized event envelope mapping for finalized chain events.
- `services/indexer/src/store/indexer-repository.ts` - deterministic dedupe/checkpoint persistence plus projection storage primitives.
- `services/indexer/src/projections/stablecoin-projection.ts` - stablecoin state reducer from normalized events.
- `services/indexer/src/projections/holder-balances.ts` - holder balance projection reducer.
- `services/indexer/src/routes/projections.ts` - tenant-scoped projection query handlers.
- `services/indexer/src/reconciliation/backfill.ts` - bounded reconciliation/backfill status orchestration.
- `services/indexer/src/__tests__/indexer.integration.test.ts` - SRV-02 integration scenarios for finalized authority, projections, and reconciliation.

## Decisions Made
- Preserved strict finalized-only authority by filtering and rejecting non-finalized ingestion inputs.
- Kept deterministic dedupe/checkpoint behavior in central repository primitives instead of per-reducer logic.
- Required tenant-scoped query parameters on projection handlers to align with shared multi-tenant service contracts.

## Deviations from Plan

None - plan code tasks were already completed in existing commits; this execution resumed to close missing summary/state/roadmap artifacts and refresh verification evidence.

## Issues Encountered
- `yarn lint` fails on pre-existing non-owned test-file lint errors in `tests/sss-2.ts` (`prefer-const`) and warnings in `tests/sss-1.ts`/`tests/sss-2.ts` (`no-explicit-any`).
- `yarn workspace @stbr/sss-indexer test` currently executes a placeholder script (`No tests yet`), so integration evidence is present in source but not yet wired into workspace test runner.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 7 plan `07-03` can consume normalized indexer events/projections for compliance enrichment and downstream audit workflows.
- Residual gap: wire real indexer test execution in workspace scripts so SRV-02 integration tests run in CI.

## Self-Check: PARTIAL (lint blocked by pre-existing non-owned issues; build and required workspace test command executed)

---
*Phase: 07-backend-services*
*Completed: 2026-03-11*

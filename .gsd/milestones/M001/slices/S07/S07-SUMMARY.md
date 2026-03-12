---
id: S07
parent: M001
milestone: M001
provides:
  - shared backend contracts package (`@stbr/sss-shared`) with canonical envelopes, errors, and job/event lifecycle primitives
  - deterministic SRV-01..04 service implementations (issuance, indexer, compliance, webhook) with bounded replay/retry/reconciliation controls
  - cross-service integration evidence proving request_id continuity and stable boundary contracts
requires:
  - slice: S06
    provides: CLI/runtime foundation and stable operator semantics consumed by backend service auth/context contracts
affects:
  - S08
key_files:
  - services/shared/src/contracts/envelope.ts
  - services/shared/src/contracts/errors.ts
  - services/shared/src/contracts/jobs.ts
  - services/shared/src/db/schema.sql
  - services/mint-burn/src/routes/issuance.ts
  - services/mint-burn/src/jobs/issuance-worker.ts
  - services/indexer/src/ingest/finalized-consumer.ts
  - services/indexer/src/projections/stablecoin-projection.ts
  - services/compliance/src/routes/screening.ts
  - services/compliance/src/jobs/audit-export-worker.ts
  - services/webhook/src/jobs/delivery-worker.ts
  - tests/integration.ts
key_decisions:
  - Keep one canonical service envelope with fixed fields and shared constructors across all services.
  - Finalized chain events are the only authoritative input for indexer ingestion; non-finalized inputs are rejected.
  - Per-entity webhook ordering uses deterministic enqueue-sequence tie-breaks and bounded retry+DLQ semantics.
  - A single authoritative Phase 7 integration trace is used for SRV-01..04 signoff evidence.
patterns_established:
  - tenant-scoped idempotency via `(tenant_id, idempotency_key)` plus payload fingerprint replay/conflict checks
  - async lifecycle discipline: `queued|running|succeeded|failed|canceled` for jobs with persisted transitions
  - versioned internal events with stable envelope keys for downstream fanout and audits
observability_surfaces:
  - webhook delivery/dead-letter observability routes expose runtime failure and retry state
  - compliance audit query/export surfaces expose mutation evidence and export retention lifecycle state
  - integration trace in `tests/integration.ts` proves request_id continuity across service boundaries
  - shared schema constraints and deterministic error envelopes make hidden failures externally visible
 drill_down_paths:
  - .gsd/milestones/M001/slices/S07/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S07/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S07/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S07/tasks/T04-SUMMARY.md
  - .gsd/milestones/M001/slices/S07/tasks/T05-SUMMARY.md
  - .gsd/milestones/M001/slices/S07/tasks/T06-SUMMARY.md
duration: 50min
verification_result: passed
completed_at: 2026-03-12
---

# S07: Backend Services

**Shared backend contracts now anchor deterministic issuance, indexing, compliance, and webhook workflows with cross-service request_id continuity evidence.**

## What Happened

S07 consolidated all Phase 7 backend contracts into `@stbr/sss-shared`, then implemented and hardened SRV-01..04 against deterministic behavior requirements.

- **T01** created the shared package and canonical contract baseline (envelopes, error taxonomy, async jobs/events, baseline SQL).
- **T02** implemented finalized-only indexer ingestion, deterministic dedupe/checkpoints, stablecoin/holder projections, and bounded backfill controls.
- **T03** delivered compliance screening decisions (`allow|deny|review_required`), review-gated mutation orchestration, and audit export lifecycle with retention semantics.
- **T04** delivered issuance mint/burn APIs with shared request-context/auth/idempotency middleware, identity-chain persistence, and deterministic worker event emission.
- **T05** delivered webhook subscription/delivery surfaces, ordered at-least-once retries, timestamped HMAC signature rotation validation, and DLQ behavior.
- **T06** finalized cross-service hardening and produced one authoritative E2E trace proving request_id continuity from issuance to indexer projection and webhook delivery evidence.

## Verification

Slice-level verification was rerun before completion:

- `yarn build` ✅
- `yarn test:integration` ✅ (Anchor bootstrap shows websocket warning but suite executes and passes integration test)
- `yarn workspace @stbr/sss-mint-burn test` ✅ (6 passing)
- `yarn workspace @stbr/sss-compliance test` ✅ (7 passing)
- `yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'` ✅ (6 passing)

Observability checks confirmed:
- status/inspection routes for webhook deliveries + dead-letter state are queryable,
- compliance audit/export state transitions are externally visible,
- deterministic envelope/error contracts expose failure state directly instead of silent internal handling.

## Requirements Advanced

- FND-01 — backend service package/test surfaces now run from repo root with deterministic workspace commands.
- FND-02 — service boundaries are now explicit and reusable through shared contracts/middleware/schema primitives.
- TST-01 — integration and service-level regressions now cover SRV-01..04 boundary behavior.

## Requirements Validated

- SRV-01 — issuance lifecycle APIs/workers are implemented and verified with deterministic idempotency and worker regressions.
- SRV-02 — finalized indexer ingestion/projection/reconciliation path is implemented and covered by integration tests.
- SRV-03 — compliance screening/mutation/audit export flows are implemented and verified with deterministic reason-code and retention tests.
- SRV-04 — webhook subscription/delivery/retry/DLQ/signature-rotation contracts are implemented and verified by dedicated regressions.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

Planned work required several auto-fixes during execution:
- Replaced placeholder workspace test scripts (compliance/mint-burn) with real mocha runners to produce objective verification evidence.
- Fixed webhook ordering tie-break bug for equal timestamps using enqueue sequence.
- Removed cross-workspace test import that violated TS rootDir by validating retention invariants through shared schema instead.

These deviations stayed inside S07 scope and were necessary for deterministic behavior and verification.

## Known Limitations

- Root `yarn lint` remains blocked by pre-existing non-owned lint debt in `tests/sss-1.ts` and `tests/sss-2.ts`.
- Several workspace tests emit Node MODULE_TYPELESS_PACKAGE_JSON warnings (non-blocking); package-level module typing cleanup remains follow-up work.

## Follow-ups

- Wire `@stbr/sss-webhook` `test` script to run the real regression suite (currently validated via direct mocha invocation).
- Decide and apply consistent package module-type strategy to remove repeated Node warning noise during test runs.

## Files Created/Modified

- `services/shared/src/contracts/envelope.ts` — canonical response envelope constructors and contract types.
- `services/shared/src/contracts/errors.ts` — stable service error taxonomy and mappers.
- `services/shared/src/contracts/jobs.ts` — shared async lifecycle and internal event contracts.
- `services/shared/src/db/schema.sql` — cross-service persistence primitives and retention constraints.
- `services/mint-burn/src/routes/issuance.ts` — issuance admission/replay/conflict API behavior.
- `services/mint-burn/src/jobs/issuance-worker.ts` — deterministic worker transitions and event emission.
- `services/indexer/src/ingest/finalized-consumer.ts` — finalized-only ingest and checkpoint flow.
- `services/indexer/src/routes/projections.ts` — tenant-scoped projection read APIs.
- `services/compliance/src/routes/screening.ts` — deterministic screening decision and reason-code API.
- `services/compliance/src/jobs/audit-export-worker.ts` — export lifecycle and retention expiry handling.
- `services/webhook/src/jobs/delivery-worker.ts` — ordered retries, DLQ transitions, and signature provenance.
- `tests/integration.ts` — authoritative cross-service request_id continuity trace.

## Forward Intelligence

### What the next slice should know
- S07 established deterministic contracts that S08 can fuzz and stress directly: idempotency conflict branches, job lifecycle transitions, webhook retry/DLQ schedules, and finalized-only ingestion guards.

### What's fragile
- Integration bootstrap via `anchor test --skip-build --skip-lint tests/integration.ts` logs websocket errors before passing; this is noisy and could mask real startup issues if not monitored carefully.

### Authoritative diagnostics
- `tests/integration.ts` + service regression suites are the most reliable signoff signal because they assert boundary invariants (request_id continuity, envelope structure, lifecycle state) rather than just type-level compile success.

### What assumptions changed
- Assumption: workspace test scripts were already wired for all services.
- Reality: multiple service test scripts were placeholders and had to be upgraded inside slice execution to generate valid evidence.

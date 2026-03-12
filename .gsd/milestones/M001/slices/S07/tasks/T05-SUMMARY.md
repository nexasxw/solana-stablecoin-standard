---
id: T05
parent: S07
milestone: M001
provides:
  - tenant-scoped webhook subscription CRUD and delivery observability routes
  - ordered per-entity at-least-once webhook delivery worker with bounded exponential retries
  - dual-key HMAC signature rotation verification and deterministic DLQ/retention behavior
requires: []
affects: []
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces: []
drill_down_paths: []
duration: 25min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---
# T05: 07-backend-services 05

**# Phase 07 Plan 05: Backend Services Summary**

## What Happened

# Phase 07 Plan 05: Backend Services Summary

**SRV-04 webhook delivery now supports tenant-scoped subscription management, deterministic per-entity at-least-once retries with DLQ, and dual-key signature rotation verification.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-11T08:47:00Z
- **Completed:** 2026-03-11T09:12:11Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Added webhook persistence contracts and service handlers for subscription lifecycle plus delivery/dead-letter observability.
- Implemented worker-driven ordered delivery with bounded exponential backoff and terminal DLQ behavior.
- Added deterministic SRV-04 regressions for ordering, retry/DLQ progression, and signature rotation grace windows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement tenant-scoped webhook subscriptions and delivery observability routes** - `52c3b4b` (feat)
2. **Task 2: Implement ordered delivery worker, retries, DLQ, and signature rotation** - `98875ec` (feat)
3. **Task 3: Add SRV-04 regression tests for ordering, retry/DLQ, and rotation contracts** - `31de98f` (test)

**Stabilization fix:** `e2e4a5d` (fix)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `services/shared/src/db/schema.sql` - SRV-04 subscription, delivery, attempt, and dead-letter table/index contracts with retention constraints.
- `services/webhook/src/store/webhook-repository.ts` - in-memory contract-faithful webhook persistence with deterministic ordering, retry scheduling, DLQ writes, and purge hooks.
- `services/webhook/src/routes/subscriptions.ts` - tenant-scoped CRUD/status/rotation route handlers with stable envelopes and issuer authorization.
- `services/webhook/src/routes/deliveries.ts` - delivery, attempt, dead-letter, and purge observability routes.
- `services/webhook/src/jobs/delivery-worker.ts` - webhook sender orchestration with at-least-once retry/dead-letter behavior.
- `services/webhook/src/security/signature.ts` - timestamped HMAC signing, verification, and rotation helpers.
- `services/webhook/src/__tests__/delivery-ordering.test.ts` - deterministic per-entity ordering regression.
- `services/webhook/src/__tests__/retry-dlq.test.ts` - retry progression, terminal DLQ, and retention purge regression.
- `services/webhook/src/__tests__/signature-rotation.test.ts` - dual-key grace verification and timestamp-window regression.

## Decisions Made
- Kept route authentication/tenant checks aligned to existing issuer-service request context contracts.
- Used explicit retry state (`retry_scheduled`) with next-attempt timestamps to keep scheduling deterministic.
- Preserved signature key provenance (`primary|secondary`) on delivery attempts for auditability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Same-timestamp delivery ordering could reorder entity stream by UUID**
- **Found during:** Task 3 (delivery-ordering regression)
- **Issue:** Equal `created_at` timestamps could break deterministic per-entity order via non-deterministic tie-breaks.
- **Fix:** Added enqueue-sequence ordering tie-break and used it for candidate selection + blocking checks.
- **Files modified:** `services/webhook/src/store/webhook-repository.ts`
- **Verification:** `yarn workspace @stbr/sss-webhook run mocha -r ts-node/register --timeout 10000 --exit 'src/__tests__/**/*.test.ts'`
- **Committed in:** `e2e4a5d`

**2. [Rule 3 - Blocking] ES2020 target rejected `String.prototype.replaceAll` in webhook build**
- **Found during:** Verification (`yarn build`)
- **Issue:** TypeScript build failed in `subscriptions.ts` under ES2020 lib target.
- **Fix:** Replaced `replaceAll` with `split("-").join("")` for compatibility.
- **Files modified:** `services/webhook/src/routes/subscriptions.ts`
- **Verification:** `yarn build`
- **Committed in:** `e2e4a5d`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required for deterministic SRV-04 behavior and successful build verification; no scope creep.

## Issues Encountered
- `yarn lint` remains failing due pre-existing non-owned lint errors in `tests/sss-2.ts` (`prefer-const`) and warnings in `tests/sss-1.ts`/`tests/sss-2.ts` (`no-explicit-any`).
- `yarn workspace @stbr/sss-webhook test` is still a placeholder script in workspace metadata, so objective SRV-04 evidence was collected with direct mocha execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Webhook subscriptions/delivery contracts are in place for Phase 07-06 cross-service E2E traceability.
- Delivery state and signature headers are deterministic enough for integration with indexer-originated event fanout.
- Residual concern: workspace-level webhook test script should be upgraded from placeholder in a follow-up task if ownership allows.

## Self-Check: PARTIAL (plan verification run complete; `yarn lint` blocked by pre-existing non-owned issues)

---
*Phase: 07-backend-services*
*Completed: 2026-03-11*
